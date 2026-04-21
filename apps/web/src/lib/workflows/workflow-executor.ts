import type { BookOutline, Project } from '@packages/shared-types';

import { bootstrapAgent } from '@/lib/agents/bootstrap-agent';
import { outlineAgent } from '@/lib/agents/outline-agent';
import {
  chapterStore,
  draftSegmentStore,
  memoryStore,
  projectStore,
  sceneStore,
  versionStore,
} from '@/lib/db/projects-store';
import { loadCollection, saveCollection } from '@/lib/db/file-storage';
import { handleScenePlanSkill } from '@/lib/skills/skills/scene-plan-skill';
import { generateBootstrapSkillDeliverable } from '@/lib/skills/skills/bootstrap-skill';
import { generateOutlineSkillOutline } from '@/lib/skills/skills/outline-skill';
import { handleWriteSkill } from '@/lib/skills/skills/write-skill';

export type WorkflowExecutorMode = 'prompt' | 'skill';

export interface WorkflowSceneLike {
  id: string;
  title?: string;
  summary?: string;
}

export interface WorkflowDraftResult {
  segment: {
    content: string;
  };
}

export interface WorkflowEvaluationResult {
  evaluationResult?: { scores?: { total?: number } };
}

export interface WorkflowChapterLike {
  id: string;
  title: string;
  sortOrder: number;
}

export interface WorkflowIssueResult {
  issueCount: number;
  revisedIssues: string[];
  failedIssues: Array<{ issueId: string; reason: string }>;
}

export interface WorkflowExecutor {
  mode: WorkflowExecutorMode;
  label: string;
  bootstrap: (project: Project) => Promise<void>;
  outline: (project: Project) => Promise<BookOutline>;
  generateScenes: (
    apiBase: string,
    project: Project,
    chapter: WorkflowChapterLike
  ) => Promise<{ scenes: WorkflowSceneLike[] }>;
  generateDraft: (
    apiBase: string,
    project: Project,
    chapter: WorkflowChapterLike,
    scene: WorkflowSceneLike
  ) => Promise<WorkflowDraftResult>;
  evaluateChapter: (
    apiBase: string,
    chapter: WorkflowChapterLike
  ) => Promise<WorkflowEvaluationResult>;
  reviseChapter: (
    apiBase: string,
    chapter: WorkflowChapterLike
  ) => Promise<WorkflowIssueResult>;
}

export function createWorkflowExecutor(mode: WorkflowExecutorMode): WorkflowExecutor {
  if (mode === 'skill') {
    return {
      mode,
      label: 'Skill 智能创作',
      bootstrap: async (project) => {
        const deliverable = await generateBootstrapSkillDeliverable({
          projectId: project.id,
          title: project.title,
          bookType: project.bookType,
          targetLength: project.targetLength,
          language: project.language,
          tags: project.tags,
          description: project.description,
        });

        await persistBootstrapArtifacts(project.id, deliverable);
      },
      outline: async (project) => {
        const outline = await generateOutlineSkillOutline({
          projectId: project.id,
          targetLength: project.targetLength,
        });

        return persistOutline(project.id, outline);
      },
      generateScenes: async (_apiBase, project, chapter) => {
        const skillResult = await handleScenePlanSkill({
          projectId: project.id,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          chapterGoal: (await chapterStore.getById(chapter.id))?.summary ?? '',
        });

        if (skillResult.status === 'failed' || !skillResult.deliverable) {
          throw new Error(skillResult.error ?? `Failed to generate scenes for chapter ${chapter.title}`);
        }

        const deliverable = skillResult.deliverable as {
          scenes: Array<{
            title: string;
            summary: string;
            goal?: string;
            conflict?: string;
            expectedOutcome?: string;
          }>;
        };

        const createdScenes = await Promise.all(
          deliverable.scenes.slice(0, 3).map((scene, index) =>
            sceneStore.create({
              projectId: project.id,
              chapterId: chapter.id,
              title: scene.title || `场景 ${index + 1}`,
              summary: scene.summary || '',
              goal: scene.goal,
              conflict: scene.conflict,
              expectedOutcome: scene.expectedOutcome,
              status: 'confirmed',
              sortOrder: index,
              source: 'skill-generated',
            })
          )
        );

        return { scenes: createdScenes };
      },
      generateDraft: async (_apiBase, project, chapter, scene) => {
        const chapterRecord = await chapterStore.getById(chapter.id);
        const skillResult = await handleWriteSkill({
          projectId: project.id,
          chapterId: chapter.id,
          sceneId: scene.id,
          scene: {
            id: scene.id,
            title: scene.title ?? chapter.title,
            summary: scene.summary ?? '',
          },
          chapterTitle: chapter.title,
          chapterGoal: chapterRecord?.summary,
        });

        if (skillResult.status === 'failed' || !skillResult.deliverable) {
          throw new Error(skillResult.error ?? `Failed to write draft for scene ${scene.id}`);
        }

        const deliverable = skillResult.deliverable as { content: string };
        const existingSegments = await draftSegmentStore.getByChapter(chapter.id);
        const segmentIndex = existingSegments.length;
        const processedContent = ensureParagraphBoundary(deliverable.content ?? '');

        await draftSegmentStore.upsert({
          projectId: project.id,
          chapterId: chapter.id,
          sceneId: scene.id,
          segmentIndex,
          content: processedContent,
          source: 'ai',
          isLocked: false,
        });

        await sceneStore.update(scene.id, { status: 'generated' });

        return {
          segment: {
            content: processedContent,
          },
        };
      },
      evaluateChapter: async (apiBase, chapter) =>
        requestJson<WorkflowEvaluationResult>(apiBase, `/agents/evaluate/${chapter.id}`, {
          method: 'POST',
        }),
      reviseChapter: async (apiBase, chapter) => processIssuesForChapter(apiBase, chapter),
    };
  }

  return {
    mode,
    label: '基准测试 (HTTP API)',
    bootstrap: async (project) => {
      const result = await bootstrapAgent({
        projectId: project.id,
        title: project.title,
        bookType: project.bookType as 'novel' | 'short' | 'series' | 'nonfiction' | 'poetry',
        targetLength: project.targetLength as 'short' | 'mid' | 'long',
        language: project.language as 'zh' | 'zh-tw' | 'en' | 'ja',
        mode: project.mode as 'auto' | 'co_create' | 'author_driven',
        description: project.description,
        styleKeywords: project.styleKeywords,
      });

      await persistBootstrapArtifacts(project.id, result);
    },
    outline: async (project) => {
      const charter = await projectStore.getCharter(project.id);
      const outline = await outlineAgent(project, charter);
      return persistOutline(project.id, {
        projectId: project.id,
        volumes: outline.volumes,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    },
    generateScenes: async (apiBase, project, chapter) =>
      requestJson<{ scenes: WorkflowSceneLike[] }>(
        apiBase,
        `/projects/${project.id}/scenes/from-outline`,
        {
          method: 'POST',
          body: JSON.stringify({ chapterId: chapter.id }),
        }
      ),
    generateDraft: async (apiBase, _project, _chapter, scene) =>
      requestJson<WorkflowDraftResult>(apiBase, `/scenes/${scene.id}/generate-draft`, {
        method: 'POST',
      }),
    evaluateChapter: async (apiBase, chapter) =>
      requestJson<WorkflowEvaluationResult>(apiBase, `/agents/evaluate/${chapter.id}`, {
        method: 'POST',
      }),
    reviseChapter: async (apiBase, chapter) => processIssuesForChapter(apiBase, chapter),
  };
}

async function persistBootstrapArtifacts(
  projectId: string,
  deliverable: {
    charter: {
      theme?: string;
      coreConflict?: string;
      targetAudience?: string;
      viewpoint?: string;
      styleKeywords: string[];
      forbiddenRules: string[];
      writingGoals: string[];
    };
    memories: Array<{
      memoryType: 'world' | 'narrative' | 'style' | 'canon';
      key: string;
      content: Record<string, unknown>;
    }>;
  }
): Promise<void> {
  await projectStore.updateCharter(projectId, deliverable.charter);

  const existingMemories = await memoryStore.getByProject(projectId);
  await Promise.all(
    deliverable.memories.map((memory) => {
      const matched = existingMemories.find(
        (item) => item.memoryType === memory.memoryType && item.key === memory.key
      );

      if (matched) {
        return memoryStore.update(matched.id, {
          content: memory.content,
          source: 'agent',
        });
      }

      return memoryStore.create({
        projectId,
        memoryType: memory.memoryType,
        key: memory.key,
        content: memory.content,
        priority: memory.memoryType === 'canon' ? 90 : 70,
        source: 'agent',
      });
    })
  );
}

async function persistOutline(projectId: string, outline: BookOutline): Promise<BookOutline> {
  const outlines = loadCollection<BookOutline>('outlines');
  const existingIndex = outlines.findIndex((item) => item.projectId === projectId);
  const existing = existingIndex >= 0 ? outlines[existingIndex] : null;

  const persisted: BookOutline = {
    ...outline,
    projectId,
    createdAt: existing?.createdAt ?? outline.createdAt ?? new Date(),
    updatedAt: new Date(),
  };

  if (existingIndex >= 0) {
    outlines[existingIndex] = persisted;
  } else {
    outlines.push(persisted);
  }

  saveCollection('outlines', outlines);
  return persisted;
}

async function processIssuesForChapter(
  apiBase: string,
  chapter: WorkflowChapterLike
): Promise<WorkflowIssueResult> {
  const issuesPayload = await requestJson<{ issues: Array<{ id: string; status: string }> }>(
    apiBase,
    `/issues?chapterId=${chapter.id}`
  );
  const revisionsPayload = await requestJson<{
    revisions: Array<{ id: string; applyMode?: 'replace' | 'append'; linkedIssueId?: string }>;
  }>(apiBase, `/revisions?chapterId=${chapter.id}`);

  const revisedIssues: string[] = [];
  const failedIssues: Array<{ issueId: string; reason: string }> = [];
  const actionableIssues = issuesPayload.issues.filter((issue) => issue.status !== 'wont_fix');

  for (const issue of actionableIssues) {
    try {
      let revision = revisionsPayload.revisions.find((item) => item.linkedIssueId === issue.id);

      if (!revision) {
        const created = await requestJson<{
          revision: { id: string; applyMode?: 'replace' | 'append'; linkedIssueId?: string };
        }>(apiBase, `/issues/${issue.id}/create-revision`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
        revision = created.revision;
      }

      const runPayload = await requestJson<{ candidate: { id: string } }>(
        apiBase,
        `/revisions/${revision.id}/run`,
        { method: 'POST' }
      );

      await requestJson(apiBase, `/revision-candidates/${runPayload.candidate.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ mode: revision.applyMode ?? 'replace' }),
      });

      revisedIssues.push(issue.id);
    } catch (error) {
      failedIssues.push({
        issueId: issue.id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    issueCount: issuesPayload.issues.length,
    revisedIssues,
    failedIssues,
  };
}

async function requestJson<T = Record<string, unknown>>(
  apiBase: string,
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  const text = await response.text();
  let payload: { data?: T; error?: string } | null = null;

  if (text) {
    try {
      payload = JSON.parse(text) as { data?: T; error?: string };
    } catch {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      throw new Error(`Invalid JSON response from ${endpoint}`);
    }
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${payload?.error ?? text}`);
  }

  if (!payload || payload.data === undefined) {
    throw new Error(`Missing data payload from ${endpoint}`);
  }

  return payload.data;
}

function ensureParagraphBoundary(content: string): string {
  const paragraphs = content.split(/\n\n+/);
  if (paragraphs.length <= 1) {
    return trimToCompleteSentence(content);
  }

  const allButLast = paragraphs.slice(0, -1);
  const lastParagraph = paragraphs[paragraphs.length - 1];
  const trimmedLast = trimToCompleteSentence(lastParagraph);

  if (trimmedLast.length < lastParagraph.length * 0.5 && trimmedLast.length < 20) {
    return content;
  }

  return [...allButLast, trimmedLast].join('\n\n');
}

function trimToCompleteSentence(content: string): string {
  const sentenceEndings = /[。！？；]/g;
  let lastEndIndex = -1;
  let match: RegExpExecArray | null;

  while ((match = sentenceEndings.exec(content)) !== null) {
    lastEndIndex = match.index;
  }

  if (lastEndIndex === -1) {
    return content;
  }

  const trimmed = content.slice(0, lastEndIndex + 1).trim();
  if (trimmed.length < content.length * 0.5 && trimmed.length < 50) {
    return content;
  }

  return trimmed;
}

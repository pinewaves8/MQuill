/**
 * Write Skill - Chapter content generation with technique directives.
 *
 * Skill files should only generate artifacts. Persistence is handled by the
 * unified workflow layer.
 */

import type {
  WriteSkillInput,
  WriteSkillOutput,
  SkillOutputSchema,
  ReferenceExample,
  TechniqueDirective,
} from '../skill-interface';
import type { SceneCard } from '@packages/shared-types';
import { writerAgent } from '@/lib/agents/writer-agent';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';
import { projectStore, chapterStore, sceneStore } from '@/lib/db/projects-store';
import { loadCollection } from '@/lib/db/file-storage';
import { retrieveReferenceExamples } from '../reference-library-store';
import type { BookOutline } from '@packages/shared-types';

export async function executeWriteSkill(
  input: WriteSkillInput,
  referenceExamples?: ReferenceExample[],
  techniqueDirectives?: TechniqueDirective[]
): Promise<SkillOutputSchema> {
  const {
    projectId,
    chapterId,
    sceneId,
    scene,
    chapterTitle,
    chapterGoal,
    previousContext,
    recentEvents,
    reference_examples: inputExamples,
    technique_directives: inputDirectives,
  } = input;

  try {
    const groundingPack = await buildGroundingPack(projectId);

    await chapterStore.getById(chapterId);
    await projectStore.getById(projectId);
    const storedScene = await sceneStore.getById(sceneId);
    const outline = loadCollection<BookOutline>('outlines').find((item) => item.projectId === projectId);

    const allChapters = outline?.volumes.flatMap((volume) => volume.chapters) ?? [];
    const sceneIndex = allChapters.findIndex((chapter) => chapter.id === chapterId) + 1;
    const sceneCount = allChapters.length;

    const resolvedExamples =
      referenceExamples ??
      inputExamples ??
      retrieveReferenceExamples({
        libraryId: 'writing-technique',
        mode: 'hybrid',
        maxExamples: 5,
      });

    const resolvedDirectives = techniqueDirectives ?? inputDirectives;
    const techniqueDirectivesStr =
      resolvedDirectives && resolvedDirectives.length > 0
        ? resolvedDirectives.map((item) => `- ${item.technique_name}: ${item.application_hint}`).join('\n')
        : '';

    const resolvedScene: SceneCard =
      storedScene ??
      ({
        id: scene.id,
        projectId,
        chapterId,
        sortOrder: 0,
        title: scene.title,
        summary: scene.summary,
        goal: scene.goal,
        conflict: scene.conflict,
        expectedOutcome: scene.expectedOutcome,
        source: 'skill-generated',
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SceneCard);

    const writerOutput = await writerAgent({
      projectId,
      chapterId,
      scene: resolvedScene,
      context: {
        chapterTitle,
        chapterGoal,
        previousContext,
        recentEvents,
        groundingPack,
        sceneIndex,
        sceneCount,
        referenceExamples: resolvedExamples,
        techniqueDirectives: techniqueDirectivesStr,
        writingGuidelines: buildWritingGuidelines(resolvedExamples, resolvedDirectives),
      },
    });

    const output: WriteSkillOutput = {
      status:
        writerOutput.status === 'completed'
          ? 'completed'
          : writerOutput.status === 'failed'
            ? 'failed'
            : 'needs_revision',
      deliverable: {
        content: writerOutput.segment?.content ?? '',
        summary: writerOutput.summary ?? '',
        used_beats: writerOutput.usedBeats,
        continuity_notes: writerOutput.continuityNotes,
        risk_flags: writerOutput.riskFlags,
      },
    };

    return output;
  } catch (error) {
    console.error('[WriteSkill] Execution error:', error);
    return {
      status: 'failed',
      deliverable: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildWritingGuidelines(
  examples: ReferenceExample[],
  directives?: TechniqueDirective[]
): string {
  const guidelines: string[] = [];

  if (directives && directives.length > 0) {
    guidelines.push('## 技法要求');
    for (const directive of directives) {
      guidelines.push(`**${directive.technique_name}**: ${directive.application_hint}`);
    }
    guidelines.push('');
  }

  if (examples.length > 0) {
    guidelines.push('## 参考样本');
    for (const example of examples.slice(0, 3)) {
      guidelines.push(`### ${example.title}`);
      if (example.source_work) {
        guidelines.push(`来源: ${example.source_work} by ${example.source_author ?? '未知'}`);
      }
      if (example.technique_tags) {
        guidelines.push(`技法: ${example.technique_tags.join(', ')}`);
      }
      guidelines.push('---');
      guidelines.push(example.content);
      guidelines.push('');
    }
  }

  return guidelines.join('\n');
}

export const writeSkillId = 'write-skill';

export async function handleWriteSkill(
  input: WriteSkillInput,
  referenceExamples?: ReferenceExample[],
  techniqueDirectives?: TechniqueDirective[]
): Promise<SkillOutputSchema> {
  return executeWriteSkill(input, referenceExamples, techniqueDirectives);
}

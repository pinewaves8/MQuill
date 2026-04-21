import { Project, TargetLength } from '@packages/shared-types';

import type { WorkflowExecutor } from '@/lib/workflows/workflow-executor';

export type AutoCreateStepName =
  | 'charter'
  | 'outline'
  | 'import_chapters'
  | 'chapters'
  | 'evaluation'
  | 'revision';

interface WorkflowRequestOptions {
  apiBase: string;
  project: Project;
  targetChapters: number;
  runEvaluation: boolean;
  runRevisions: boolean;
  executor?: WorkflowExecutor;
  onStepStart?: (step: AutoCreateStepName, message?: string) => void;
  onStepProgress?: (step: AutoCreateStepName, progress: number, message?: string) => void;
  onStepComplete?: (step: AutoCreateStepName, message?: string) => void;
  onChapterProgress?: (message: string | null) => void;
}

interface WorkflowChapterReport {
  chapterId: string;
  chapterTitle: string;
  sceneCount: number;
  draftSegments: number;
  draftWordCount: number;
  finalWordCount: number;
  targetWordCount: number;
  minWordCount: number;
  expansionPasses: number;
  wordTargetStatus: 'met' | 'missed' | 'blocked';
  wordTargetWarning?: string;
  snapshotLabel?: string;
  evaluationScore?: number;
  issueCount: number;
  revisedIssues: string[];
  failedIssues: Array<{ issueId: string; reason: string }>;
}

interface VersionLike {
  id: string;
  applyMode?: 'replace' | 'append';
  linkedIssueId?: string;
}

interface CandidateLike {
  id: string;
}

interface IssueLike {
  id: string;
  title: string;
  status: string;
}

interface ChapterLike {
  id: string;
  title: string;
  sortOrder: number;
}

interface SceneLike {
  id: string;
}

interface DraftSegmentLike {
  id: string;
  content: string;
  segmentIndex: number;
}

interface DraftPayload {
  totalWordCount: number;
  segments: DraftSegmentLike[];
}

interface OutlineLike {
  volumes: Array<{
    id?: string;
    title?: string;
    chapters: Array<{ title: string }>;
  }>;
}

interface WordTargetPlan {
  targetTotalWords: number;
  minTotalWords: number;
  targetWordsPerChapter: number;
  minWordsPerChapter: number;
}

export interface AutoCreateWorkflowResult {
  success: true;
  results: {
    importedChapterTitles: string[];
    chapterReports: WorkflowChapterReport[];
    totalScenes: number;
    totalDraftSegments: number;
    totalWords: number;
    totalIssues: number;
    totalRevisedIssues: number;
    targetTotalWords: number;
    minTotalWords: number;
    targetWordsPerChapter: number;
    minWordsPerChapter: number;
    chaptersBelowMinimum: number;
    targetAchieved: boolean;
  };
}

export async function runAutoCreateWorkflow({
  apiBase,
  project,
  targetChapters,
  runEvaluation,
  runRevisions,
  executor,
  onStepStart,
  onStepProgress,
  onStepComplete,
  onChapterProgress,
}: WorkflowRequestOptions): Promise<AutoCreateWorkflowResult> {
  const wordTargetPlan = getWordTargetPlan(project.targetLength, targetChapters);
  const result: AutoCreateWorkflowResult = {
    success: true,
    results: {
      importedChapterTitles: [],
      chapterReports: [],
      totalScenes: 0,
      totalDraftSegments: 0,
      totalWords: 0,
      totalIssues: 0,
      totalRevisedIssues: 0,
      targetTotalWords: wordTargetPlan.targetTotalWords,
      minTotalWords: wordTargetPlan.minTotalWords,
      targetWordsPerChapter: wordTargetPlan.targetWordsPerChapter,
      minWordsPerChapter: wordTargetPlan.minWordsPerChapter,
      chaptersBelowMinimum: 0,
      targetAchieved: false,
    },
  };

  onStepStart?.('charter', '正在生成 Charter');
  if (executor) {
    await executor.bootstrap(project);
  } else {
    await requestJson(apiBase, `/agents/bootstrap/${project.id}`, { method: 'POST' });
  }
  onStepComplete?.('charter', 'Charter 已生成');

  onStepStart?.('outline', '正在生成大纲');
  const outlinePayload = executor
    ? { outline: await executor.outline(project) }
    : await requestJson<{ outline: OutlineLike }>(apiBase, '/agents/outline', {
        method: 'POST',
        body: JSON.stringify({ projectId: project.id }),
      });
  const selectedVolumes = selectOutlineVolumes(outlinePayload.outline, targetChapters);
  result.results.importedChapterTitles = selectedVolumes.flatMap((volume) =>
    volume.chapters.map((chapter) => chapter.title)
  );
  onStepComplete?.('outline', `已生成 ${result.results.importedChapterTitles.length} 章大纲`);

  onStepStart?.('import_chapters', '正在导入章节');
  const defaultChapters = await getChapters(apiBase, project.id);
  for (const chapter of defaultChapters) {
    await requestJson(apiBase, `/chapters/${chapter.id}`, { method: 'DELETE' });
  }

  await requestJson(apiBase, `/projects/${project.id}/chapters/from-outline`, {
    method: 'POST',
    body: JSON.stringify({ volumes: selectedVolumes }),
  });

  const importedChapters = await getChapters(apiBase, project.id);
  if (importedChapters.length === 0) {
    throw new Error('Auto-create workflow imported 0 chapters.');
  }
  onStepComplete?.('import_chapters', `已导入 ${importedChapters.length} 个章节`);

  onStepStart?.(
    'chapters',
    `目标总字数 ${wordTargetPlan.targetTotalWords}，每章至少 ${wordTargetPlan.minWordsPerChapter} 字`
  );

  for (let chapterIndex = 0; chapterIndex < importedChapters.length; chapterIndex += 1) {
    const chapter = importedChapters[chapterIndex];
    const chapterReport: WorkflowChapterReport = {
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      sceneCount: 0,
      draftSegments: 0,
      draftWordCount: 0,
      finalWordCount: 0,
      targetWordCount: wordTargetPlan.targetWordsPerChapter,
      minWordCount: wordTargetPlan.minWordsPerChapter,
      expansionPasses: 0,
      wordTargetStatus: 'missed',
      wordTargetWarning: undefined,
      snapshotLabel: undefined,
      evaluationScore: undefined,
      issueCount: 0,
      revisedIssues: [],
      failedIssues: [],
    };
    result.results.chapterReports.push(chapterReport);

    onChapterProgress?.(`正在处理第 ${chapterIndex + 1}/${importedChapters.length} 章：${chapter.title}`);
    onStepProgress?.(
      'chapters',
      Math.floor((chapterIndex / importedChapters.length) * 100),
      `开始生成《${chapter.title}》的场景与正文`
    );

    const scenesPayload = executor
      ? await executor.generateScenes(apiBase, project, chapter)
      : await requestJson<{ scenes: SceneLike[] }>(
          apiBase,
          `/projects/${project.id}/scenes/from-outline`,
          {
            method: 'POST',
            body: JSON.stringify({ chapterId: chapter.id }),
          }
        );

    const scenes = scenesPayload.scenes;
    if (scenes.length === 0) {
      throw new Error(`Chapter "${chapter.title}" generated 0 scenes.`);
    }

    chapterReport.sceneCount = scenes.length;
    result.results.totalScenes += scenes.length;

    for (const scene of scenes) {
      await requestJson(apiBase, `/scenes/${scene.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'confirmed' }),
      });
    }

    for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1) {
      const scene = scenes[sceneIndex];
      const draftPayload = executor
        ? await executor.generateDraft(apiBase, project, chapter, scene)
        : await requestJson<{ segment: { content: string } }>(
            apiBase,
            `/scenes/${scene.id}/generate-draft`,
            { method: 'POST' }
          );
      const wordCount = countWords(draftPayload.segment.content);
      chapterReport.draftSegments += 1;
      chapterReport.draftWordCount += wordCount;
      result.results.totalDraftSegments += 1;

      const chapterBaseProgress = (chapterIndex / importedChapters.length) * 100;
      const chapterShare = 100 / importedChapters.length;
      const sceneProgress = ((sceneIndex + 1) / scenes.length) * chapterShare;
      onStepProgress?.(
        'chapters',
        Math.min(Math.round(chapterBaseProgress + sceneProgress), 99),
        `《${chapter.title}》正文生成 ${sceneIndex + 1}/${scenes.length}`
      );
    }

    const expansionResult = await expandChapterToTarget({
      apiBase,
      project,
      chapter,
      chapterReport,
      wordTargetPlan,
      onChapterProgress,
    });

    chapterReport.finalWordCount = expansionResult.draftPayload.totalWordCount;
    chapterReport.wordTargetWarning = expansionResult.warning;
    chapterReport.wordTargetStatus =
      chapterReport.finalWordCount >= wordTargetPlan.minWordsPerChapter
        ? 'met'
        : expansionResult.warning
          ? 'blocked'
          : 'missed';

    const snapshotPayload = await requestJson<{ version: { label: string } }>(
      apiBase,
      `/chapters/${chapter.id}/versions`,
      {
        method: 'POST',
        body: JSON.stringify({
          label: `自动初始版本-${chapter.title}`,
          summary: `AI 全自动创作：章节正文生成后的初始快照（${chapterReport.finalWordCount} 字）`,
          source: 'auto-workflow',
        }),
      }
    );
    chapterReport.snapshotLabel = snapshotPayload.version.label;
  }
  onStepComplete?.('chapters', '章节正文与初始版本已完成');

  if (runEvaluation) {
    onStepStart?.('evaluation', '正在进行章节评估');
    for (let chapterIndex = 0; chapterIndex < importedChapters.length; chapterIndex += 1) {
      const chapter = importedChapters[chapterIndex];
      onChapterProgress?.(`正在评估第 ${chapterIndex + 1}/${importedChapters.length} 章：${chapter.title}`);
      const evaluationPayload = executor
        ? await executor.evaluateChapter(apiBase, chapter)
        : await requestJson<{
            evaluationResult?: { scores?: { total?: number } };
          }>(apiBase, `/agents/evaluate/${chapter.id}`, {
            method: 'POST',
          });

      const report = result.results.chapterReports[chapterIndex];
      if (report) {
        report.evaluationScore = evaluationPayload.evaluationResult?.scores?.total;
      }

      onStepProgress?.(
        'evaluation',
        Math.round(((chapterIndex + 1) / importedChapters.length) * 100),
        `已完成《${chapter.title}》评估`
      );
    }
    onStepComplete?.('evaluation', '章节评估已完成');
  }

  if (runRevisions) {
    onStepStart?.('revision', '正在处理评估问题单');
    for (let chapterIndex = 0; chapterIndex < importedChapters.length; chapterIndex += 1) {
      const chapter = importedChapters[chapterIndex];
      onChapterProgress?.(`正在修订第 ${chapterIndex + 1}/${importedChapters.length} 章：${chapter.title}`);
      const report = result.results.chapterReports[chapterIndex];
      if (report) {
        if (executor) {
          const revisionResult = await executor.reviseChapter(apiBase, chapter);
          report.issueCount = revisionResult.issueCount;
          report.revisedIssues = revisionResult.revisedIssues;
          report.failedIssues = revisionResult.failedIssues;
          result.results.totalIssues += revisionResult.issueCount;
          result.results.totalRevisedIssues += revisionResult.revisedIssues.length;
        } else {
          await processIssuesForChapter(apiBase, chapter, report, result);
        }
        const finalDraftPayload = await getDraft(apiBase, chapter.id);
        report.finalWordCount = finalDraftPayload.totalWordCount;
      }

      onStepProgress?.(
        'revision',
        Math.round(((chapterIndex + 1) / importedChapters.length) * 100),
        `已完成《${chapter.title}》问题修订`
      );
    }
    onStepComplete?.('revision', '问题修订与应用已完成');
  }

  result.results.totalWords = result.results.chapterReports.reduce(
    (sum, report) => sum + report.finalWordCount,
    0
  );
  result.results.chaptersBelowMinimum = result.results.chapterReports.filter(
    (report) => report.finalWordCount < report.minWordCount
  ).length;
  result.results.targetAchieved =
    result.results.totalWords >= result.results.minTotalWords &&
    result.results.chaptersBelowMinimum === 0;
  onChapterProgress?.(null);

  return result;
}

async function expandChapterToTarget({
  apiBase,
  project,
  chapter,
  chapterReport,
  wordTargetPlan,
  onChapterProgress,
}: {
  apiBase: string;
  project: Project;
  chapter: ChapterLike;
  chapterReport: WorkflowChapterReport;
  wordTargetPlan: WordTargetPlan;
  onChapterProgress?: (message: string | null) => void;
}): Promise<{ draftPayload: DraftPayload; warning?: string }> {
  let draftPayload = await getDraft(apiBase, chapter.id);
  let attempt = 0;
  let warning: string | undefined;

  while (
    draftPayload.totalWordCount < wordTargetPlan.minWordsPerChapter &&
    draftPayload.segments.length > 0 &&
    attempt < 3
  ) {
    attempt += 1;
    const lastSegment = draftPayload.segments[draftPayload.segments.length - 1];
    const expansionContext = buildExpansionContext(draftPayload.segments, 1200);
    const desiredIncrease = Math.max(
      wordTargetPlan.targetWordsPerChapter - draftPayload.totalWordCount,
      300
    );

    onChapterProgress?.(
      `《${chapter.title}》第 ${attempt} 次扩写，当前 ${draftPayload.totalWordCount}/${wordTargetPlan.minWordsPerChapter} 字`
    );

    try {
      const revisionPayload = await requestJson<{ revision: VersionLike }>(apiBase, '/revisions', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          chapterId: chapter.id,
          targetScope: 'segment',
          targetRefId: lastSegment.id,
          originalText: expansionContext,
          suggestion: `在不改变当前剧情走向的前提下，为本章末段补写约 ${desiredIncrease} 字，增强动作、环境、心理与冲突推进，使章节更接近目标篇幅。`,
          goals: [
            '扩写章节篇幅',
            '增强场景真实感',
            '补足人物动作与心理',
            '保持武侠叙事张力',
          ],
          constraints: [
            `保留本章既有剧情事实与人物关系`,
            `不要重复前文已经出现的段落`,
            `新增内容应自然衔接在当前末段之后`,
            `本次新增内容以 ${desiredIncrease} 字上下浮动为宜，不要无故膨胀`,
            `本章最终至少达到 ${wordTargetPlan.minWordsPerChapter} 字，理想目标 ${wordTargetPlan.targetWordsPerChapter} 字左右`,
          ],
          applyMode: 'append',
          createdBy: 'agent',
        }),
      });

      const runPayload = await requestJson<{ candidate: CandidateLike }>(
        apiBase,
        `/revisions/${revisionPayload.revision.id}/run`,
        { method: 'POST' }
      );

      await requestJson(apiBase, `/revision-candidates/${runPayload.candidate.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ mode: 'append' }),
      });

      chapterReport.expansionPasses += 1;
      draftPayload = await getDraft(apiBase, chapter.id);
    } catch (error) {
      warning = summarizeError(error);
      onChapterProgress?.(`《${chapter.title}》扩写被门禁拦截：${warning}`);
      break;
    }
  }

  return {
    draftPayload,
    warning,
  };
}

async function processIssuesForChapter(
  apiBase: string,
  chapter: ChapterLike,
  chapterReport: WorkflowChapterReport,
  workflowResult: AutoCreateWorkflowResult
): Promise<void> {
  const issuesPayload = await requestJson<{ issues: IssueLike[] }>(
    apiBase,
    `/issues?chapterId=${chapter.id}`
  );
  const revisionsPayload = await requestJson<{ revisions: VersionLike[] }>(
    apiBase,
    `/revisions?chapterId=${chapter.id}`
  );

  chapterReport.issueCount = issuesPayload.issues.length;
  workflowResult.results.totalIssues += issuesPayload.issues.length;

  const actionableIssues = issuesPayload.issues.filter((issue) => issue.status !== 'wont_fix');

  for (const issue of actionableIssues) {
    try {
      let revision = revisionsPayload.revisions.find((item) => item.linkedIssueId === issue.id);

      if (!revision) {
        const createRevisionPayload = await requestJson<{ revision: VersionLike }>(
          apiBase,
          `/issues/${issue.id}/create-revision`,
          {
            method: 'POST',
            body: JSON.stringify({}),
          }
        );
        revision = createRevisionPayload.revision;
      }

      const runPayload = await requestJson<{ candidate: CandidateLike }>(
        apiBase,
        `/revisions/${revision.id}/run`,
        { method: 'POST' }
      );

      await requestJson(apiBase, `/revision-candidates/${runPayload.candidate.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ mode: revision.applyMode ?? 'replace' }),
      });

      chapterReport.revisedIssues.push(issue.id);
      workflowResult.results.totalRevisedIssues += 1;
    } catch (error) {
      chapterReport.failedIssues.push({
        issueId: issue.id,
        reason: summarizeError(error),
      });
    }
  }
}

async function getChapters(apiBase: string, projectId: string): Promise<ChapterLike[]> {
  const payload = await requestJson<{ chapters: ChapterLike[] }>(
    apiBase,
    `/projects/${projectId}/chapters`
  );

  return [...payload.chapters].sort((left, right) => left.sortOrder - right.sortOrder);
}

async function getDraft(apiBase: string, chapterId: string): Promise<DraftPayload> {
  return requestJson<DraftPayload>(apiBase, `/chapters/${chapterId}/draft`);
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

function selectOutlineVolumes(outline: OutlineLike, targetChapters: number) {
  const selectedVolumes: OutlineLike['volumes'] = [];
  let remaining = targetChapters;

  for (const volume of outline.volumes) {
    if (remaining <= 0) {
      break;
    }

    const chosenChapters = volume.chapters.slice(0, remaining);
    if (chosenChapters.length === 0) {
      continue;
    }

    selectedVolumes.push({
      ...volume,
      chapters: chosenChapters,
    });

    remaining -= chosenChapters.length;
  }

  if (remaining > 0) {
    throw new Error(`Outline only produced ${targetChapters - remaining} chapters, not enough for workflow.`);
  }

  return selectedVolumes;
}

function getWordTargetPlan(targetLength: TargetLength, targetChapters: number): WordTargetPlan {
  const targetByLength: Record<TargetLength, { target: number; min: number }> = {
    short: { target: 6000, min: 4800 },
    mid: { target: 30000, min: 24000 },
    long: { target: 80000, min: 65000 },
  };

  const plan = targetByLength[targetLength];
  const safeChapterCount = Math.max(targetChapters, 1);

  return {
    targetTotalWords: plan.target,
    minTotalWords: plan.min,
    targetWordsPerChapter: Math.ceil(plan.target / safeChapterCount),
    minWordsPerChapter: Math.ceil(plan.min / safeChapterCount),
  };
}

function buildExpansionContext(segments: DraftSegmentLike[], maxChars: number): string {
  const combined = segments.map((segment) => segment.content.trim()).filter(Boolean).join('\n\n');
  if (combined.length <= maxChars) {
    return combined;
  }

  return combined.slice(combined.length - maxChars);
}

function countWords(text: string): number {
  return text.replace(/\s+/g, '').length;
}

function summarizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * Evaluate Skill - Chapter quality evaluation with 8-dimension scoring
 *
 * Wraps critic-agent with:
 * - Standardized evaluation interface
 * - Quality signal extraction
 * - Gate-based decision support
 */

import type {
  EvaluateSkillInput,
  EvaluateSkillOutput,
  SkillOutputSchema,
} from '../skill-interface';
import { criticAgent } from '@/lib/agents/critic-agent';
import { chapterStore, projectStore } from '@/lib/db/projects-store';
import { loadCollection } from '@/lib/db/file-storage';
import type { BookOutline } from '@packages/shared-types';

// ============================================================
// Skill Implementation
// ============================================================

export async function executeEvaluateSkill(
  input: EvaluateSkillInput
): Promise<SkillOutputSchema> {
  const { projectId, chapterId, content, chapterGoal, keyEvents, mainCharacters } = input;

  try {
    // Build evaluation context
    const chapter = await chapterStore.getById(chapterId);
    if (!chapter) {
      return {
        status: 'failed',
        deliverable: null,
        error: `Chapter not found: ${chapterId}`,
      };
    }

    const project = await projectStore.getById(projectId);
    const charter = await projectStore.getCharter(projectId);
    const projectChapters = await chapterStore.getByProject(projectId);
    const outline = loadCollection<BookOutline>('outlines').find((o) => o.projectId === projectId);

    // Build chapter evaluation context
    const sortedChapters = [...projectChapters].sort((a, b) => a.sortOrder - b.sortOrder);
    const chapterIndex = sortedChapters.findIndex((c) => c.id === chapterId);
    const previousSummaries = sortedChapters
      .slice(Math.max(0, chapterIndex - 3), chapterIndex)
      .map((c) => c.summary?.trim())
      .filter((summary): summary is string => Boolean(summary));

    const volume = outline?.volumes.find((v) => v.id === chapter.parentVolumeId);
    const outlineChapter =
      volume?.chapters.find((c) => c.title === chapter.title) ??
      outline?.volumes.flatMap((v) => v.chapters).find((c) => c.title === chapter.title);

    const contextChapterGoal = chapterGoal || outlineChapter?.chapterGoal || extractSummaryLine(chapter.summary, 0);
    const contextKeyEvents = keyEvents || collectKeyEvents(outlineChapter, chapter.summary);
    const contextCharacters = mainCharacters?.length ? mainCharacters : collectMainCharacters(chapter.summary);

    // Normalize content for evaluation (same as API route)
    const normalizedContent = normalizeParagraphContent(content);

    // Call critic agent
    const evaluationResult = await criticAgent({
      projectId,
      chapterId,
      chapterTitle: chapter.title,
      content: normalizedContent,
      chapterGoal: contextChapterGoal,
      keyEvents: contextKeyEvents.length > 0 ? contextKeyEvents : undefined,
      mainCharacters: contextCharacters.length > 0 ? contextCharacters : undefined,
      volumeGoal: volume?.goal || charter?.coreConflict || project?.description,
      previousSummaries: previousSummaries.length > 0 ? previousSummaries : undefined,
    });

    // Map to output schema
    const normalizedGate = Object.fromEntries(
      Object.entries(evaluationResult.gate).map(([key, value]) => [key, value])
    ) as Record<string, { status: 'pass' | 'warn' | 'fail'; reason: string }>;

    const output: EvaluateSkillOutput = {
      status: evaluationResult.decision === 'pass' || evaluationResult.decision === 'pass_with_notes'
        ? 'completed'
        : evaluationResult.decision === 'partial_rewrite' || evaluationResult.decision === 'full_rewrite'
          ? 'needs_revision'
          : 'failed',
      deliverable: {
        scores: evaluationResult.scores,
        gate: normalizedGate,
        decision: evaluationResult.decision,
        strengths: evaluationResult.strengths,
        majorIssues: evaluationResult.majorIssues,
        revision: evaluationResult.revision,
      },
    };

    return output;
  } catch (error) {
    console.error('[EvaluateSkill] Execution error:', error);
    return {
      status: 'failed',
      deliverable: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================
// Helper Functions
// ============================================================

function normalizeParagraphContent(content: string): string {
  const paragraphs = content.split(/\n\n+/);
  const normalizedParagraphs = paragraphs.map((p) => p.replace(/\n+/g, ' ').trim());
  return normalizedParagraphs.filter((p) => p.length > 0).join('\n\n');
}

function extractSummaryLine(summary: string | undefined, index: number): string | undefined {
  if (!summary) return undefined;
  return summary.split('\n').map((line) => line.trim()).filter(Boolean)[index];
}

function collectKeyEvents(
  outlineChapter?: { mainEvents?: string; hook?: string },
  chapterSummary?: string
): string[] {
  const candidates = [
    outlineChapter?.mainEvents,
    outlineChapter?.hook,
    extractSummaryLine(chapterSummary, 1),
    extractSummaryLine(chapterSummary, 3),
  ];
  return candidates.filter((item): item is string => Boolean(item?.trim())).slice(0, 4);
}

function collectMainCharacters(chapterSummary?: string): string[] {
  if (!chapterSummary) return [];
  const uniqueNames = new Set<string>();
  const matches = chapterSummary.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
  for (const token of matches) {
    if (isLikelyCharacterName(token)) {
      uniqueNames.add(token);
    }
    if (uniqueNames.size >= 6) break;
  }
  return Array.from(uniqueNames);
}

function isLikelyCharacterName(token: string): boolean {
  const stopWords = ['章节目标', '主要事件', '人物成长', '结尾钩子', '本章目标', '分卷目标'];
  if (stopWords.some((word) => token.includes(word))) return false;
  return token.length >= 2 && token.length <= 4;
}

// ============================================================
// Skill Interface Export
// ============================================================

export const evaluateSkillId = 'evaluate-skill';

export async function handleEvaluateSkill(
  input: EvaluateSkillInput
): Promise<SkillOutputSchema> {
  return executeEvaluateSkill(input);
}

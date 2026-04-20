import { NextResponse } from 'next/server';
import { chapterStore, draftSegmentStore, issueStore, revisionStore } from '@/lib/db/projects-store';
import { criticAgent } from '@/lib/agents/critic-agent';
import {
  EvaluationDetailsData,
  EvaluationHistoryEntry,
  EvaluationScoreData,
  EvaluationSummaryData,
  getOverallGrade,
  SCORE_CARD_WEIGHTS,
} from '@packages/shared-types';

interface RouteParams {
  params: Promise<{ chapterId: string }>;
}

// POST /api/agents/evaluate/[chapterId] - Evaluate a chapter
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { chapterId } = await params;
    const chapter = await chapterStore.getById(chapterId);

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    const segments = await draftSegmentStore.getByChapter(chapterId);
    // Normalize content: join segments with \n\n, then normalize single newlines within paragraphs
    // Single newlines within a paragraph should be treated as visual line breaks, not paragraph separators
    const rawContent = segments.map((s) => s.content).join('\n\n');
    const content = normalizeParagraphContent(rawContent);

    if (!content) {
      return NextResponse.json(
        { error: 'No content to evaluate' },
        { status: 400 }
      );
    }

    const evaluationResult = await criticAgent({
      projectId: chapter.projectId,
      chapterId,
      chapterTitle: chapter.title,
      content,
    });

    const scores = evaluationResult.scores;
    const lowestDim = Object.entries(scores)
      .filter(([k]) => k !== 'total' && k !== 'ai_smell_severity')
      .sort(([, a], [, b]) => (a as number) - (b as number))[0];
    const overallIssueType = lowestDim ? (lowestDim[0] as 'style') : 'style';

    const revisionItems = [
      ...evaluationResult.revision.must_fix.map((item) => ({
        text: typeof item === 'string' ? item : item.text,
        excerpt: typeof item === 'string' ? undefined : item.excerpt,
        paragraphIndex: typeof item === 'string' ? undefined : item.paragraphIndex,
        level: 'must_fix' as const,
      })),
      ...evaluationResult.revision.should_improve.map((item) => ({
        text: typeof item === 'string' ? item : item.text,
        excerpt: typeof item === 'string' ? undefined : item.excerpt,
        paragraphIndex: typeof item === 'string' ? undefined : item.paragraphIndex,
        level: 'should_improve' as const,
      })),
    ];
    const sortedSegments = [...segments].sort((a, b) => a.segmentIndex - b.segmentIndex);

    // Verify and correct paragraphIndex based on actual content matching
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
    for (const item of revisionItems) {
      if (item.excerpt) {
        const actualIndex = paragraphs.findIndex(p =>
          p.replace(/\s+/g, '').includes(item.excerpt!.replace(/\s+/g, ''))
        );
        if (actualIndex !== -1 && actualIndex !== item.paragraphIndex) {
          console.warn(`Correcting paragraphIndex: ${item.paragraphIndex} -> ${actualIndex} for excerpt "${item.excerpt.slice(0, 30)}..."`);
          item.paragraphIndex = actualIndex;
        }
      }
    }

    const existingIssues = await issueStore.getByChapter(chapterId);
    const existingSuggestions = new Set(existingIssues.map((i) => i.suggestion));
    const newRevisionItems = revisionItems.filter((item) => !existingSuggestions.has(item.text));
    const evaluationScores = buildEvaluationScoreData(evaluationResult.scores);
    const evaluationSummary = buildEvaluationSummaryData(evaluationResult);
    const evaluationDetails = buildEvaluationDetailsData(chapterId, evaluationResult);

    if (newRevisionItems.length === 0) {
      const evaluationHistoryEntry = buildEvaluationHistoryEntry({
        chapterId,
        evaluationScores,
        evaluationSummary,
        evaluationDetails,
        issueCount: existingIssues.length,
        createdRevisionCount: 0,
      });
      await persistEvaluationArtifacts(chapter, chapterId, evaluationScores, evaluationSummary, evaluationDetails, evaluationHistoryEntry);

      return NextResponse.json({
        data: {
          chapterId,
          evaluationResult,
          scoreSummary: evaluationResult.scores,
          evaluationScores,
          evaluationSummary,
          evaluationDetails,
          evaluationHistoryEntry,
          issues: existingIssues,
          revisions: [],
          message: 'No new issues found (all already exist)',
        },
      });
    }

    const createdIssues = await Promise.all(
      newRevisionItems.map((item) =>
        issueStore.create({
          projectId: chapter.projectId,
          chapterId,
          issueType: overallIssueType,
          severity: item.level === 'must_fix' ? 'high' : item.level === 'should_improve' ? 'medium' : 'low',
          title: item.level === 'must_fix' ? `【必须修正】${item.text}` : `【建议优化】${item.text}`,
          reason: evaluationResult.majorIssues.join('；') || '根据评估结果建议修改',
          locationRef: resolveIssueLocationRef(sortedSegments, item.excerpt, item.paragraphIndex),
          suggestion: item.text,
          status: 'open',
          tags: evaluationResult.issueTags,
          revisionLevel: item.level,
          excerpt: item.excerpt,
          paragraphIndex: item.paragraphIndex,
        })
      )
    );

    const mustFixIssues = createdIssues.filter((issue) => issue.revisionLevel === 'must_fix');
    const createdRevisions = await Promise.all(
      mustFixIssues.map((issue) =>
        revisionStore.create({
          projectId: chapter.projectId,
          chapterId,
          targetScope: issue.locationRef ? 'segment' : 'chapter',
          targetRefId: issue.locationRef,
          originalText: issue.excerpt,
          suggestion: issue.suggestion || issue.title,
          goals: evaluationResult.majorIssues,
          constraints: [],
          applyMode: 'replace',
          linkedIssueId: issue.id,
          issueContext: {
            excerpt: issue.excerpt,
            reason: issue.reason,
            suggestion: issue.suggestion,
            tags: issue.tags,
            severity: issue.severity,
            paragraphIndex: issue.paragraphIndex,
          },
          createdBy: 'agent',
          status: 'draft',
        })
      )
    );

    const evaluationHistoryEntry = buildEvaluationHistoryEntry({
      chapterId,
      evaluationScores,
      evaluationSummary,
      evaluationDetails,
      issueCount: createdIssues.length,
      createdRevisionCount: createdRevisions.length,
    });
    await persistEvaluationArtifacts(chapter, chapterId, evaluationScores, evaluationSummary, evaluationDetails, evaluationHistoryEntry);

    return NextResponse.json({
      data: {
        chapterId,
        evaluationResult,
        scoreSummary: evaluationResult.scores,
        evaluationScores,
        evaluationSummary,
        evaluationDetails,
        evaluationHistoryEntry,
        issues: createdIssues,
        revisions: createdRevisions,
      },
    });
  } catch (error) {
    console.error('Error evaluating chapter:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate chapter' },
      { status: 500 }
    );
  }
}

function resolveIssueLocationRef(
  segments: Array<{ id: string; content: string }>,
  excerpt?: string,
  paragraphIndex?: number
): string | undefined {
  // Primary: use excerpt to find exact location (most reliable)
  const normalizedExcerpt = excerpt?.trim();
  if (normalizedExcerpt) {
    const matchingSegment = segments.find((segment) => {
      const normalizedSegmentContent = segment.content.replace(/\n+/g, ' ').trim();
      return normalizedSegmentContent.includes(normalizedExcerpt) ||
             segment.content.includes(normalizedExcerpt);
    });
    if (matchingSegment) {
      return matchingSegment.id;
    }
  }

  // Fallback 1: use paragraphIndex
  if (paragraphIndex !== undefined && paragraphIndex >= 0) {
    let paragraphCursor = 0;
    for (const segment of segments) {
      const paragraphCount = segment.content
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean).length;
      const normalizedCount = Math.max(paragraphCount, 1);

      if (paragraphIndex < paragraphCursor + normalizedCount) {
        return segment.id;
      }

      paragraphCursor += normalizedCount;
    }
  }

  // Fallback 2: use content similarity (excerpt partial match)
  if (normalizedExcerpt) {
    let bestMatch: { segmentId: string; similarity: number } | undefined;

    for (const segment of segments) {
      const paragraphs = segment.content.split(/\n{2,}/).filter(p => p.trim());
      for (const paragraph of paragraphs) {
        const similarity = calculateStringSimilarity(normalizedExcerpt, paragraph);
        if (similarity > 0.7 && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = { segmentId: segment.id, similarity };
        }
      }
    }

    if (bestMatch) {
      return bestMatch.segmentId;
    }
  }

  return undefined;
}

/**
 * Calculates Jaccard-like similarity between two strings.
 */
function calculateStringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  // Use character-based Jaccard
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));

  let intersection = 0;
  for (const char of Array.from(setA)) {
    if (setB.has(char)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Normalizes paragraph content by replacing single newlines with spaces.
 * This ensures consistent paragraph counting between test script and Critic Agent.
 * Single newlines within a paragraph are visual line breaks, not paragraph separators.
 */
function normalizeParagraphContent(content: string): string {
  // Split by double newlines (paragraph separators)
  const paragraphs = content.split(/\n\n+/);

  // For each paragraph, replace single newlines with spaces
  const normalizedParagraphs = paragraphs.map((p) => p.replace(/\n+/g, ' ').trim());

  // Filter out empty paragraphs and rejoin
  return normalizedParagraphs.filter((p) => p.length > 0).join('\n\n');
}

/**
 * Build EvaluationScoreData from 8-dimension scores for persistence
 */
function buildEvaluationScoreData(scores: {
  chapter_goal_completion: number;
  plot_progress_and_causality: number;
  conflict_and_tension: number;
  character_and_voice: number;
  language_and_style: number;
  continuity_and_consistency: number;
  information_and_pacing: number;
  ending_hook: number;
  ai_smell_severity?: 'low' | 'medium' | 'high';
}): EvaluationScoreData {
  // Map 8 dimensions to 6 dimensions
  const readability = Math.round((scores.language_and_style + scores.information_and_pacing) / 2);
  const rhythm = Math.round((scores.information_and_pacing + scores.conflict_and_tension) / 2);
  const characterConsistency = Math.round(scores.character_and_voice);
  const plotCompleteness = Math.round(
    (scores.chapter_goal_completion + scores.plot_progress_and_causality + scores.ending_hook) / 3
  );

  // AI smell: convert severity to score (higher = more AI smell)
  const aiSmellScore = scores.ai_smell_severity === 'low' ? 12 :
                       scores.ai_smell_severity === 'medium' ? 28 : 55;

  // Calculate overall weighted score
  const overall = Math.round(
    plotCompleteness * SCORE_CARD_WEIGHTS.plotCompleteness +
    characterConsistency * SCORE_CARD_WEIGHTS.characterConsistency +
    rhythm * SCORE_CARD_WEIGHTS.rhythm +
    readability * SCORE_CARD_WEIGHTS.readability +
    aiSmellScore * SCORE_CARD_WEIGHTS.aiSmell
  );

  // Calculate percentile (mock - in real implementation would compare to historical data)
  const percentile = Math.max(0, Math.min(99, Math.round(overall * 0.8 + Math.random() * 20)));

  return {
    overall,
    overallGrade: getOverallGrade(overall),
    percentile,
    dimensions: {
      readability,
      rhythm,
      characterConsistency,
      plotCompleteness,
      foreshadowRecovery: 0, // Will be updated by foreshadowing checker if available
      aiSmell: aiSmellScore,
    },
    evaluatedAt: new Date().toISOString(),
  };
}

function buildEvaluationSummaryData(result: {
  decision: string;
  gate: EvaluationSummaryData['gate'];
  strengths: string[];
  majorIssues: string[];
  issueTags: string[];
}): EvaluationSummaryData {
  return {
    decision: result.decision,
    gate: result.gate,
    strengths: result.strengths,
    majorIssues: result.majorIssues,
    issueTags: result.issueTags,
    evaluatedAt: new Date().toISOString(),
  };
}

function buildEvaluationDetailsData(
  chapterId: string,
  result: {
    scores: EvaluationDetailsData['scores'];
    decision: EvaluationDetailsData['decision'];
    gate: EvaluationDetailsData['gate'];
    issueTags: EvaluationDetailsData['issueTags'];
    strengths: string[];
    majorIssues: string[];
    revision: {
      must_fix: Array<string | { text: string; excerpt?: string; paragraphIndex?: number }>;
      should_improve: Array<string | { text: string; excerpt?: string; paragraphIndex?: number }>;
      optional_enhancements: Array<string | { text: string; excerpt?: string; paragraphIndex?: number }>;
    };
  }
): EvaluationDetailsData {
  const evaluatedAt = new Date().toISOString();

  return {
    chapterId,
    scores: result.scores,
    decision: result.decision,
    gate: result.gate,
    issueTags: result.issueTags,
    strengths: result.strengths,
    majorIssues: result.majorIssues,
    revision: {
      must_fix: normalizeRevisionItems(result.revision.must_fix, 'must_fix'),
      should_improve: normalizeRevisionItems(result.revision.should_improve, 'should_improve'),
      optional_enhancements: normalizeRevisionItems(result.revision.optional_enhancements, 'optional_enhancement'),
    },
    evaluatedAt,
  };
}

function normalizeRevisionItems(
  items: Array<string | { text: string; excerpt?: string; paragraphIndex?: number }>,
  level: 'must_fix' | 'should_improve' | 'optional_enhancement'
): EvaluationDetailsData['revision']['must_fix'] {
  return items.map((item) => {
    if (typeof item === 'string') {
      return { text: item, level };
    }

    return {
      text: item.text,
      level,
      excerpt: item.excerpt,
      paragraphIndex: item.paragraphIndex,
    };
  });
}

function buildEvaluationHistoryEntry({
  chapterId,
  evaluationScores,
  evaluationSummary,
  evaluationDetails,
  issueCount,
  createdRevisionCount,
}: {
  chapterId: string;
  evaluationScores: EvaluationScoreData;
  evaluationSummary: EvaluationSummaryData;
  evaluationDetails: EvaluationDetailsData;
  issueCount: number;
  createdRevisionCount: number;
}): EvaluationHistoryEntry {
  return {
    id: crypto.randomUUID(),
    chapterId,
    evaluatedAt: evaluationDetails.evaluatedAt,
    overallScore: evaluationScores.overall,
    decision: evaluationDetails.decision,
    scoreCard: evaluationScores,
    summary: evaluationSummary,
    details: evaluationDetails,
    issueCount,
    createdRevisionCount,
  };
}

async function persistEvaluationArtifacts(
  chapter: NonNullable<Awaited<ReturnType<typeof chapterStore.getById>>>,
  chapterId: string,
  evaluationScores: EvaluationScoreData,
  evaluationSummary: EvaluationSummaryData,
  evaluationDetails: EvaluationDetailsData,
  historyEntry: EvaluationHistoryEntry
): Promise<void> {
  const existingHistory = Array.isArray(chapter.evaluationHistory) ? chapter.evaluationHistory : [];
  const nextHistory = [...existingHistory, historyEntry].slice(-20);

  await chapterStore.update(chapterId, {
    evaluationScores,
    evaluationSummary,
    evaluationDetails,
    evaluationHistory: nextHistory,
  });
}

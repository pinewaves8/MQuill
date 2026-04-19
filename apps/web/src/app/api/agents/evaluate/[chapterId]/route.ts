import { NextResponse } from 'next/server';
import { chapterStore, draftSegmentStore, issueStore, revisionStore } from '@/lib/db/projects-store';
import { criticAgent } from '@/lib/agents/critic-agent';

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
    const content = segments.map((s) => s.content).join('\n\n');

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

    const existingIssues = await issueStore.getByChapter(chapterId);
    const existingSuggestions = new Set(existingIssues.map((i) => i.suggestion));
    const newRevisionItems = revisionItems.filter((item) => !existingSuggestions.has(item.text));

    if (newRevisionItems.length === 0) {
      return NextResponse.json({
        data: {
          chapterId,
          evaluationResult,
          scoreSummary: evaluationResult.scores,
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

    return NextResponse.json({
      data: {
        chapterId,
        evaluationResult,
        scoreSummary: evaluationResult.scores,
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
  const normalizedExcerpt = excerpt?.trim();

  if (normalizedExcerpt) {
    const matchingSegment = segments.find((segment) => segment.content.includes(normalizedExcerpt));
    if (matchingSegment) {
      return matchingSegment.id;
    }
  }

  if (paragraphIndex === undefined || paragraphIndex < 0) {
    return undefined;
  }

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

  return undefined;
}

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

    // Get draft content
    const segments = await draftSegmentStore.getByChapter(chapterId);
    const content = segments.map((s) => s.content).join('\n\n');

    if (!content) {
      return NextResponse.json(
        { error: 'No content to evaluate' },
        { status: 400 }
      );
    }

    // Run critic agent (v2 - 8-dimension evaluation)
    const evaluationResult = await criticAgent({
      projectId: chapter.projectId,
      chapterId,
      chapterTitle: chapter.title,
      content,
    });

    // Determine overall issue type based on lowest scoring dimension
    const scores = evaluationResult.scores;
    const lowestDim = Object.entries(scores)
      .filter(([k]) => k !== 'total' && k !== 'ai_smell_severity')
      .sort(([, a], [, b]) => (a as number) - (b as number))[0];
    const overallIssueType = lowestDim ? (lowestDim[0] as any) : 'style';

    // Build revision items from evaluation result
    const revisionItems = [
      ...evaluationResult.revision.must_fix.map((text) => ({
        text,
        level: 'must_fix' as const,
      })),
      ...evaluationResult.revision.should_improve.map((text) => ({
        text,
        level: 'should_improve' as const,
      })),
    ];

    // Check for existing issues to avoid duplicates
    const existingIssues = await issueStore.getByChapter(chapterId);
    const existingSuggestions = new Set(existingIssues.map((i) => i.suggestion));

    // Deduplicate: only keep revisionItems that don't already exist
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
          title: item.level === 'must_fix' ? `【必须修改】${item.text}` : `【建议优化】${item.text}`,
          reason: evaluationResult.majorIssues.join('；') || '根据评估结果建议修改',
          suggestion: item.text,
          status: 'open',
          tags: evaluationResult.issueTags,
          revisionLevel: item.level,
        })
      )
    );

    // Auto-create revision tasks for must_fix items
    const mustFixIssues = createdIssues.filter((issue) => issue.revisionLevel === 'must_fix');
    const createdRevisions = await Promise.all(
      mustFixIssues.map((issue) =>
        revisionStore.create({
          projectId: chapter.projectId,
          chapterId,
          targetScope: 'segment',
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

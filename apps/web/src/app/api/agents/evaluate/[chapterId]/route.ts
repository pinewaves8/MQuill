import { NextResponse } from 'next/server';
import { chapterStore, draftSegmentStore, issueStore } from '@/lib/db/projects-store';
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

    // Create issues in the store from evaluation result
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

    const createdIssues = await Promise.all(
      revisionItems.map((item) =>
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

    return NextResponse.json({
      data: {
        chapterId,
        evaluationResult,
        scoreSummary: evaluationResult.scores,
        issues: createdIssues,
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

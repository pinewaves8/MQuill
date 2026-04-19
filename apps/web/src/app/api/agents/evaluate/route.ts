import { NextResponse } from 'next/server';
import { chapterStore, draftSegmentStore, issueStore } from '@/lib/db/projects-store';
import { criticAgent } from '@/lib/agents/critic-agent';

interface RouteParams {
  params: Promise<{ chapterId: string }>;
}

// POST /api/agents/evaluate - Evaluate a chapter
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

    // Run critic agent
    const { scoreSummary, issues: rawIssues } = await criticAgent({
      projectId: chapter.projectId,
      chapterId,
      chapterTitle: chapter.title,
      content,
    });

    // Create issues in the store
    const createdIssues = await Promise.all(
      rawIssues.map((issue) =>
        issueStore.create({
          projectId: chapter.projectId,
          chapterId,
          issueType: issue.issueType!,
          severity: issue.severity!,
          title: issue.title!,
          reason: issue.reason!,
          suggestion: issue.suggestion,
          status: 'open',
        })
      )
    );

    return NextResponse.json({
      data: {
        chapterId,
        scoreSummary,
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

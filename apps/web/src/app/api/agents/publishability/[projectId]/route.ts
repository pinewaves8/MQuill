import { NextResponse } from 'next/server';
import { projectStore, chapterStore, draftSegmentStore } from '@/lib/db/projects-store';
import { evaluatePublishability } from '@/lib/agents/publishability-agent';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// POST /api/agents/publishability/[projectId] - Evaluate project publishability
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;

    const project = await projectStore.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const chapters = await chapterStore.getByProject(projectId);

    // Get content for each chapter
    const chaptersWithContent = await Promise.all(
      chapters
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(async (chapter) => {
          const segments = await draftSegmentStore.getByChapter(chapter.id);
          const content = segments.map((s) => s.content).join('\n\n');
          return {
            id: chapter.id,
            title: chapter.title,
            content,
          };
        })
    );

    // Filter out empty chapters
    const nonEmptyChapters = chaptersWithContent.filter((c) => c.content.length > 100);

    if (nonEmptyChapters.length === 0) {
      return NextResponse.json(
        { error: 'No content to evaluate' },
        { status: 400 }
      );
    }

    const result = await evaluatePublishability({
      projectId,
      title: project.title,
      chapters: nonEmptyChapters,
    });

    return NextResponse.json({
      data: {
        projectId,
        title: project.title,
        chapterCount: nonEmptyChapters.length,
        result,
      },
    });
  } catch (error) {
    console.error('Error evaluating publishability:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate publishability' },
      { status: 500 }
    );
  }
}

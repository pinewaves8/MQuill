import { NextResponse } from 'next/server';
import { sceneStore, chapterStore } from '@/lib/db/projects-store';
import { scenePlannerAgent } from '@/lib/agents/scene-planner-agent';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// POST /api/agents/scene-plan - Generate scene plan for a chapter
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { chapterId } = body;

    if (!chapterId) {
      return NextResponse.json(
        { error: 'chapterId is required' },
        { status: 400 }
      );
    }

    const chapter = await chapterStore.getById(chapterId);

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // Get previous chapter summary for continuity
    const allChapters = await chapterStore.getByProject(projectId);
    const chapterIndex = allChapters.findIndex(c => c.id === chapterId);
    const previousChapter = chapterIndex > 0 ? allChapters[chapterIndex - 1] : null;
    const previousChapterSummary = previousChapter?.summary;

    // Call scene planner agent
    const result = await scenePlannerAgent({
      projectId,
      chapterId,
      chapterTitle: chapter.title,
      chapterSummary: chapter.summary,
      previousChapterSummary,
    });

    // Create scenes in the store
    const createdScenes = await Promise.all(
      result.scenes.map((scene, index) =>
        sceneStore.create({
          projectId,
          chapterId,
          title: scene.title || `场景 ${index + 1}`,
          summary: scene.summary || '',
          status: 'draft',
          sortOrder: index,
          source: 'ai',
        })
      )
    );

    return NextResponse.json({
      data: {
        chapterId,
        scenes: createdScenes,
      },
    });
  } catch (error) {
    console.error('Error planning scenes:', error);
    return NextResponse.json(
      { error: 'Failed to plan scenes' },
      { status: 500 }
    );
  }
}

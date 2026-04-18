import { NextResponse } from 'next/server';
import { projectStore, chapterStore, sceneStore } from '@/lib/db/projects-store';
import { loadCollection } from '@/lib/db/file-storage';
import { BookOutline, ChapterOutline } from '@packages/shared-types';
import { scenePlannerAgent } from '@/lib/agents/scene-planner-agent';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// POST /api/projects/:projectId/scenes/from-outline - Generate scenes from outline chapter data
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { chapterId } = body;

    if (!chapterId) {
      return NextResponse.json({ error: 'chapterId is required' }, { status: 400 });
    }

    const project = await projectStore.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get chapter from store to find its volume
    const chapter = await chapterStore.getById(chapterId);
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // Get the outline to find chapter outline data
    const outlines = loadCollection<BookOutline>('outlines');
    const outline = outlines.find(o => o.projectId === projectId);

    if (!outline) {
      return NextResponse.json({ error: 'Outline not found' }, { status: 404 });
    }

    // Find the chapter outline data by matching title (partial match for titles like "第一章" matching "第一章：虫洞之外")
    let chapterOutline: ChapterOutline | undefined;
    for (const volume of outline.volumes) {
      chapterOutline = volume.chapters.find(c =>
        c.title === chapter.title || c.title.startsWith(chapter.title + '：') || c.title.startsWith(chapter.title + ':')
      );
      if (chapterOutline) break;
    }

    if (!chapterOutline) {
      return NextResponse.json({ error: 'Chapter not found in outline' }, { status: 404 });
    }

    // Build chapter summary from outline data
    const chapterSummary = [
      chapterOutline.chapterGoal,
      chapterOutline.mainEvents,
      chapterOutline.characterProgress,
      chapterOutline.hook,
    ].filter(Boolean).join('\n\n');

    // Get previous chapter summary for continuity
    const allChapters = await chapterStore.getByProject(projectId);
    const chapterIndex = allChapters.findIndex(c => c.id === chapterId);
    const previousChapter = chapterIndex > 0 ? allChapters[chapterIndex - 1] : null;
    const previousChapterSummary = previousChapter?.summary;

    // Call scene planner agent with outline data
    const result = await scenePlannerAgent({
      projectId,
      chapterId,
      chapterTitle: chapterOutline.title,
      chapterSummary,
      previousChapterSummary,
    });

    // Limit to 2-3 scenes as per user request
    const scenesToCreate = result.scenes.slice(0, 3);

    // Create scenes in the store
    const createdScenes = await Promise.all(
      scenesToCreate.map((scene, index) =>
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
      chapterId,
      scenes: createdScenes,
      count: createdScenes.length,
    });
  } catch (error) {
    console.error('Error generating scenes from outline:', error);
    return NextResponse.json({ error: 'Failed to generate scenes' }, { status: 500 });
  }
}

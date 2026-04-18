import { NextResponse } from 'next/server';
import { projectStore, chapterStore } from '@/lib/db/projects-store';
import { VolumeOutline } from '@packages/shared-types';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// POST /api/projects/:id/chapters/from-outline - Import chapters from outline
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { volumes } = body as { volumes: VolumeOutline[] };

    const project = await projectStore.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get existing chapters to check what already exists
    const existingChapters = await chapterStore.getByProject(projectId);
    const existingTitles = new Set(existingChapters.map((c: { title: string }) => c.title));

    const createdChapters = [];

    for (const volume of volumes) {
      for (const chapterOutline of volume.chapters) {
        // Skip if chapter with same title already exists
        if (existingTitles.has(chapterOutline.title)) {
          continue;
        }

        // Calculate sort order based on volume and chapter index
        const volumeIndex = volumes.indexOf(volume);
        const sortOrder = volumeIndex * 100 + volume.chapters.indexOf(chapterOutline);

        const chapter = await chapterStore.create({
          projectId,
          parentVolumeId: volume.id,
          sortOrder,
          title: chapterOutline.title,
          summary: `${chapterOutline.chapterGoal}\n${chapterOutline.mainEvents}\n${chapterOutline.characterProgress}\n${chapterOutline.hook}`,
          status: 'planned',
        });

        createdChapters.push(chapter);
        existingTitles.add(chapterOutline.title);
      }
    }

    return NextResponse.json({
      createdChapters,
      count: createdChapters.length,
    });
  } catch (error) {
    console.error('Error importing chapters from outline:', error);
    return NextResponse.json({ error: 'Failed to import chapters' }, { status: 500 });
  }
}

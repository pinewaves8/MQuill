import { NextResponse } from 'next/server';
import { sceneStore } from '@/lib/db/projects-store';
import { ReorderScenesSchema } from '@/lib/validation/schemas';

// POST /api/scenes/reorder - Reorder scenes
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = ReorderScenesSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues },
        { status: 400 }
      );
    }

    await sceneStore.reorder(result.data.chapterId, result.data.sceneIds);

    // Return updated scenes
    const scenes = await sceneStore.getByChapter(result.data.chapterId);

    return NextResponse.json({ data: { scenes } });
  } catch (error) {
    console.error('Error reordering scenes:', error);
    return NextResponse.json(
      { error: 'Failed to reorder scenes' },
      { status: 500 }
    );
  }
}

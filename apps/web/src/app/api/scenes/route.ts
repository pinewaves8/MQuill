import { NextResponse } from 'next/server';
import { sceneStore } from '@/lib/db/projects-store';
import { CreateSceneSchema } from '@/lib/validation/schemas';

// GET /api/scenes?chapterId=xxx - Get scenes for a chapter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    if (!chapterId) {
      return NextResponse.json(
        { error: 'chapterId is required' },
        { status: 400 }
      );
    }

    const scenes = await sceneStore.getByChapter(chapterId);

    return NextResponse.json({ scenes });
  } catch (error) {
    console.error('Error fetching scenes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenes' },
      { status: 500 }
    );
  }
}

// POST /api/scenes - Create a new scene
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = CreateSceneSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues },
        { status: 400 }
      );
    }

    // Get existing scenes to determine sort order
    const existingScenes = await sceneStore.getByChapter(result.data.chapterId);
    const sortOrder = existingScenes.length;

    const scene = await sceneStore.create({
      ...result.data,
      sortOrder,
      status: 'draft',
    });

    return NextResponse.json({ scene }, { status: 201 });
  } catch (error) {
    console.error('Error creating scene:', error);
    return NextResponse.json(
      { error: 'Failed to create scene' },
      { status: 500 }
    );
  }
}

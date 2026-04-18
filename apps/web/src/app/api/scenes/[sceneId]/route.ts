import { NextResponse } from 'next/server';
import { sceneStore } from '@/lib/db/projects-store';
import { UpdateSceneSchema } from '@/lib/validation/schemas';

interface RouteParams {
  params: Promise<{ sceneId: string }>;
}

// GET /api/scenes/:id - Get a single scene
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { sceneId } = await params;
    const scene = await sceneStore.getById(sceneId);

    if (!scene) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ scene });
  } catch (error) {
    console.error('Error fetching scene:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scene' },
      { status: 500 }
    );
  }
}

// PATCH /api/scenes/:id - Update a scene
export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { sceneId } = await params;
    const body = await request.json();
    const result = UpdateSceneSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues },
        { status: 400 }
      );
    }

    const scene = await sceneStore.update(sceneId, result.data);

    if (!scene) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ scene });
  } catch (error) {
    console.error('Error updating scene:', error);
    return NextResponse.json(
      { error: 'Failed to update scene' },
      { status: 500 }
    );
  }
}

// DELETE /api/scenes/:id - Delete a scene
export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { sceneId } = await params;
    const deleted = await sceneStore.delete(sceneId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scene:', error);
    return NextResponse.json(
      { error: 'Failed to delete scene' },
      { status: 500 }
    );
  }
}

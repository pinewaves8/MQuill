import { NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/projects-store';
import { ForeshadowingEntry } from '@packages/shared-types';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/foreshadowings/[projectId] - Get all foreshadowings for a project
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const resolvedOnly = searchParams.get('resolved') === 'true';

    const memories = await memoryStore.getByProject(projectId, 'foreshadow');

    let foreshadowings: ForeshadowingEntry[] = memories
      .filter((m) => m.content.foreshadowings)
      .flatMap((m) => m.content.foreshadowings || []);

    if (resolvedOnly) {
      foreshadowings = foreshadowings.filter((f) => f.resolved);
    }

    return NextResponse.json({
      data: {
        foreshadowings,
        totalCount: foreshadowings.length,
        unresolvedCount: foreshadowings.filter((f) => !f.resolved).length,
      },
    });
  } catch (error) {
    console.error('Error fetching foreshadowings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch foreshadowings' },
      { status: 500 }
    );
  }
}

// POST /api/foreshadowings/[projectId] - Register a new foreshadowing
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    const newForeshadowing: ForeshadowingEntry = {
      id: `foreshadow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: body.type || 'event',
      hintText: body.hintText,
      setupChapterId: body.chapterId,
      setupChapterTitle: body.chapterTitle || '',
      expectedResolution: body.expectedResolution || '',
      resolved: false,
      notes: body.notes,
    };

    // Create a new memory entry for this foreshadowing
    await memoryStore.create({
      projectId,
      memoryType: 'foreshadow',
      key: `foreshadow:${newForeshadowing.id}`,
      content: {
        foreshadowings: [newForeshadowing],
      },
      priority: 80,
      source: body.source || 'agent',
    });

    return NextResponse.json({
      data: { foreshadowing: newForeshadowing },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating foreshadowing:', error);
    return NextResponse.json(
      { error: 'Failed to create foreshadowing' },
      { status: 500 }
    );
  }
}

// PATCH /api/foreshadowings/[projectId] - Update a foreshadowing (e.g., mark as resolved)
export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    const memories = await memoryStore.getByProject(projectId, 'foreshadow');
    const targetMemory = memories.find((m) =>
      m.content.foreshadowings?.some((f) => f.id === body.id)
    );

    if (!targetMemory) {
      return NextResponse.json(
        { error: 'Foreshadowing not found' },
        { status: 404 }
      );
    }

    const foreshadowings = targetMemory.content.foreshadowings || [];
    const index = foreshadowings.findIndex((f) => f.id === body.id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Foreshadowing not found' },
        { status: 404 }
      );
    }

    // Update the foreshadowing
    foreshadowings[index] = {
      ...foreshadowings[index],
      ...body,
    };

    await memoryStore.update(targetMemory.id, {
      content: {
        ...targetMemory.content,
        foreshadowings,
      },
    });

    return NextResponse.json({
      data: { foreshadowing: foreshadowings[index] },
    });
  } catch (error) {
    console.error('Error updating foreshadowing:', error);
    return NextResponse.json(
      { error: 'Failed to update foreshadowing' },
      { status: 500 }
    );
  }
}

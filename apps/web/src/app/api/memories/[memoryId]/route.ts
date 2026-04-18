import { NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/projects-store';

interface RouteParams {
  params: Promise<{ memoryId: string }>;
}

// GET /api/memories/:id - Get a single memory
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { memoryId } = await params;
    const memory = await memoryStore.getById(memoryId);

    if (!memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ memory });
  } catch (error) {
    console.error('Error fetching memory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memory' },
      { status: 500 }
    );
  }
}

// PATCH /api/memories/:id - Update a memory
export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { memoryId } = await params;
    const body = await request.json();

    const memory = await memoryStore.update(memoryId, body);

    if (!memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ memory });
  } catch (error) {
    console.error('Error updating memory:', error);
    return NextResponse.json(
      { error: 'Failed to update memory' },
      { status: 500 }
    );
  }
}

// DELETE /api/memories/:id - Delete a memory
export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { memoryId } = await params;
    const deleted = await memoryStore.delete(memoryId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting memory:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { MemoryType } from '@packages/shared-types';
import { memoryStore } from '@/lib/db/projects-store';
import { CreateMemorySchema } from '@/lib/validation/schemas';

// GET /api/memories - Get memories for a project
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const memoryType = searchParams.get('type') as MemoryType | null;
    const query = searchParams.get('query');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let memories;
    if (query) {
      memories = await memoryStore.query(projectId, query, memoryType || undefined);
    } else {
      memories = await memoryStore.getByProject(projectId, memoryType || undefined);
    }

    return NextResponse.json({ memories });
  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}

// POST /api/memories - Create a new memory
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = CreateMemorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues },
        { status: 400 }
      );
    }

    const input = result.data;

    const memory = await memoryStore.create({
      projectId: input.projectId,
      memoryType: input.memoryType,
      key: input.key,
      content: input.content,
      priority: input.priority || 50,
      source: input.source || 'user',
    });

    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    console.error('Error creating memory:', error);
    return NextResponse.json(
      { error: 'Failed to create memory' },
      { status: 500 }
    );
  }
}

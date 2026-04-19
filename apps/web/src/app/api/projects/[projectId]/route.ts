import { NextResponse } from 'next/server';
import { projectStore } from '@/lib/db/projects-store';
import { UpdateProjectSchema } from '@/lib/validation/schemas';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/:id - Get a single project
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const project = await projectStore.getById(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const tags = await projectStore.getTags(projectId);

    return NextResponse.json({
      data: {
        project: {
          ...project,
          tags: tags.map((t) => t.tag),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/:id - Update a project
export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const result = UpdateProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues },
        { status: 400 }
      );
    }

    // Filter out undefined values and cast to proper types
    const updates: Record<string, unknown> = {};
    if (result.data.title !== undefined) updates.title = result.data.title;
    if (result.data.bookType !== undefined) updates.bookType = result.data.bookType;
    if (result.data.targetLength !== undefined) updates.targetLength = result.data.targetLength;
    if (result.data.language !== undefined) updates.language = result.data.language;
    if (result.data.mode !== undefined) updates.mode = result.data.mode;
    if (result.data.status !== undefined) updates.status = result.data.status;
    if (result.data.description !== undefined) updates.description = result.data.description;
    if (result.data.coverTone !== undefined) updates.coverTone = result.data.coverTone;
    if (result.data.viewpoint !== undefined) updates.viewpoint = result.data.viewpoint;
    if (result.data.targetAudience !== undefined) updates.targetAudience = result.data.targetAudience;
    if (result.data.styleKeywords !== undefined) updates.styleKeywords = result.data.styleKeywords;

    const project = await projectStore.update(projectId, updates as Parameters<typeof projectStore.update>[1]);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update tags if provided
    if (body.tags) {
      await projectStore.setTags(projectId, body.tags);
    }

    const tags = await projectStore.getTags(projectId);

    return NextResponse.json({
      data: {
        project: {
          ...project,
          tags: tags.map((t) => t.tag),
        },
      },
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id - Delete a project
export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const deleted = await projectStore.delete(projectId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}

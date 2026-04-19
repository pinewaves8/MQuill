import { NextResponse } from 'next/server';
import { chapterStore } from '@/lib/db/projects-store';
import { CreateChapterSchema } from '@/lib/validation/schemas';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/:projectId/chapters - Get all chapters for a project
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const chapters = await chapterStore.getByProject(projectId);

    return NextResponse.json({ data: { chapters } });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}

// POST /api/projects/:projectId/chapters - Create a new chapter
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const result = CreateChapterSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues },
        { status: 400 }
      );
    }

    // Verify projectId matches
    if (result.data.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Project ID mismatch' },
        { status: 400 }
      );
    }

    // Get existing chapters to determine sort order
    const existingChapters = await chapterStore.getByProject(projectId);
    const sortOrder = result.data.sortOrder ?? existingChapters.length;

    const chapter = await chapterStore.create({
      projectId: result.data.projectId,
      parentVolumeId: result.data.parentVolumeId,
      sortOrder,
      title: result.data.title,
      summary: result.data.summary,
      status: 'planned',
    });

    return NextResponse.json({ data: { chapter } }, { status: 201 });
  } catch (error) {
    console.error('Error creating chapter:', error);
    return NextResponse.json(
      { error: 'Failed to create chapter' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { chapterStore } from '@/lib/db/projects-store';
import { UpdateChapterSchema } from '@/lib/validation/schemas';

interface RouteParams {
  params: Promise<{ chapterId: string }>;
}

// GET /api/chapters/:id - Get a single chapter
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { chapterId } = await params;
    const chapter = await chapterStore.getById(chapterId);

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ chapter });
  } catch (error) {
    console.error('Error fetching chapter:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapter' },
      { status: 500 }
    );
  }
}

// PATCH /api/chapters/:id - Update a chapter
export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { chapterId } = await params;
    const body = await request.json();
    const result = UpdateChapterSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues },
        { status: 400 }
      );
    }

    const chapter = await chapterStore.update(chapterId, result.data);

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ chapter });
  } catch (error) {
    console.error('Error updating chapter:', error);
    return NextResponse.json(
      { error: 'Failed to update chapter' },
      { status: 500 }
    );
  }
}

// DELETE /api/chapters/:id - Delete a chapter
export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { chapterId } = await params;
    const deleted = await chapterStore.delete(chapterId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return NextResponse.json(
      { error: 'Failed to delete chapter' },
      { status: 500 }
    );
  }
}

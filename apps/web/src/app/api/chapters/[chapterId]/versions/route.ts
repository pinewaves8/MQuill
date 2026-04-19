import { NextResponse } from 'next/server';
import { versionStore } from '@/lib/db/projects-store';

interface RouteParams {
  params: Promise<{ chapterId: string }>;
}

// GET /api/chapters/:id/versions - Get version history for a chapter
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { chapterId } = await params;
    const versions = await versionStore.getByChapter(chapterId);

    return NextResponse.json({ data: { versions } });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

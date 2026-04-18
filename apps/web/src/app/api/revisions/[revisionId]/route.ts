import { NextResponse } from 'next/server';
import { revisionStore, revisionCandidateStore } from '@/lib/db/projects-store';

// GET /api/revisions/:id - Get a single revision task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ revisionId: string }> }
) {
  try {
    const { revisionId } = await params;
    const revision = await revisionStore.getById(revisionId);

    if (!revision) {
      return NextResponse.json(
        { error: 'Revision not found' },
        { status: 404 }
      );
    }

    const candidates = await revisionCandidateStore.getByRevision(revisionId);

    return NextResponse.json({
      revision: { ...revision, candidates },
    });
  } catch (error) {
    console.error('Error fetching revision:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revision' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { revisionStore, revisionCandidateStore, chapterStore } from '@/lib/db/projects-store';
import { CreateRevisionSchema } from '@/lib/validation/schemas';

// GET /api/revisions - List revisions by chapterId
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

    const revisions = await revisionStore.getByChapter(chapterId);

    // Attach candidates to each revision
    const revisionsWithCandidates = await Promise.all(
      revisions.map(async (revision) => {
        const candidates = await revisionCandidateStore.getByRevision(revision.id);
        return { ...revision, candidates };
      })
    );

    return NextResponse.json({ revisions: revisionsWithCandidates });
  } catch (error) {
    console.error('Error fetching revisions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revisions' },
      { status: 500 }
    );
  }
}

// POST /api/revisions - Create a new revision task
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = CreateRevisionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues },
        { status: 400 }
      );
    }

    const input = result.data;

    // Verify chapter exists
    const chapter = await chapterStore.getById(input.chapterId);
    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    const revision = await revisionStore.create({
      projectId: input.projectId,
      chapterId: input.chapterId,
      targetScope: input.targetScope,
      targetRefId: input.targetRefId,
      suggestion: input.suggestion,
      goals: input.goals || [],
      constraints: input.constraints || [],
      applyMode: input.applyMode || 'replace',
      status: 'draft',
      linkedIssueId: input.linkedIssueId,
      createdBy: input.createdBy || 'user',
    });

    return NextResponse.json({ revision }, { status: 201 });
  } catch (error) {
    console.error('Error creating revision:', error);
    return NextResponse.json(
      { error: 'Failed to create revision' },
      { status: 500 }
    );
  }
}

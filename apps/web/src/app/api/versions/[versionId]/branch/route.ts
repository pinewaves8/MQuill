import { NextResponse } from 'next/server';
import { versionStore } from '@/lib/db/projects-store';
import { CreateBranchVersionSchema } from '@/lib/validation/schemas';

interface RouteParams {
  params: Promise<{ versionId: string }>;
}

// POST /api/versions/:id/branch - Create a branch from a version
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { versionId } = await params;
    const body = await request.json();
    const result = CreateBranchVersionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues }, { status: 400 });
    }

    const baseVersion = await versionStore.getById(versionId);
    if (!baseVersion) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const branchVersion = await versionStore.createBranchFromVersion(versionId, {
      branchName: result.data.branchName,
      summary: result.data.summary,
      snapshotContent: baseVersion.snapshotContent,
      wordCount: baseVersion.wordCount,
      metricsSnapshot: result.data.metricsSnapshot,
    });

    if (!branchVersion) {
      return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
    }

    return NextResponse.json({ data: { branchVersion } });
  } catch (error) {
    console.error('Error creating branch:', error);
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
  }
}

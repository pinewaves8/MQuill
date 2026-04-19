import { NextResponse } from 'next/server';
import { versionStore, draftSegmentStore, chapterStore, issueStore, revisionStore } from '@/lib/db/projects-store';

interface RouteParams {
  params: Promise<{ versionId: string }>;
}

// GET /api/versions/:id - Get a single version with lineage and linked info
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { versionId } = await params;
    const version = await versionStore.getById(versionId);

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Get lineage (parent chain)
    const lineage = await versionStore.getVersionLineage(versionId);

    // Get linked revision if exists
    let linkedRevision = null;
    if (version.linkedRevisionId) {
      linkedRevision = await revisionStore.getById(version.linkedRevisionId);
    }

    // Get linked issues if any
    let linkedIssues: Array<{ id: string; title: string; status: string }> = [];
    if (version.linkedIssueIds && version.linkedIssueIds.length > 0) {
      const issuePromises = version.linkedIssueIds.map((id) => issueStore.getById(id));
      const issues = await Promise.all(issuePromises);
      linkedIssues = issues
        .filter((i) => i !== null)
        .map((i) => ({ id: i!.id, title: i!.title, status: i!.status }));
    }

    return NextResponse.json({
      data: {
        version,
        lineage,
        linkedRevision,
        linkedIssues,
      },
    });
  } catch (error) {
    console.error('Error fetching version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version' },
      { status: 500 }
    );
  }
}

// POST /api/versions/:id/restore - Restore a version
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { versionId } = await params;
    const version = await versionStore.getById(versionId);

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Get current segments for content restoration
    const currentSegments = await draftSegmentStore.getByChapter(version.chapterId);

    // versionStore.restore() will:
    // 1. Create restore-backup of current version if exists
    // 2. Mark target version as current
    // 3. Set all other versions in chapter as non-current
    await versionStore.restore(versionId);

    // Restore the selected version's content to draft segments
    // Clear existing segments
    for (const seg of currentSegments) {
      await draftSegmentStore.update(seg.id, {
        content: '',
        isLocked: false,
      });
    }

    // Create new segment with restored content
    await draftSegmentStore.upsert({
      projectId: version.projectId,
      chapterId: version.chapterId,
      segmentIndex: 0,
      content: version.snapshotContent,
      source: 'manual',
      isLocked: false,
    });

    // Update chapter word count
    const chapter = await chapterStore.getById(version.chapterId);
    if (chapter) {
      await chapterStore.update(version.chapterId, {
        wordCount: version.snapshotContent.length,
      });
    }

    return NextResponse.json({
      data: {
        success: true,
        restoredVersion: version,
      },
    });
  } catch (error) {
    console.error('Error restoring version:', error);
    return NextResponse.json(
      { error: 'Failed to restore version' },
      { status: 500 }
    );
  }
}

// POST /api/versions/:id/branch - Create a branch from this version
export async function PUT(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { versionId } = await params;
    const body = await request.json();
    const { branchName, summary } = body;

    if (!branchName) {
      return NextResponse.json(
        { error: 'branchName is required' },
        { status: 400 }
      );
    }

    const version = await versionStore.getById(versionId);
    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Get current content to create branch from
    const currentSegments = await draftSegmentStore.getByChapter(version.chapterId);
    const currentContent = currentSegments.map((s) => s.content).join('\n\n');

    const branchVersion = await versionStore.createBranchFromVersion(versionId, {
      branchName,
      summary,
      snapshotContent: currentContent,
      wordCount: currentContent.length,
    });

    return NextResponse.json({
      data: { branchVersion },
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    );
  }
}

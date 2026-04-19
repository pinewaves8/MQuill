import { NextResponse } from 'next/server';
import { versionStore, draftSegmentStore, chapterStore } from '@/lib/db/projects-store';

interface RouteParams {
  params: Promise<{ versionId: string }>;
}

// GET /api/versions/:id - Get a single version
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

    return NextResponse.json({ data: { version } });
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

    // Get current content for backup version
    const currentSegments = await draftSegmentStore.getByChapter(version.chapterId);
    const currentContent = currentSegments.map((s) => s.content).join('\n\n');

    // Create backup of current state
    await versionStore.create({
      projectId: version.projectId,
      chapterId: version.chapterId,
      label: `恢复前版本`,
      type: 'manual',
      source: 'restore-backup',
      summary: `恢复到版本: ${version.label}`,
      snapshotContent: currentContent,
      wordCount: currentContent.length,
      isCurrent: false,
    });

    // Restore the selected version's content
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

    // Mark restored version as current
    await versionStore.restore(versionId);

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

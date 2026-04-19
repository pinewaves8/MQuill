import { NextResponse } from 'next/server';
import { chapterStore, draftSegmentStore, versionStore } from '@/lib/db/projects-store';

interface RouteParams {
  params: Promise<{ versionId: string }>;
}

// POST /api/versions/:id/restore - Restore a version using the explicit route expected by the UI
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { versionId } = await params;
    const version = await versionStore.getById(versionId);

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const currentSegments = await draftSegmentStore.getByChapter(version.chapterId);
    await versionStore.restore(versionId);

    for (const segment of currentSegments) {
      await draftSegmentStore.update(segment.id, {
        content: '',
        isLocked: false,
      });
    }

    await draftSegmentStore.upsert({
      projectId: version.projectId,
      chapterId: version.chapterId,
      segmentIndex: 0,
      content: version.snapshotContent,
      source: 'manual',
      isLocked: false,
    });

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
    return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
  }
}

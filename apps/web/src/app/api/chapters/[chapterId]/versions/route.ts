import { NextResponse } from 'next/server';
import { versionStore, draftSegmentStore, chapterStore } from '@/lib/db/projects-store';
import { SnapshotVersionSchema } from '@/lib/validation/schemas';

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
    const url = new URL(request.url);
    const includeLineage = url.searchParams.get('includeLineage') === 'true';

    const versions = await versionStore.getByChapter(chapterId);
    const currentVersion = await versionStore.getCurrentByChapter(chapterId);

    // If current version exists and lineage requested, get the lineage
    let lineage: typeof versions = [];
    if (currentVersion && includeLineage) {
      lineage = await versionStore.getVersionLineage(currentVersion.id);
    }

    return NextResponse.json({
      data: {
        versions,
        currentVersion,
        lineage,
      },
    });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

// POST /api/chapters/:id/versions/snapshot - Create a manual snapshot
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { chapterId } = await params;
    const body = await request.json();

    // Validate input
    const parseResult = SnapshotVersionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error },
        { status: 400 }
      );
    }

    const { label, summary, source, metricsSnapshot } = parseResult.data;

    // Get chapter to verify it exists and get projectId
    const chapter = await chapterStore.getById(chapterId);
    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // Get current draft content
    const segments = await draftSegmentStore.getByChapter(chapterId);
    const snapshotContent = segments.map((s) => s.content).join('\n\n');

    if (snapshotContent.length < 10) {
      return NextResponse.json(
        { error: 'Content too short to snapshot' },
        { status: 400 }
      );
    }

    const version = await versionStore.createSnapshot({
      chapterId,
      projectId: chapter.projectId,
      label,
      summary,
      source: source || 'manual-save',
      snapshotContent,
      wordCount: snapshotContent.length,
      metricsSnapshot,
    });

    return NextResponse.json({ data: { version } });
  } catch (error) {
    console.error('Error creating snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}

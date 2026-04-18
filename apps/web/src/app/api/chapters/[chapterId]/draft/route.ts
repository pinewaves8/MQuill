import { NextResponse } from 'next/server';
import { chapterStore, draftSegmentStore } from '@/lib/db/projects-store';
import { SaveDraftSchema } from '@/lib/validation/schemas';

interface RouteParams {
  params: Promise<{ chapterId: string }>;
}

// GET /api/chapters/:id/draft - Get chapter draft segments
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

    const segments = await draftSegmentStore.getByChapter(chapterId);
    const totalWordCount = segments.reduce((sum, seg) => sum + seg.content.length, 0);

    return NextResponse.json({
      chapterId,
      segments,
      totalWordCount,
    });
  } catch (error) {
    console.error('Error fetching draft:', error);
    return NextResponse.json(
      { error: 'Failed to fetch draft' },
      { status: 500 }
    );
  }
}

// PUT /api/chapters/:id/draft - Save chapter draft segments
export async function PUT(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { chapterId } = await params;
    const body = await request.json();
    const result = SaveDraftSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues },
        { status: 400 }
      );
    }

    if (result.data.chapterId !== chapterId) {
      return NextResponse.json(
        { error: 'Chapter ID mismatch' },
        { status: 400 }
      );
    }

    const chapter = await chapterStore.getById(chapterId);
    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // Upsert each segment
    const projectId = chapter.projectId;
    for (const seg of result.data.segments) {
      if (seg.id) {
        // Update existing segment
        await draftSegmentStore.update(seg.id, {
          content: seg.content,
          source: seg.source,
          isLocked: seg.isLocked,
        });
      } else {
        // Create new segment
        await draftSegmentStore.upsert({
          projectId,
          chapterId,
          sceneId: seg.sceneId,
          segmentIndex: seg.segmentIndex,
          content: seg.content,
          source: seg.source,
          isLocked: seg.isLocked,
        });
      }
    }

    // Calculate total word count
    const segments = await draftSegmentStore.getByChapter(chapterId);
    const totalWordCount = segments.reduce((sum, s) => sum + s.content.length, 0);

    // Update chapter word count and status
    await chapterStore.update(chapterId, {
      wordCount: totalWordCount,
      status: totalWordCount > 0 ? 'drafting' : chapter.status,
    });

    return NextResponse.json({
      chapterId,
      segments,
      totalWordCount,
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    return NextResponse.json(
      { error: 'Failed to save draft' },
      { status: 500 }
    );
  }
}

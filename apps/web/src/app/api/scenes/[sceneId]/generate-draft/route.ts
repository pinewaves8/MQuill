import { NextResponse } from 'next/server';
import { sceneStore, draftSegmentStore } from '@/lib/db/projects-store';
import { writerAgent } from '@/lib/agents/writer-agent';

interface RouteParams {
  params: Promise<{ sceneId: string }>;
}

// POST /api/scenes/:id/generate-draft - Generate draft from scene
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { sceneId } = await params;
    const scene = await sceneStore.getById(sceneId);

    if (!scene) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    // Get existing segments to determine index
    const existingSegments = await draftSegmentStore.getByChapter(scene.chapterId);
    const segmentIndex = existingSegments.length;

    // Call writer agent to generate draft
    const result = await writerAgent({
      projectId: scene.projectId,
      chapterId: scene.chapterId,
      scene,
    });

    // Save the generated segment
    const segment = await draftSegmentStore.upsert({
      projectId: scene.projectId,
      chapterId: scene.chapterId,
      sceneId: scene.id,
      segmentIndex,
      content: result.segment.content!,
      source: result.segment.source!,
      isLocked: result.segment.isLocked || false,
    });

    // Update scene status to generated
    await sceneStore.update(sceneId, { status: 'generated' });

    return NextResponse.json({
      data: {
        segment,
        scene: await sceneStore.getById(sceneId),
      },
    });
  } catch (error) {
    console.error('Error generating draft:', error);
    return NextResponse.json(
      { error: 'Failed to generate draft' },
      { status: 500 }
    );
  }
}

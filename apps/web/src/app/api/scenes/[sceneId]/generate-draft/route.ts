import { NextResponse } from 'next/server';
import { sceneStore, draftSegmentStore, versionStore } from '@/lib/db/projects-store';
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

    // Phase 2: 自动落基线版本
    // 检查该章节是否还没有版本记录，且正文长度超过最小阈值
    const allSegments = await draftSegmentStore.getByChapter(scene.chapterId);
    const totalContent = allSegments.map((s) => s.content).join('\n\n');
    const existingVersions = await versionStore.getByChapter(scene.chapterId);

    if (existingVersions.length === 0 && totalContent.length >= 50) {
      // 创建首个基线版本
      await versionStore.create({
        projectId: scene.projectId,
        chapterId: scene.chapterId,
        label: '初稿 v1',
        type: 'baseline',
        source: 'auto-draft',
        summary: '自动生成正文初稿',
        snapshotContent: totalContent,
        wordCount: totalContent.length,
        isCurrent: true,
        trigger: 'auto_draft',
        stage: 'draft',
      });
    }

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

import { NextResponse } from 'next/server';
import { sceneStore, chapterStore, draftSegmentStore, versionStore } from '@/lib/db/projects-store';
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

    // Get chapter info for chapter-level context
    const chapter = await chapterStore.getById(scene.chapterId);

    // Get all scenes in chapter for scene index/count
    const allScenes = await sceneStore.getByChapter(scene.chapterId);
    const sceneIndex = allScenes.findIndex((s) => s.id === scene.id);
    const sceneCount = allScenes.length;

    // Get existing segments to determine index
    const existingSegments = await draftSegmentStore.getByChapter(scene.chapterId);
    const segmentIndex = existingSegments.length;

    // Call writer agent to generate draft with chapter context
    const result = await writerAgent({
      projectId: scene.projectId,
      chapterId: scene.chapterId,
      scene,
      chapterTitle: chapter?.title,
      chapterGoal: chapter?.summary,
      sceneIndex,
      sceneCount,
    });

    // Ensure content ends at a proper paragraph boundary (not mid-sentence)
    const rawContent = result.segment.content!;
    const processedContent = ensureParagraphBoundary(rawContent);

    // Save the generated segment
    const segment = await draftSegmentStore.upsert({
      projectId: scene.projectId,
      chapterId: scene.chapterId,
      sceneId: scene.id,
      segmentIndex,
      content: processedContent,
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

/**
 * Ensures content ends at a complete paragraph boundary, not mid-sentence.
 * Finds the last paragraph (separated by \n\n) and trims to last complete sentence.
 */
function ensureParagraphBoundary(content: string): string {
  // Split into paragraphs by double newline
  const paragraphs = content.split(/\n\n+/);

  if (paragraphs.length <= 1) {
    // Single paragraph - trim to last complete sentence
    return trimToCompleteSentence(content);
  }

  // Multiple paragraphs - process only the last one
  const allButLast = paragraphs.slice(0, -1);
  const lastParagraph = paragraphs[paragraphs.length - 1];
  const trimmedLast = trimToCompleteSentence(lastParagraph);

  // If trimming removed too much (less than 50% of original), keep original
  if (trimmedLast.length < lastParagraph.length * 0.5 && trimmedLast.length < 20) {
    return content;
  }

  return [...allButLast, trimmedLast].join('\n\n');
}

/**
 * Trims content to the last complete sentence.
 * Complete sentences end with: 。！？；
 */
function trimToCompleteSentence(content: string): string {
  // Find the last occurrence of sentence-ending punctuation
  const sentenceEndings = /[。！？；]/g;
  let lastEndIndex = -1;
  let match;

  while ((match = sentenceEndings.exec(content)) !== null) {
    lastEndIndex = match.index;
  }

  // If no sentence ending found, return original
  if (lastEndIndex === -1) {
    return content;
  }

  // Include the punctuation and trim whitespace after
  const trimmed = content.slice(0, lastEndIndex + 1).trim();

  // If trimmed too short (less than 50% of original), return original
  if (trimmed.length < content.length * 0.5 && trimmed.length < 50) {
    return content;
  }

  return trimmed;
}

import { NextResponse } from 'next/server';
import { revisionStore, revisionCandidateStore, chapterStore, draftSegmentStore } from '@/lib/db/projects-store';

interface RouteParams {
  params: Promise<{ revisionId: string }>;
}

// POST /api/revisions/:id/run - Run a revision task to generate candidates
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  const { revisionId } = await params;

  try {
    const revision = await revisionStore.getById(revisionId);

    if (!revision) {
      return NextResponse.json(
        { error: 'Revision not found' },
        { status: 404 }
      );
    }

    // Update status to running
    await revisionStore.update(revisionId, { status: 'running' });

    // Get the original text based on target scope
    let originalText = '';
    if (revision.targetScope === 'selection' && revision.targetRefId) {
      const segment = await draftSegmentStore.getById(revision.targetRefId);
      originalText = segment?.content || '';
    } else if (revision.targetScope === 'segment' && revision.targetRefId) {
      const segment = await draftSegmentStore.getById(revision.targetRefId);
      originalText = segment?.content || '';
    } else if (revision.targetScope === 'chapter') {
      const segments = await draftSegmentStore.getByChapter(revision.chapterId);
      originalText = segments.map((s) => s.content).join('\n\n');
    }

    // Simulate AI revision (stub - in production, call repair-agent)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate a simple revision candidate
    const revisedText = originalText
      ? `[修订版]\n\n${originalText}\n\n（这是 AI 生成的修订版本，建议：${revision.suggestion}）`
      : '（无原文可修订）';

    // Create the candidate
    const candidate = await revisionCandidateStore.create({
      revisionTaskId: revisionId,
      originalText,
      candidateText: revisedText,
      diffPayload: {
        operations: [
          { type: 'same', text: originalText },
          { type: 'add', text: revisedText.replace(originalText, '') },
        ],
        addedCount: revisedText.length - originalText.length,
        removedCount: 0,
      },
      score: 85.5,
      reviewNotes: 'AI 生成的修订候选，建议人工审核后应用。',
    });

    // Update revision status to reviewed
    await revisionStore.update(revisionId, { status: 'reviewed' });

    return NextResponse.json({
      candidate,
      originalText,
    });
  } catch (error) {
    console.error('Error running revision:', error);
    await revisionStore.update(revisionId, { status: 'draft' });
    return NextResponse.json(
      { error: 'Failed to run revision' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { revisionStore, revisionCandidateStore, draftSegmentStore } from '@/lib/db/projects-store';
import { repairAgent } from '@/lib/agents/repair-agent';

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
    // Priority: 1) originalText from selection, 2) segment content, 3) chapter content
    let originalText = '';
    const segments = await draftSegmentStore.getByChapter(revision.chapterId);

    if (revision.originalText) {
      // User selected text was provided
      originalText = revision.originalText;
    } else if (revision.targetScope === 'selection' && revision.targetRefId) {
      const segment = await draftSegmentStore.getById(revision.targetRefId);
      originalText = segment?.content || '';
    } else if (revision.targetScope === 'segment' && revision.targetRefId) {
      const segment = await draftSegmentStore.getById(revision.targetRefId);
      originalText = segment?.content || '';
    } else if (revision.targetScope === 'chapter') {
      originalText = segments.map((s) => s.content).join('\n\n');
    } else {
      // Fallback: use first editable segment for selection without targetRefId
      const editableSegment = segments.find((s) => !s.isLocked) || segments[0];
      if (editableSegment) {
        originalText = editableSegment.content;
      }
    }

    // Call the repair agent to generate revised text
    const { candidateText, styleNotes } = await repairAgent({
      revision,
      originalText,
      projectId: revision.projectId,
    });

    // Build diff payload from original and candidate
    const diffPayload = buildDiffPayload(originalText, candidateText);

    // Create the candidate
    const candidate = await revisionCandidateStore.create({
      revisionTaskId: revisionId,
      originalText,
      candidateText,
      diffPayload,
      score: calculateScore(originalText, candidateText),
      reviewNotes: styleNotes.length > 0
        ? `修订要点：${styleNotes.join('；')}。`
        : 'AI 生成的修订候选，建议人工审核后应用。',
    });

    // Update revision status to reviewed
    await revisionStore.update(revisionId, { status: 'reviewed' });

    return NextResponse.json({
      data: {
        candidate,
        originalText,
      },
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

function buildDiffPayload(original: string, candidate: string) {
  const ops: Array<{ type: 'add' | 'remove' | 'same'; text: string }> = [];

  // Simple line-based diff for now
  const originalLines = original.split('\n');
  const candidateLines = candidate.split('\n');

  let i = 0, j = 0;
  while (i < originalLines.length || j < candidateLines.length) {
    if (i >= originalLines.length) {
      ops.push({ type: 'add', text: candidateLines[j] });
      j++;
    } else if (j >= candidateLines.length) {
      ops.push({ type: 'remove', text: originalLines[i] });
      i++;
    } else if (originalLines[i] === candidateLines[j]) {
      ops.push({ type: 'same', text: originalLines[i] });
      i++;
      j++;
    } else {
      ops.push({ type: 'remove', text: originalLines[i] });
      ops.push({ type: 'add', text: candidateLines[j] });
      i++;
      j++;
    }
  }

  return {
    operations: ops,
    addedCount: candidate.length - original.length,
    removedCount: original.length - candidate.length,
  };
}

function calculateScore(original: string, candidate: string): number {
  // Simple quality heuristic based on length change ratio
  const ratio = candidate.length / Math.max(original.length, 1);
  if (ratio < 0.5) return 60;
  if (ratio > 2) return 70;
  return 80 + Math.random() * 15;
}

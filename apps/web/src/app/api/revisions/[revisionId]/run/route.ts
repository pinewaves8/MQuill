import { NextResponse } from 'next/server';
import { revisionStore, revisionCandidateStore, draftSegmentStore, issueStore } from '@/lib/db/projects-store';
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

    await revisionStore.update(revisionId, { status: 'running' });

    let originalText = '';
    const segments = await draftSegmentStore.getByChapter(revision.chapterId);

    if (revision.originalText) {
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
      const editableSegment = segments.find((s) => !s.isLocked) || segments[0];
      if (editableSegment) {
        originalText = editableSegment.content;
      }
    }

    const { candidateText, styleNotes } = await repairAgent({
      revision,
      originalText,
      projectId: revision.projectId,
    });

    assertCandidateQuality(originalText, candidateText, revision);

    const diffPayload = buildDiffPayload(originalText, candidateText);

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

    await revisionStore.update(revisionId, { status: 'reviewed' });

    if (revision.linkedIssueId) {
      await issueStore.update(revision.linkedIssueId, { status: 'fixed' });
    }

    return NextResponse.json({
      data: {
        candidate,
        originalText,
      },
    });
  } catch (error) {
    console.error('Error running revision:', error);
    await revisionStore.update(revisionId, { status: 'draft' });
    const revision = await revisionStore.getById(revisionId);
    if (revision?.linkedIssueId) {
      await issueStore.update(revision.linkedIssueId, { status: 'open' });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run revision' },
      { status: 500 }
    );
  }
}

function assertCandidateQuality(
  originalText: string,
  candidateText: string,
  revision: NonNullable<Awaited<ReturnType<typeof revisionStore.getById>>>
): void {
  const originalLength = countChars(originalText);
  const candidateLength = countChars(candidateText);

  if (originalLength === 0 || candidateLength === 0) {
    throw new Error('Revision output is empty');
  }

  const ratio = candidateLength / Math.max(originalLength, 1);
  const minAllowedLength = getMinAllowedLength(originalLength, revision);
  const maxAllowedLength = getMaxAllowedLength(originalLength, revision);

  if (candidateLength < minAllowedLength) {
    throw new Error(
      `Revision output shrank too much (${candidateLength}/${originalLength}, ratio ${ratio.toFixed(2)} < min length ${minAllowedLength})`
    );
  }

  if (candidateLength > maxAllowedLength) {
    throw new Error(
      `Revision output expanded too much (${candidateLength}/${originalLength}, ratio ${ratio.toFixed(2)} > max length ${maxAllowedLength})`
    );
  }
}

function getMinAllowedLength(
  originalLength: number,
  revision: Pick<NonNullable<Awaited<ReturnType<typeof revisionStore.getById>>>, 'applyMode' | 'targetScope'>
): number {
  // append mode: allow pure addition
  if (revision.applyMode === 'append') {
    if (originalLength < 400) {
      return Math.max(originalLength - 40, Math.ceil(originalLength * 0.8), 80);
    }

    return Math.max(originalLength - 80, Math.ceil(originalLength * 0.9));
  }

  // Short text (<200): use absolute difference, not ratio
  // This prevents ratio-based gates from being too sensitive on short snippets
  if (originalLength < 200) {
    return Math.max(originalLength - 30, Math.ceil(originalLength * 0.7), 10);
  }

  // Chapter scope: more lenient (whole chapter rewrite)
  if (revision.targetScope === 'chapter') {
    return Math.ceil(originalLength * 0.9);
  }

  // Long text (>=200): use ratio-based threshold
  return Math.ceil(originalLength * 0.85);
}

function getMaxAllowedLength(
  originalLength: number,
  revision: Pick<NonNullable<Awaited<ReturnType<typeof revisionStore.getById>>>, 'applyMode' | 'targetScope'>
): number {
  // append mode: allow significant addition
  if (revision.applyMode === 'append') {
    return Math.max(
      Math.ceil(originalLength * 1.6),
      originalLength + 150
    );
  }

  // Short text (<200): use absolute difference, not ratio
  if (originalLength < 200) {
    return Math.min(originalLength + 50, Math.ceil(originalLength * 1.8), 200);
  }

  // Chapter scope: more lenient
  if (revision.targetScope === 'chapter') {
    return Math.ceil(originalLength * 1.2);
  }

  // Long text (>=200): use ratio-based threshold
  return Math.ceil(originalLength * 1.35);
}

function countChars(text: string): number {
  return text.replace(/\s+/g, '').length;
}

function buildDiffPayload(original: string, candidate: string) {
  const ops: Array<{ type: 'add' | 'remove' | 'same'; text: string }> = [];
  const originalLines = original.split('\n');
  const candidateLines = candidate.split('\n');

  let i = 0;
  let j = 0;
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
  const ratio = candidate.length / Math.max(original.length, 1);
  if (ratio < 0.75) return 60;
  if (ratio > 1.6) return 70;
  return 80 + Math.random() * 15;
}

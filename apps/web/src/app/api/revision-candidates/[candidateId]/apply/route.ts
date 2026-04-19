import { NextResponse } from 'next/server';
import { revisionCandidateStore, revisionStore, draftSegmentStore, versionStore, chapterStore } from '@/lib/db/projects-store';

interface RouteParams {
  params: Promise<{ candidateId: string }>;
}

// POST /api/revision-candidates/:id/apply - Apply a revision candidate
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { candidateId } = await params;
    const body = await request.json();
    const { mode } = body;

    const candidate = await revisionCandidateStore.getById(candidateId);
    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    const revision = await revisionStore.getById(candidate.revisionTaskId);
    if (!revision) {
      return NextResponse.json(
        { error: 'Revision task not found' },
        { status: 404 }
      );
    }

    // Create a version record before applying
    const chapter = await chapterStore.getById(revision.chapterId);
    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // Get current content for snapshot
    const segments = await draftSegmentStore.getByChapter(revision.chapterId);
    const currentContent = segments.map((s) => s.content).join('\n\n');

    await versionStore.create({
      projectId: revision.projectId,
      chapterId: revision.chapterId,
      label: `修订前版本`,
      type: 'revision',
      source: `revision:${revision.id}`,
      summary: `修订建议: ${revision.suggestion}`,
      snapshotContent: currentContent,
      wordCount: currentContent.length,
      isCurrent: false,
    });

    // Apply the candidate based on mode
    if (mode === 'replace' || mode === 'append') {
      // Determine target segment
      let targetSegmentId = revision.targetRefId;
      let targetSegmentIndex = -1;

      if (!targetSegmentId) {
        // No targetRefId provided - use the first non-locked segment or first segment
        const editableSegments = segments.filter((s) => !s.isLocked);
        if (editableSegments.length > 0) {
          targetSegmentId = editableSegments[0].id;
          targetSegmentIndex = editableSegments[0].segmentIndex;
        } else if (segments.length > 0) {
          targetSegmentId = segments[0].id;
          targetSegmentIndex = segments[0].segmentIndex;
        }
      }

      if (targetSegmentId) {
        const seg = segments.find((s) => s.id === targetSegmentId);
        const originalContent = seg?.content || '';

        if (mode === 'replace') {
          // Find the original text within the segment and replace it precisely
          // candidate.originalText is the user's selected text
          // candidate.candidateText is the revised version
          if (candidate.originalText && originalContent.includes(candidate.originalText)) {
            // Precise replacement: only replace the selected portion
            const newContent = originalContent.replace(candidate.originalText, candidate.candidateText);
            await draftSegmentStore.update(targetSegmentId, {
              content: newContent,
              source: 'ai',
            });
          } else {
            // Fallback: if original text not found exactly, try to find and replace
            // This handles cases where whitespace might differ
            const escapedOriginal = candidate.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedOriginal, 'g');
            if (regex.test(originalContent)) {
              const newContent = originalContent.replace(regex, candidate.candidateText);
              await draftSegmentStore.update(targetSegmentId, {
                content: newContent,
                source: 'ai',
              });
            } else {
              // Last resort: just replace the entire segment
              await draftSegmentStore.update(targetSegmentId, {
                content: candidate.candidateText,
                source: 'ai',
              });
            }
          }
        } else if (mode === 'append') {
          // Append candidate after the original text within the segment
          if (candidate.originalText && originalContent.includes(candidate.originalText)) {
            const newContent = originalContent.replace(candidate.originalText, candidate.originalText + '\n\n' + candidate.candidateText);
            await draftSegmentStore.update(targetSegmentId, {
              content: newContent,
              source: 'ai',
            });
          } else {
            // Fallback: just append to end
            await draftSegmentStore.update(targetSegmentId, {
              content: originalContent + '\n\n' + candidate.candidateText,
              source: 'ai',
            });
          }
        }
      } else {
        // No segment exists, create one
        await draftSegmentStore.upsert({
          projectId: revision.projectId,
          chapterId: revision.chapterId,
          segmentIndex: 0,
          content: candidate.candidateText,
          source: 'ai',
          isLocked: false,
        });
      }
    } else if (revision.targetScope === 'chapter') {
      // Replace all segments with single revised content
      for (const seg of segments) {
        await draftSegmentStore.update(seg.id, {
          content: '',
          isLocked: false,
        });
      }
      await draftSegmentStore.upsert({
        projectId: revision.projectId,
        chapterId: revision.chapterId,
        segmentIndex: 0,
        content: candidate.candidateText,
        source: 'ai',
        isLocked: false,
      });
    }
    // 'branch' mode would create a new branch - stub for now

    // Update revision status to applied
    await revisionStore.update(revision.id, { status: 'applied' });

    // Create new current version
    await versionStore.create({
      projectId: revision.projectId,
      chapterId: revision.chapterId,
      label: `修订后版本`,
      type: 'revision',
      source: `revision:${revision.id}`,
      summary: `应用修订建议: ${revision.suggestion}`,
      snapshotContent: candidate.candidateText,
      wordCount: candidate.candidateText.length,
      isCurrent: true,
    });

    // Update chapter word count
    const newSegments = await draftSegmentStore.getByChapter(revision.chapterId);
    const newWordCount = newSegments.reduce((sum, s) => sum + s.content.length, 0);
    await chapterStore.update(revision.chapterId, {
      wordCount: newWordCount,
      status: newWordCount > 0 ? 'drafting' : chapter.status,
    });

    return NextResponse.json({
      data: {
        success: true,
        appliedMode: mode,
      },
    });
  } catch (error) {
    console.error('Error applying candidate:', error);
    return NextResponse.json(
      { error: 'Failed to apply candidate' },
      { status: 500 }
    );
  }
}

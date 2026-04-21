import { NextResponse } from 'next/server';
import {
  chapterStore,
  draftSegmentStore,
  issueStore,
  revisionCandidateStore,
  revisionStore,
  versionStore,
} from '@/lib/db/projects-store';
import { checkNewContentDuplicates, validateContentDuplicates } from '@/lib/validation/content-validator';

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
    const mode = body.mode as 'replace' | 'append' | 'branch';

    const candidate = await revisionCandidateStore.getById(candidateId);
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const revision = await revisionStore.getById(candidate.revisionTaskId);
    if (!revision) {
      return NextResponse.json({ error: 'Revision task not found' }, { status: 404 });
    }

    const chapter = await chapterStore.getById(revision.chapterId);
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const segments = await draftSegmentStore.getByChapter(revision.chapterId);
    const currentContent = segments.map((segment) => segment.content).join('\n\n');
    const currentVersion = await versionStore.getCurrentByChapter(revision.chapterId);

    if (mode === 'branch') {
      const branchVersion = currentVersion
        ? await versionStore.createBranchFromVersion(currentVersion.id, {
            branchName: `修订分支-${Date.now()}`,
            summary: `保留修订候选：${revision.suggestion}`,
            snapshotContent: candidate.candidateText,
            wordCount: candidate.candidateText.length,
          })
        : await versionStore.create({
            projectId: revision.projectId,
            chapterId: revision.chapterId,
            label: `修订分支 ${Date.now().toString().slice(-4)}`,
            type: 'branch',
            source: `revision:${revision.id}`,
            summary: `保留修订候选：${revision.suggestion}`,
            branchName: '修订候选',
            snapshotContent: candidate.candidateText,
            wordCount: candidate.candidateText.length,
            isCurrent: false,
            trigger: 'revision_apply',
            stage: 'revision',
            linkedRevisionId: revision.id,
            linkedIssueIds: revision.linkedIssueId ? [revision.linkedIssueId] : [],
            isBranchHead: true,
          });

      await revisionStore.update(revision.id, { status: 'applied' });

      if (revision.linkedIssueId && branchVersion) {
        await issueStore.update(revision.linkedIssueId, {
          status: 'fixed',
          linkedVersionId: branchVersion.id,
          linkedVersionLabel: branchVersion.label,
          linkedVersionSummary: branchVersion.summary,
        });
        await versionStore.linkIssues(branchVersion.id, [revision.linkedIssueId]);
      }

      return NextResponse.json({
        data: {
          success: true,
          appliedMode: 'branch',
          version: branchVersion,
        },
      });
    }

    const beforeVersion = await versionStore.create({
      projectId: revision.projectId,
      chapterId: revision.chapterId,
      label: `修订前备份${Date.now().toString().slice(-4)}`,
      type: 'revision',
      source: `revision:${revision.id}`,
      summary: `修订前快照：${revision.suggestion}`,
      snapshotContent: currentContent,
      wordCount: currentContent.length,
      isCurrent: false,
      trigger: 'revision_apply',
      stage: 'revision',
      linkedRevisionId: revision.id,
      linkedIssueIds: revision.linkedIssueId ? [revision.linkedIssueId] : [],
      parentId: currentVersion?.id,
    });

    // P0: Gate - Check for duplicate paragraphs before applying revision
    const pendingContent = mode === 'append'
      ? `${currentContent}\n\n${candidate.candidateText}`
      : mode === 'replace'
        ? currentContent.replace(candidate.originalText || '', candidate.candidateText)
        : candidate.candidateText;

    const newDuplicates = checkNewContentDuplicates(currentContent, candidate.candidateText);
    if (newDuplicates.length > 0) {
      const paragraphs = currentContent.split(/\n\n+/).filter(p => p.trim().length > 0);
      const duplicateRatio = newDuplicates.length / Math.max(paragraphs.length, 1);

      if (duplicateRatio > 0.05) {
        return NextResponse.json({
          error: 'Duplicate paragraph gate blocked',
          data: {
            type: 'duplicate_paragraph',
            duplicateCount: newDuplicates.length,
            duplicateRatio,
            samples: newDuplicates.slice(0, 3).map(d => ({
              existingParagraph: d.index1,
              sample: d.sample,
            })),
          },
        }, { status: 422 });
      }
    }

    if (revision.targetScope === 'chapter' && mode === 'replace') {
      for (const segment of segments) {
        await draftSegmentStore.update(segment.id, {
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
    } else if (mode === 'replace' || mode === 'append') {
      const targetSegmentId = resolveTargetSegmentId(segments, revision.targetRefId, candidate.originalText);

      if (targetSegmentId) {
        const targetSegment = segments.find((segment) => segment.id === targetSegmentId);
        const originalContent = targetSegment?.content || '';

        if (mode === 'replace') {
          if (candidate.originalText && originalContent.includes(candidate.originalText)) {
            await draftSegmentStore.update(targetSegmentId, {
              content: originalContent.replace(candidate.originalText, candidate.candidateText),
              source: 'ai',
            });
          } else {
            await draftSegmentStore.update(targetSegmentId, {
              content: candidate.candidateText,
              source: 'ai',
            });
          }
        } else {
          const appendedContent =
            candidate.originalText && originalContent.includes(candidate.originalText)
              ? originalContent.replace(
                  candidate.originalText,
                  `${candidate.originalText}\n\n${candidate.candidateText}`
                )
              : `${originalContent}\n\n${candidate.candidateText}`.trim();

          await draftSegmentStore.update(targetSegmentId, {
            content: appendedContent,
            source: 'ai',
          });
        }
      } else {
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
      for (const segment of segments) {
        await draftSegmentStore.update(segment.id, {
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

    await revisionStore.update(revision.id, { status: 'applied' });

    const newSegments = await draftSegmentStore.getByChapter(revision.chapterId);
    const newContent = newSegments.map((segment) => segment.content).join('\n\n');
    const appliedVersion = await versionStore.create({
      projectId: revision.projectId,
      chapterId: revision.chapterId,
      label: `修订后版本${Date.now().toString().slice(-4)}`,
      type: 'revision',
      source: `revision:${revision.id}`,
      summary: `应用修订建议：${revision.suggestion}`,
      snapshotContent: newContent,
      wordCount: newContent.length,
      isCurrent: true,
      trigger: 'revision_apply',
      stage: 'revision',
      linkedRevisionId: revision.id,
      linkedIssueIds: revision.linkedIssueId ? [revision.linkedIssueId] : [],
      parentId: beforeVersion.id,
    });

    const newWordCount = newSegments.reduce((sum, segment) => sum + segment.content.length, 0);
    await chapterStore.update(revision.chapterId, {
      wordCount: newWordCount,
      status: newWordCount > 0 ? 'drafting' : chapter.status,
    });

    if (revision.linkedIssueId) {
      await issueStore.update(revision.linkedIssueId, {
        status: 'fixed',
        linkedVersionId: appliedVersion.id,
        linkedVersionLabel: appliedVersion.label,
        linkedVersionSummary: appliedVersion.summary,
      });
      await versionStore.linkIssues(appliedVersion.id, [revision.linkedIssueId]);
    }

    return NextResponse.json({
      data: {
        success: true,
        appliedMode: mode,
        version: appliedVersion,
      },
    });
  } catch (error) {
    console.error('Error applying candidate:', error);
    return NextResponse.json({ error: 'Failed to apply candidate' }, { status: 500 });
  }
}

function resolveTargetSegmentId(
  segments: Array<{ id: string; content: string; isLocked: boolean }>,
  targetRefId?: string,
  originalText?: string
): string | undefined {
  if (targetRefId) {
    return targetRefId;
  }

  const normalizedOriginalText = originalText?.trim();
  if (normalizedOriginalText) {
    const matchingSegment = segments.find((segment) => segment.content.includes(normalizedOriginalText));
    if (matchingSegment) {
      return matchingSegment.id;
    }
  }

  const editableSegment = segments.find((segment) => !segment.isLocked);
  if (editableSegment) {
    return editableSegment.id;
  }

  return segments[0]?.id;
}

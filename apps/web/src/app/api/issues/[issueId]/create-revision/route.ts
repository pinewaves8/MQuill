import { NextResponse } from 'next/server';
import { issueStore, revisionStore } from '@/lib/db/projects-store';

interface RouteParams {
  params: Promise<{ issueId: string }>;
}

// POST /api/issues/:id/create-revision - Create a revision from an issue
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { issueId } = await params;
    const issue = await issueStore.getById(issueId);

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { suggestion, goals, constraints } = body;

    const revision = await revisionStore.create({
      projectId: issue.projectId,
      chapterId: issue.chapterId,
      targetScope: issue.locationRef ? 'segment' : 'chapter',
      targetRefId: issue.locationRef,
      originalText: issue.excerpt,
      suggestion: suggestion || issue.suggestion || `修复问题: ${issue.title}`,
      goals: goals || [],
      constraints: constraints || [],
      applyMode: 'replace',
      status: 'draft',
      linkedIssueId: issue.id,
      issueContext: {
        excerpt: issue.excerpt,
        reason: issue.reason,
        suggestion: issue.suggestion,
        tags: issue.tags,
        severity: issue.severity,
        paragraphIndex: issue.paragraphIndex,
      },
      createdBy: 'agent',
    });

    await issueStore.update(issueId, { status: 'in_revision' });

    return NextResponse.json({
      data: {
        revision,
        issue: await issueStore.getById(issueId),
      },
    });
  } catch (error) {
    console.error('Error creating revision from issue:', error);
    return NextResponse.json(
      { error: 'Failed to create revision from issue' },
      { status: 500 }
    );
  }
}

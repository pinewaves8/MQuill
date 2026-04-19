import { NextResponse } from 'next/server';
import { issueStore } from '@/lib/db/projects-store';
import { CreateIssueSchema } from '@/lib/validation/schemas';

// GET /api/issues - List issues by chapterId or projectId
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');
    const projectId = searchParams.get('projectId');

    if (!chapterId && !projectId) {
      return NextResponse.json(
        { error: 'chapterId or projectId is required' },
        { status: 400 }
      );
    }

    if (chapterId) {
      const issues = await issueStore.getByChapter(chapterId);
      return NextResponse.json({ data: { issues } });
    }

    // For project-level query, would need to add method to store
    return NextResponse.json({ data: { issues: [] } });
  } catch (error) {
    console.error('Error fetching issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}

// POST /api/issues - Create a new issue
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = CreateIssueSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues },
        { status: 400 }
      );
    }

    const input = result.data;

    const issue = await issueStore.create({
      projectId: input.projectId,
      chapterId: input.chapterId,
      issueType: input.issueType,
      severity: input.severity,
      title: input.title,
      reason: input.reason,
      locationRef: input.locationRef,
      suggestion: input.suggestion,
      status: 'open',
      tags: input.tags,
      revisionLevel: input.revisionLevel,
      aiSmellSeverity: input.aiSmellSeverity,
    });

    return NextResponse.json({ data: { issue } }, { status: 201 });
  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Failed to create issue' },
      { status: 500 }
    );
  }
}

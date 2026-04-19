import { NextResponse } from 'next/server';
import { issueStore, revisionStore } from '@/lib/db/projects-store';
import { UpdateIssueSchema } from '@/lib/validation/schemas';

interface RouteParams {
  params: Promise<{ issueId: string }>;
}

// GET /api/issues/:id - Get a single issue
export async function GET(
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

    return NextResponse.json({ data: { issue } });
  } catch (error) {
    console.error('Error fetching issue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issue' },
      { status: 500 }
    );
  }
}

// PATCH /api/issues/:id - Update an issue
export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { issueId } = await params;
    const body = await request.json();
    const result = UpdateIssueSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues },
        { status: 400 }
      );
    }

    const issue = await issueStore.update(issueId, result.data);

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { issue } });
  } catch (error) {
    console.error('Error updating issue:', error);
    return NextResponse.json(
      { error: 'Failed to update issue' },
      { status: 500 }
    );
  }
}

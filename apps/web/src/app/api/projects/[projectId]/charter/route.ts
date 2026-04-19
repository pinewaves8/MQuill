import { NextResponse } from 'next/server';
import { projectStore } from '@/lib/db/projects-store';
import { loadCollection } from '@/lib/db/file-storage';
import { ProjectCharter } from '@packages/shared-types';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/:id/charter - Get project charter
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;

    // Get charter from file storage directly
    const allCharters = loadCollection<ProjectCharter>('charters');
    const charter = allCharters.find(c => c.projectId === projectId);

    if (!charter) {
      return NextResponse.json({ data: { charter: null } });
    }

    return NextResponse.json({ data: { charter } });
  } catch (error) {
    console.error('Error fetching charter:', error);
    return NextResponse.json(
      { error: 'Failed to fetch charter' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { chapterStore, versionStore } from '@/lib/db/projects-store';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/:id/versions - Aggregate chapters and versions for the workbench
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const url = new URL(request.url);
    const chapterId = url.searchParams.get('chapterId');
    const type = url.searchParams.get('type');
    const branchOnly = url.searchParams.get('branchOnly') === 'true';

    const chapters = await chapterStore.getByProject(projectId);
    const resolvedChapterId = chapterId || chapters[0]?.id || null;
    const versions = resolvedChapterId
      ? await versionStore.getByChapter(resolvedChapterId)
      : await versionStore.getByProject(projectId);

    const filteredVersions = versions.filter((version) => {
      if (branchOnly && version.type !== 'branch') return false;
      if (type && version.type !== type) return false;
      return true;
    });

    return NextResponse.json({
      data: {
        chapters,
        selectedChapterId: resolvedChapterId,
        versions: filteredVersions,
      },
    });
  } catch (error) {
    console.error('Error fetching project versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project versions' },
      { status: 500 }
    );
  }
}

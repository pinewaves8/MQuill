import { NextResponse } from 'next/server';
import { projectStore, writingProgressStore, chapterStore, draftSegmentStore } from '@/lib/db/projects-store';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/:projectId/progress - Get writing progress stats
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;

    const project = await projectStore.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const chapters = await chapterStore.getByProject(projectId);
    let currentWordCount = 0;
    for (const chapter of chapters) {
      currentWordCount += chapter.wordCount || 0;
    }

    const dailyProgress = await writingProgressStore.getByProject(projectId);
    const stats = await writingProgressStore.getStats(projectId);

    // Calculate target word count based on targetLength
    const targetWordCountMap = { short: 30000, mid: 65000, long: 100000 };
    const targetWordCount = targetWordCountMap[project.targetLength] || 100000;

    return NextResponse.json({
      projectId,
      targetWordCount,
      currentWordCount,
      progress: Math.round((currentWordCount / targetWordCount) * 100),
      dailyProgress: dailyProgress.slice(0, 30), // Last 30 days
      stats,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

// POST /api/projects/:projectId/progress - Record daily progress
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    const { wordsWritten } = body;
    if (typeof wordsWritten !== 'number' || wordsWritten < 0) {
      return NextResponse.json({ error: 'Invalid wordsWritten' }, { status: 400 });
    }

    const project = await projectStore.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Calculate total words from all chapters
    const chapters = await chapterStore.getByProject(projectId);
    let currentWordCount = 0;
    for (const chapter of chapters) {
      currentWordCount += chapter.wordCount || 0;
    }

    const today = new Date().toISOString().split('T')[0];
    const progress = await writingProgressStore.upsertDay(projectId, today, wordsWritten, currentWordCount);

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Error recording progress:', error);
    return NextResponse.json({ error: 'Failed to record progress' }, { status: 500 });
  }
}
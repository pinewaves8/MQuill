import { NextResponse } from 'next/server';
import { projectStore } from '@/lib/db/projects-store';
import { loadCollection, saveCollection } from '@/lib/db/file-storage';
import { BookOutline } from '@packages/shared-types';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/:id/outline - Get project outline
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

    const outlines = loadCollection<BookOutline>('outlines');
    const outline = outlines.find(o => o.projectId === projectId);

    return NextResponse.json({ outline: outline || null });
  } catch (error) {
    console.error('Error fetching outline:', error);
    return NextResponse.json({ error: 'Failed to fetch outline' }, { status: 500 });
  }
}

// POST /api/projects/:id/outline - Save project outline
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    const project = await projectStore.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const outlines = loadCollection<BookOutline>('outlines');
    const existingIndex = outlines.findIndex(o => o.projectId === projectId);

    const outline: BookOutline = {
      projectId,
      volumes: body.volumes || [],
      createdAt: existingIndex >= 0 ? outlines[existingIndex].createdAt : new Date(),
      updatedAt: new Date(),
    };

    if (existingIndex >= 0) {
      outlines[existingIndex] = outline;
    } else {
      outlines.push(outline);
    }

    saveCollection('outlines', outlines);

    return NextResponse.json({ outline });
  } catch (error) {
    console.error('Error saving outline:', error);
    return NextResponse.json({ error: 'Failed to save outline' }, { status: 500 });
  }
}

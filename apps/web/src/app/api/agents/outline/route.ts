import { NextResponse } from 'next/server';
import { projectStore, chapterStore } from '@/lib/db/projects-store';
import { loadCollection, saveCollection } from '@/lib/db/file-storage';
import { ProjectCharter, BookOutline } from '@packages/shared-types';
import { outlineAgent } from '@/lib/agents/outline-agent';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await projectStore.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get charter if exists
    const allCharters = loadCollection<ProjectCharter>('charters');
    const charter = allCharters.find(c => c.projectId === projectId) || null;

    const outline = await outlineAgent(project, charter);

    // Save outline to storage
    const outlines = loadCollection<BookOutline>('outlines');
    const existingIndex = outlines.findIndex(o => o.projectId === projectId);

    const bookOutline: BookOutline = {
      projectId,
      volumes: outline.volumes,
      createdAt: existingIndex >= 0 ? outlines[existingIndex].createdAt : new Date(),
      updatedAt: new Date(),
    };

    if (existingIndex >= 0) {
      outlines[existingIndex] = bookOutline;
    } else {
      outlines.push(bookOutline);
    }

    saveCollection('outlines', outlines);

    return NextResponse.json({ outline: bookOutline });
  } catch (error) {
    console.error('Error generating outline:', error);
    return NextResponse.json({ error: 'Failed to generate outline' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { projectStore, chapterStore } from '@/lib/db/projects-store';
import { loadCollection } from '@/lib/db/file-storage';
import { ProjectCharter } from '@packages/shared-types';
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

    // Optionally create chapters based on outline
    // For now, just return the outline
    return NextResponse.json({ outline });
  } catch (error) {
    console.error('Error generating outline:', error);
    return NextResponse.json({ error: 'Failed to generate outline' }, { status: 500 });
  }
}

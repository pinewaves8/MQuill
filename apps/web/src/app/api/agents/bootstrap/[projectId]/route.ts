import { NextResponse } from 'next/server';
import { projectStore, memoryStore } from '@/lib/db/projects-store';
import { bootstrapAgent } from '@/lib/agents/bootstrap-agent';
import { loadCollection } from '@/lib/db/file-storage';
import { Project } from '@packages/shared-types';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// POST /api/agents/bootstrap/:projectId - Bootstrap a project with charter and memories
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;

    // Check raw file data
    const allProjects = loadCollection<Project>('projects');
    const project = allProjects.find(p => p.id === projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Run bootstrap agent
    const result = await bootstrapAgent({
      projectId,
      title: project.title,
      bookType: project.bookType as 'novel' | 'short' | 'series' | 'nonfiction' | 'poetry',
      targetLength: project.targetLength as 'short' | 'mid' | 'long',
      language: project.language as 'zh' | 'zh-tw' | 'en' | 'ja',
      mode: project.mode as 'auto' | 'co_create' | 'author_driven',
      description: project.description,
      styleKeywords: project.styleKeywords,
    });

    // Update project charter
    await projectStore.updateCharter(projectId, result.charter);

    // Create memories
    const createdMemories = await Promise.all(
      result.memories.map((mem) =>
        memoryStore.create({
          projectId,
          memoryType: mem.memoryType,
          key: mem.key,
          content: mem.content,
          priority: mem.memoryType === 'canon' ? 90 : 70,
          source: 'agent',
        })
      )
    );

    return NextResponse.json({
      data: {
        projectId,
        charter: result.charter,
        memories: createdMemories,
      },
    });
  } catch (error) {
    console.error('Error bootstrapping project:', error);
    return NextResponse.json(
      { error: 'Failed to bootstrap project' },
      { status: 500 }
    );
  }
}

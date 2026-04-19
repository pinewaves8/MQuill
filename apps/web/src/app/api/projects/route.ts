import { NextResponse } from 'next/server';
import { projectStore, chapterStore } from '@/lib/db/projects-store';
import { CreateProjectSchema } from '@/lib/validation/schemas';
import { Language, Project } from '@packages/shared-types';

// GET /api/projects - List all projects
export async function GET() {
  try {
    const projects = await projectStore.getAll();

    // Attach tags to each project
    const projectsWithTags = await Promise.all(
      projects.map(async (project) => {
        const tags = await projectStore.getTags(project.id);
        return {
          ...project,
          tags: tags.map((t) => t.tag),
        };
      })
    );

    return NextResponse.json({ data: { projects: projectsWithTags } });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = CreateProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues },
        { status: 400 }
      );
    }

    const input = result.data;

    // Create project
    const project = await projectStore.create({
      title: input.title,
      bookType: input.bookType,
      targetLength: input.targetLength,
      language: (input.language || 'zh') as Language,
      mode: input.mode,
      status: 'draft',
      description: input.description,
      coverTone: input.coverTone,
      viewpoint: input.viewpoint,
      targetAudience: input.targetAudience,
      styleKeywords: input.styleKeywords || [],
    });

    // Set tags if provided
    if (input.tags && input.tags.length > 0) {
      await projectStore.setTags(project.id, input.tags);
    }

    // Create default chapter
    await chapterStore.create({
      projectId: project.id,
      sortOrder: 0,
      title: '第一章',
      status: 'planned',
    });

    const tags = await projectStore.getTags(project.id);

    return NextResponse.json(
      {
        data: {
          project: {
            ...project,
            tags: tags.map((t) => t.tag),
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

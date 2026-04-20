import { NextResponse } from 'next/server';

import { projectStore } from '@/lib/db/projects-store';
import {
  completeAutoGenJob,
  createAutoGenJob,
  failAutoGenJob,
  getAutoGenJob,
  updateAutoGenJob,
  updateAutoGenJobStep,
} from '@/lib/workflows/autogen-job-store';
import { AutoCreateStepName, runAutoCreateWorkflow } from '@/lib/workflows/auto-create-workflow';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

interface AutoGenOptions {
  targetChapters?: number;
  runEvaluation?: boolean;
  runRevisions?: boolean;
  waitForCompletion?: boolean;
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  const job = getAutoGenJob(jobId);
  if (!job || job.projectId !== projectId) {
    return NextResponse.json({ error: 'Auto-gen job not found' }, { status: 404 });
  }

  return NextResponse.json({ data: { job } });
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  const { projectId } = await params;

  try {
    const project = await projectStore.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const options: AutoGenOptions = {
      targetChapters: body.targetChapters ?? 2,
      runEvaluation: body.runEvaluation !== false,
      runRevisions: body.runRevisions !== false,
      waitForCompletion: body.waitForCompletion === true,
    };

    const apiBase = new URL('/api', request.url).toString();
    const job = createAutoGenJob(projectId);

    if (options.waitForCompletion) {
      const result = await runAutogenJob({
        apiBase,
        jobId: job.id,
        projectId,
        project,
        targetChapters: options.targetChapters ?? 2,
        runEvaluation: options.runEvaluation ?? true,
        runRevisions: options.runRevisions ?? true,
      });

      return NextResponse.json({ data: { jobId: job.id, result } });
    }

    void runAutogenJob({
      apiBase,
      jobId: job.id,
      projectId,
      project,
      targetChapters: options.targetChapters ?? 2,
      runEvaluation: options.runEvaluation ?? true,
      runRevisions: options.runRevisions ?? true,
    });

    return NextResponse.json(
      {
        data: {
          jobId: job.id,
          status: job.status,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Error starting auto-gen workflow:', error);
    await projectStore.update(projectId, { status: 'paused' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start auto-gen workflow' },
      { status: 500 }
    );
  }
}

async function runAutogenJob({
  apiBase,
  jobId,
  projectId,
  project,
  targetChapters,
  runEvaluation,
  runRevisions,
}: {
  apiBase: string;
  jobId: string;
  projectId: string;
  project: NonNullable<Awaited<ReturnType<typeof projectStore.getById>>>;
  targetChapters: number;
  runEvaluation: boolean;
  runRevisions: boolean;
}) {
  let currentStep: AutoCreateStepName | undefined;

  try {
    await projectStore.update(projectId, { status: 'bootstrapping' });
    updateAutoGenJob(jobId, { status: 'running' });

    const result = await runAutoCreateWorkflow({
      apiBase,
      project,
      targetChapters,
      runEvaluation,
      runRevisions,
      onStepStart: (step, message) => {
        currentStep = step;
        updateAutoGenJobStep(jobId, step, {
          status: 'running',
          progress: 0,
          message: message ?? '正在处理',
        });
      },
      onStepProgress: (step, progress, message) => {
        currentStep = step;
        updateAutoGenJobStep(jobId, step, {
          status: 'running',
          progress,
          message,
        });
      },
      onStepComplete: (step, message) => {
        currentStep = step;
        updateAutoGenJobStep(jobId, step, {
          status: 'completed',
          progress: 100,
          message: message ?? '已完成',
        });
      },
      onChapterProgress: (message) => {
        updateAutoGenJob(jobId, { chapterProgress: message });
      },
    });

    await projectStore.update(projectId, { status: 'active' });
    completeAutoGenJob(jobId, result);
    return result;
  } catch (error) {
    console.error('Error running auto-gen workflow:', error);
    await projectStore.update(projectId, { status: 'paused' });
    failAutoGenJob(
      jobId,
      error instanceof Error ? error.message : 'Auto-gen workflow failed',
      currentStep
    );
    throw error;
  }
}

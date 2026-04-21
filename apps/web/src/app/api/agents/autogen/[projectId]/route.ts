import { NextResponse } from 'next/server';

import { BookOutline } from '@packages/shared-types';
import { chapterStore, projectStore, versionStore } from '@/lib/db/projects-store';
import { loadCollection } from '@/lib/db/file-storage';
import {
  completeAutoGenJob,
  createAutoGenJob,
  failAutoGenJob,
  getAutoGenJob,
  updateAutoGenJob,
  updateAutoGenJobStep,
} from '@/lib/workflows/autogen-job-store';
import { AutoCreateStepName } from '@/lib/workflows/auto-create-workflow';
import {
  type AutoCreateExecutorMode,
  runUnifiedAutoCreateWorkflow,
  type UnifiedAutoCreateWorkflowResult,
} from '@/lib/workflows/unified-auto-create-workflow';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

interface AutoGenOptions {
  targetChapters?: number;
  runEvaluation?: boolean;
  runRevisions?: boolean;
  waitForCompletion?: boolean;
  useSkillBased?: boolean;
}

export async function GET(request: Request, { params }: RouteParams) {
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

export async function POST(request: Request, { params }: RouteParams) {
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
      useSkillBased: body.useSkillBased !== false,
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
        useSkillBased: options.useSkillBased,
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
      useSkillBased: options.useSkillBased,
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
  useSkillBased,
}: {
  apiBase: string;
  jobId: string;
  projectId: string;
  project: NonNullable<Awaited<ReturnType<typeof projectStore.getById>>>;
  targetChapters: number;
  runEvaluation: boolean;
  runRevisions: boolean;
  useSkillBased?: boolean;
}) {
  let currentStep: AutoCreateStepName | undefined;
  const executorMode: AutoCreateExecutorMode = useSkillBased ? 'skill' : 'prompt';

  try {
    await projectStore.update(projectId, { status: 'bootstrapping' });
    updateAutoGenJob(jobId, { status: 'running' });

    const result = await runUnifiedAutoCreateWorkflow({
      apiBase,
      project,
      targetChapters,
      runEvaluation,
      runRevisions,
      executorMode,
      onStepStart: (step, message) => {
        currentStep = step;
        updateAutoGenJobStep(jobId, step, {
          status: 'running',
          progress: 0,
          message: message ?? 'Running',
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
          message: message ?? 'Completed',
        });
      },
      onChapterProgress: (message) => {
        updateAutoGenJob(jobId, { chapterProgress: message });
      },
    });

    const validation = await validateAutogenResult({
      projectId,
      runEvaluation,
      runRevisions,
      workflowResult: result,
    });

    if (!result.success) {
      throw new Error(validation.failureReason ?? 'Auto-gen workflow returned unsuccessful result');
    }

    if (!validation.ok) {
      throw new Error(validation.failureReason ?? 'Auto-gen workflow did not produce the required artifacts');
    }

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

async function validateAutogenResult({
  projectId,
  runEvaluation,
  runRevisions,
  workflowResult,
}: {
  projectId: string;
  runEvaluation: boolean;
  runRevisions: boolean;
  workflowResult: UnifiedAutoCreateWorkflowResult;
}): Promise<{ ok: boolean; failureReason?: string }> {
  if (!workflowResult.success) {
    return {
      ok: false,
      failureReason: 'Workflow execution reported failure before artifact validation.',
    };
  }

  const charter = await projectStore.getCharter(projectId);
  if (
    !charter ||
    (!charter.theme && !charter.coreConflict && (!charter.styleKeywords || charter.styleKeywords.length === 0))
  ) {
    return { ok: false, failureReason: 'Charter was not persisted.' };
  }

  const outline = loadCollection<BookOutline>('outlines').find((item) => item.projectId === projectId);
  if (!outline || !Array.isArray(outline.volumes) || outline.volumes.length === 0) {
    return { ok: false, failureReason: 'Outline was not persisted.' };
  }

  const chapters = await chapterStore.getByProject(projectId);
  if (chapters.length === 0) {
    return { ok: false, failureReason: 'No chapters were imported into the project.' };
  }

  const versionsByChapter = await Promise.all(chapters.map((chapter) => versionStore.getByChapter(chapter.id)));
  const totalVersions = versionsByChapter.reduce((sum, versions) => sum + versions.length, 0);
  if (totalVersions === 0) {
    return { ok: false, failureReason: 'Initial versions were not created.' };
  }

  const chapterReports = workflowResult.results.chapterReports ?? [];

  if (runEvaluation) {
    const hasEvaluationArtifacts = chapterReports.some((report) => typeof report.issueCount === 'number');
    if (!hasEvaluationArtifacts) {
      return { ok: false, failureReason: 'Evaluation step completed without persisted evaluation artifacts.' };
    }
  }

  if (runRevisions) {
    const hasRevisionArtifacts = chapterReports.some((report) => report.revisedIssues.length > 0);
    if (!hasRevisionArtifacts) {
      return { ok: false, failureReason: 'Revision step completed without any applied revisions.' };
    }
  }

  return { ok: true };
}

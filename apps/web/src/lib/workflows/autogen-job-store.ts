import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

import { AutoCreateWorkflowResult, AutoCreateStepName } from '@/lib/workflows/auto-create-workflow';

export type AutoGenStepStatus = 'waiting' | 'running' | 'completed' | 'error';
export type AutoGenJobStatus = 'queued' | 'running' | 'completed' | 'error';

export interface AutoGenStepState {
  label: string;
  status: AutoGenStepStatus;
  progress: number;
  message?: string;
}

export interface AutoGenJobState {
  id: string;
  projectId: string;
  status: AutoGenJobStatus;
  currentStep: AutoCreateStepName | null;
  steps: Record<AutoCreateStepName, AutoGenStepState>;
  chapterProgress: string | null;
  error: string | null;
  result?: AutoCreateWorkflowResult;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const STEP_DEFINITIONS: Array<{ name: AutoCreateStepName; label: string }> = [
  { name: 'charter', label: '生成 Charter' },
  { name: 'outline', label: '生成大纲' },
  { name: 'import_chapters', label: '导入章节' },
  { name: 'chapters', label: '生成场景与正文' },
  { name: 'evaluation', label: '质量评估' },
  { name: 'revision', label: '修订问题单' },
];

const AUTO_GEN_JOBS_FILE = path.join(process.cwd(), '.data', 'autogen-jobs.json');

const autoGenJobs = new Map<string, AutoGenJobState>();

function loadJobsFromDisk(): void {
  try {
    if (fs.existsSync(AUTO_GEN_JOBS_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUTO_GEN_JOBS_FILE, 'utf-8'));
      for (const [id, job] of Object.entries(data)) {
        autoGenJobs.set(id, job as AutoGenJobState);
      }
    }
  } catch (err) {
    console.error('[AutoGenJobStore] Failed to load jobs from disk:', err);
  }
}

function saveJobsToDisk(): void {
  try {
    const dir = path.dirname(AUTO_GEN_JOBS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const obj = Object.fromEntries(autoGenJobs);
    fs.writeFileSync(AUTO_GEN_JOBS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AutoGenJobStore] Failed to save jobs to disk:', err);
  }
}

// Initialize by loading existing jobs
loadJobsFromDisk();

export function createAutoGenJob(projectId: string): AutoGenJobState {
  const createdAt = new Date().toISOString();
  const steps = STEP_DEFINITIONS.reduce<Record<AutoCreateStepName, AutoGenStepState>>((acc, step) => {
    acc[step.name] = {
      label: step.label,
      status: 'waiting',
      progress: 0,
    };
    return acc;
  }, {} as Record<AutoCreateStepName, AutoGenStepState>);

  const job: AutoGenJobState = {
    id: randomUUID(),
    projectId,
    status: 'queued',
    currentStep: null,
    steps,
    chapterProgress: null,
    error: null,
    createdAt,
    updatedAt: createdAt,
  };

  autoGenJobs.set(job.id, job);
  saveJobsToDisk();
  return job;
}

export function getAutoGenJob(jobId: string): AutoGenJobState | undefined {
  return autoGenJobs.get(jobId);
}

export function updateAutoGenJobStep(
  jobId: string,
  step: AutoCreateStepName,
  updates: Partial<AutoGenStepState> & { status?: AutoGenStepStatus }
): AutoGenJobState | undefined {
  const job = autoGenJobs.get(jobId);
  if (!job) {
    return undefined;
  }

  const nextStatus = updates.status ?? job.steps[step].status;
  const nextProgress = clampProgress(updates.progress ?? job.steps[step].progress);
  job.steps = {
    ...job.steps,
    [step]: {
      ...job.steps[step],
      ...updates,
      status: nextStatus,
      progress: nextProgress,
    },
  };
  job.currentStep = nextStatus === 'completed' ? job.currentStep : step;
  job.status = nextStatus === 'error' ? 'error' : 'running';
  job.updatedAt = new Date().toISOString();
  autoGenJobs.set(jobId, job);
  saveJobsToDisk();
  return job;
}

export function updateAutoGenJob(jobId: string, updates: Partial<AutoGenJobState>): AutoGenJobState | undefined {
  const job = autoGenJobs.get(jobId);
  if (!job) {
    return undefined;
  }

  const nextJob: AutoGenJobState = {
    ...job,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  autoGenJobs.set(jobId, nextJob);
  saveJobsToDisk();
  return nextJob;
}

export function completeAutoGenJob(jobId: string, result: AutoCreateWorkflowResult): AutoGenJobState | undefined {
  const job = autoGenJobs.get(jobId);
  if (!job) {
    return undefined;
  }

  const completedAt = new Date().toISOString();
  const nextJob: AutoGenJobState = {
    ...job,
    status: 'completed',
    currentStep: null,
    chapterProgress: null,
    error: null,
    result,
    completedAt,
    updatedAt: completedAt,
  };
  autoGenJobs.set(jobId, nextJob);
  saveJobsToDisk();
  return nextJob;
}

export function failAutoGenJob(
  jobId: string,
  error: string,
  failedStep?: AutoCreateStepName
): AutoGenJobState | undefined {
  const job = autoGenJobs.get(jobId);
  if (!job) {
    return undefined;
  }

  if (failedStep) {
    job.steps = {
      ...job.steps,
      [failedStep]: {
        ...job.steps[failedStep],
        status: 'error',
        message: error,
      },
    };
  }

  const updatedAt = new Date().toISOString();
  const nextJob: AutoGenJobState = {
    ...job,
    status: 'error',
    currentStep: failedStep ?? job.currentStep,
    error,
    chapterProgress: null,
    updatedAt,
    completedAt: updatedAt,
  };
  autoGenJobs.set(jobId, nextJob);
  saveJobsToDisk();
  return nextJob;
}

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(100, Math.round(progress)));
}

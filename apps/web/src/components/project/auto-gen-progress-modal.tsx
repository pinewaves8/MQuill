'use client';

import { useEffect, useMemo, useState } from 'react';
import { Project } from '@packages/shared-types';

type StepStatusKind = 'waiting' | 'running' | 'completed' | 'error';
type JobStatusKind = 'queued' | 'running' | 'completed' | 'error';
type StepName = 'charter' | 'outline' | 'import_chapters' | 'chapters' | 'evaluation' | 'revision';

interface AutoGenProgressModalProps {
  isOpen: boolean;
  bookTitle: string;
  onCancel: () => void;
  onSwitchToManual: () => void;
  project: Project | null;
  onComplete: (project: Project) => void;
  useSkillBased?: boolean;
}

interface StepStatus {
  label: string;
  status: StepStatusKind;
  progress: number;
  message?: string;
}

interface AutoGenJob {
  id: string;
  status: JobStatusKind;
  currentStep: StepName | null;
  steps: Record<StepName, StepStatus>;
  chapterProgress: string | null;
  error: string | null;
  result?: {
    success?: boolean;
    results: {
      totalWords: number;
      targetTotalWords: number;
      minTotalWords: number;
    };
  };
}

const WORKFLOW_STEPS: StepName[] = [
  'charter',
  'outline',
  'import_chapters',
  'chapters',
  'evaluation',
  'revision',
];

const EMPTY_STEPS: Record<StepName, StepStatus> = {
  charter: { label: '生成 Charter', status: 'waiting', progress: 0 },
  outline: { label: '生成大纲', status: 'waiting', progress: 0 },
  import_chapters: { label: '导入章节', status: 'waiting', progress: 0 },
  chapters: { label: '生成场景与正文', status: 'waiting', progress: 0 },
  evaluation: { label: '质量评估', status: 'waiting', progress: 0 },
  revision: { label: '修订问题单', status: 'waiting', progress: 0 },
};

export function AutoGenProgressModal({
  isOpen,
  bookTitle,
  onCancel,
  onSwitchToManual,
  project,
  onComplete,
  useSkillBased: useSkillBasedProp = true,
}: AutoGenProgressModalProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<AutoGenJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completionHandled, setCompletionHandled] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const useSkillBased = useSkillBasedProp;

  useEffect(() => {
    if (!isOpen || !project) {
      setJobId(null);
      setJob(null);
      setError(null);
      setCompletionHandled(false);
      setHasStarted(false);
      return;
    }

    if (!hasStarted) {
      return;
    }

    let cancelled = false;

    const startJob = async () => {
      try {
        const response = await fetch(`/api/agents/autogen/${project.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetChapters: 2,
            runEvaluation: true,
            runRevisions: true,
            useSkillBased,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Auto-gen workflow failed');
        }

        if (!cancelled) {
          setJobId(payload.data?.jobId ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to start workflow');
        }
      }
    };

    void startJob();

    return () => {
      cancelled = true;
    };
  }, [hasStarted, isOpen, project, useSkillBased]);

  useEffect(() => {
    if (!isOpen || !project || !jobId) {
      return;
    }

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pollJob = async () => {
      try {
        const response = await fetch(`/api/agents/autogen/${project.id}?jobId=${jobId}`, {
          cache: 'no-store',
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to fetch workflow status');
        }

        if (stopped) {
          return;
        }

        const nextJob = payload.data?.job as AutoGenJob | undefined;
        if (!nextJob) {
          throw new Error('Workflow status returned no job payload');
        }

        setJob(nextJob);

        if (nextJob.status === 'running' || nextJob.status === 'queued') {
          timer = setTimeout(() => {
            void pollJob();
          }, 1000);
        }
      } catch (err) {
        if (!stopped) {
          setError(err instanceof Error ? err.message : 'Failed to fetch workflow status');
        }
      }
    };

    void pollJob();

    return () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isOpen, jobId, project]);

  useEffect(() => {
    if (!project || !job || completionHandled || job.status !== 'completed') {
      return;
    }

    if (job.result?.success === false) {
      return;
    }

    setCompletionHandled(true);
    onComplete(project);
  }, [completionHandled, job, onComplete, project]);

  const stepStatuses = useMemo(() => job?.steps ?? EMPTY_STEPS, [job]);
  const chapterProgress = job?.chapterProgress ?? null;
  const summary = job?.result?.results;
  const effectiveError = error ?? job?.error ?? null;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="fade-in w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">AI 正在全自动创作</h3>
          <p className="text-sm text-gray-600">《{bookTitle}》创作中...</p>

          {!hasStarted ? (
            <div className="mt-4">
              <p className="mb-3 text-center text-xs text-gray-500">
                {useSkillBased ? 'Skill 智能创作（实验中）' : '基准测试(HTTP API) 模式'}
              </p>
              {useSkillBased ? (
                <p className="mb-3 text-center text-[11px] text-amber-700">
                  当前推荐优先使用“基准测试(HTTP API)”模式。Skill 模式仍在收敛为统一工作流。
                </p>
              ) : null}
              <button
                onClick={() => setHasStarted(true)}
                className="w-full rounded-xl bg-gray-900 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-800"
              >
                开始生成
              </button>
            </div>
          ) : null}

          {chapterProgress ? <p className="mt-1 text-xs text-gray-500">{chapterProgress}</p> : null}
          {summary ? (
            <p className="mt-1 text-xs text-gray-500">
              当前总字数 {summary.totalWords}，目标 {summary.targetTotalWords}，最低门槛 {summary.minTotalWords}
            </p>
          ) : null}
        </div>

        {effectiveError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {effectiveError}
          </div>
        ) : null}

        <div className="space-y-4">
          {WORKFLOW_STEPS.map((stepName) => {
            const step = stepStatuses[stepName];
            const isComplete = step.status === 'completed';
            const isRunning = step.status === 'running';
            const isError = step.status === 'error';

            return (
              <div key={stepName}>
                <div className="flex items-center justify-between text-sm">
                  <span
                    className={
                      isComplete || isRunning
                        ? 'font-medium text-gray-900'
                        : isError
                          ? 'font-medium text-red-600'
                          : 'text-gray-500'
                    }
                  >
                    {step.label}
                  </span>
                  <span
                    className={
                      isComplete
                        ? 'font-medium text-emerald-600'
                        : isRunning
                          ? 'font-medium text-gray-900'
                          : isError
                            ? 'font-medium text-red-600'
                            : 'font-medium text-gray-400'
                    }
                  >
                    {isComplete ? '完成' : isRunning ? `${step.progress}%` : isError ? '失败' : '等待中'}
                  </span>
                </div>
                {step.message ? <p className="mt-1 text-xs text-gray-500">{step.message}</p> : null}
                <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                  <div
                    className={
                      isComplete
                        ? 'h-2 rounded-full bg-emerald-500 transition-all duration-300'
                        : isRunning
                          ? 'h-2 rounded-full bg-gray-900 transition-all duration-300'
                          : isError
                            ? 'h-2 rounded-full bg-red-500 transition-all duration-300'
                            : 'h-2 rounded-full bg-gray-300 transition-all duration-300'
                    }
                    style={{ width: `${isComplete ? 100 : step.progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            取消生成
          </button>
          <button
            onClick={onSwitchToManual}
            className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            转为人机协作
          </button>
        </div>
      </div>
    </div>
  );
}

import { Project } from '@packages/shared-types';

import {
  AutoCreateStepName,
  AutoCreateWorkflowResult,
  runAutoCreateWorkflow,
} from '@/lib/workflows/auto-create-workflow';
import { createWorkflowExecutor } from '@/lib/workflows/workflow-executor';

export type AutoCreateExecutorMode = 'prompt' | 'skill';

export interface UnifiedAutoCreateWorkflowOptions {
  apiBase: string;
  project: Project;
  targetChapters: number;
  runEvaluation: boolean;
  runRevisions: boolean;
  executorMode: AutoCreateExecutorMode;
  onStepStart?: (step: AutoCreateStepName, message?: string) => void;
  onStepProgress?: (step: AutoCreateStepName, progress: number, message?: string) => void;
  onStepComplete?: (step: AutoCreateStepName, message?: string) => void;
  onChapterProgress?: (message: string | null) => void;
}

export interface UnifiedAutoCreateWorkflowResult extends AutoCreateWorkflowResult {
  executorMode: AutoCreateExecutorMode;
  executorLabel: string;
}

export async function runUnifiedAutoCreateWorkflow(
  options: UnifiedAutoCreateWorkflowOptions
): Promise<UnifiedAutoCreateWorkflowResult> {
  const { executorMode, ...workflowOptions } = options;
  const executor = createWorkflowExecutor(executorMode);
  const result = await runAutoCreateWorkflow({
    ...workflowOptions,
    executor,
  });

  return {
    ...result,
    executorMode,
    executorLabel: executor.label,
  };
}

/**
 * Skill Orchestrator - Main workflow orchestration for skill chain execution
 *
 * Coordinates the full novel creation pipeline:
 * bootstrap → outline → scene-plan → write → evaluate → (revision/rewrite) → ...
 *
 * Implements the iterative loop control:
 * - ≥80 → advance to next chapter
 * - 70-79 → revision loop
 * - 60-69 → rewrite loop
 * - <60 → outline regeneration
 */

import type {
  SkillInputSchema,
  SkillOutputSchema,
  EvaluateSkillOutput,
  QualitySignal,
  ReferenceExample,
  TechniqueDirective,
} from './skill-interface';
import { getSkill, getDownstreamSkills, getUpstreamSkill, getAllSkillIds } from './skill-registry';
import { skillExecutor, type SkillExecutionResult } from './skill-executor';
import {
  computeLoopDecision,
  getNextSkill,
  shouldRetry,
  getNextAttempt,
  type LoopContext,
  type LoopDecision,
} from './skill-loop-controller';

// ============================================================
// Orchestration State
// ============================================================

export interface OrchestrationState {
  projectId: string;
  currentSkillId: string;
  currentChapterId?: string;
  attemptCount: number;
  totalAttempts: number;
  status: 'running' | 'completed' | 'failed' | 'paused';
  history: OrchestrationHistoryEntry[];
}

export interface OrchestrationHistoryEntry {
  timestamp: string;
  skillId: string;
  chapterId?: string;
  action: string;
  decision?: LoopDecision;
  success: boolean;
  error?: string;
}

// ============================================================
// Skill Orchestrator
// ============================================================

export class SkillOrchestrator {
  private state: OrchestrationState | null = null;
  private maxTotalAttempts = 50;

  /**
   * Initialize orchestration for a project
   */
  initialize(projectId: string, startSkillId: string = 'bootstrap-skill'): void {
    this.state = {
      projectId,
      currentSkillId: startSkillId,
      attemptCount: 0,
      totalAttempts: 0,
      status: 'running',
      history: [],
    };
  }

  /**
   * Execute the current skill and determine next step
   */
  async executeCurrentSkill(
    input: SkillInputSchema,
    options?: {
      referenceExamples?: ReferenceExample[];
      techniqueDirectives?: TechniqueDirective[];
    }
  ): Promise<{
    result: SkillExecutionResult;
    nextSkillId: string | null;
    decision: LoopDecision | null;
  }> {
    if (!this.state) {
      throw new Error('Orchestrator not initialized');
    }

    const { currentSkillId, currentChapterId, attemptCount } = this.state;

    // Execute the skill
    const result = await skillExecutor.execute({
      projectId: this.state.projectId,
      skillId: currentSkillId,
      input,
      referenceExamples: options?.referenceExamples,
      techniqueDirectives: options?.techniqueDirectives,
      attemptNumber: attemptCount + 1,
    });

    // Record in history
    this.state.history.push({
      timestamp: new Date().toISOString(),
      skillId: currentSkillId,
      chapterId: currentChapterId,
      action: 'execute',
      success: result.success,
      error: result.error,
    });

    if (!result.success) {
      return {
        result,
        nextSkillId: null,
        decision: null,
      };
    }

    // Determine if evaluation skill was executed - if so, compute loop decision
    let decision: LoopDecision | null = null;
    let nextSkillId: string | null = null;

    if (currentSkillId === 'evaluate-skill' && result.output) {
      // Build loop context from evaluation result
      const loopContext: LoopContext = {
        projectId: this.state.projectId,
        chapterId: currentChapterId || '',
        currentSkillId,
        attemptCount,
        evaluationResult: result.output as EvaluateSkillOutput,
      };

      // Compute decision based on evaluation
      decision = computeLoopDecision(loopContext);

      // Determine next skill based on decision
      nextSkillId = getNextSkill(currentSkillId, decision);

      // Update history with decision
      this.state.history.push({
        timestamp: new Date().toISOString(),
        skillId: currentSkillId,
        chapterId: currentChapterId,
        action: 'loop_decision',
        decision,
        success: true,
      });
    } else {
      // For non-evaluation skills, just advance to downstream
      nextSkillId = getNextSkill(currentSkillId, {
        action: 'advance',
        reason: 'Skill completed successfully',
      });
    }

    // Update state
    if (nextSkillId) {
      this.state.currentSkillId = nextSkillId;
      this.state.attemptCount = 0;
    }

    this.state.totalAttempts++;

    return { result, nextSkillId, decision };
  }

  /**
   * Handle loop iteration (revision/rewrite/reboot)
   */
  async iterate(
    input: SkillInputSchema,
    decision: LoopDecision,
    options?: {
      referenceExamples?: ReferenceExample[];
      techniqueDirectives?: TechniqueDirective[];
    }
  ): Promise<{
    result: SkillExecutionResult;
    nextSkillId: string | null;
    decision: LoopDecision | null;
  }> {
    if (!this.state) {
      throw new Error('Orchestrator not initialized');
    }

    if (decision.action === 'halt') {
      this.state.status = 'failed';
      return {
        result: { success: false, error: decision.reason },
        nextSkillId: null,
        decision,
      };
    }

    if (decision.action === 'advance') {
      // Already handled in executeCurrentSkill
      return this.executeCurrentSkill(input, options);
    }

    // For revise/rewrite/reboot, route to target skill
    const targetSkillId = 'targetSkill' in decision ? decision.targetSkill : null;
    if (!targetSkillId) {
      return {
        result: { success: false, error: 'No target skill for iteration' },
        nextSkillId: null,
        decision,
      };
    }

    // Set current skill to target
    this.state.currentSkillId = targetSkillId;
    this.state.attemptCount = 0;

    return this.executeCurrentSkill(input, options);
  }

  /**
   * Get current orchestration state
   */
  getState(): OrchestrationState | null {
    return this.state;
  }

  /**
   * Get orchestration history
   */
  getHistory(): OrchestrationHistoryEntry[] {
    return this.state?.history ?? [];
  }

  /**
   * Check if orchestration should continue
   */
  shouldContinue(): boolean {
    if (!this.state) return false;
    return this.state.status === 'running' && this.state.totalAttempts < this.maxTotalAttempts;
  }

  /**
   * Mark orchestration as completed
   */
  complete(): void {
    if (this.state) {
      this.state.status = 'completed';
    }
  }

  /**
   * Mark orchestration as failed
   */
  fail(reason: string): void {
    if (this.state) {
      this.state.status = 'failed';
      this.state.history.push({
        timestamp: new Date().toISOString(),
        skillId: this.state.currentSkillId,
        action: 'fail',
        success: false,
        error: reason,
      });
    }
  }

  /**
   * Get skill chain for project initialization
   */
  static getSkillChain(): string[] {
    return ['bootstrap-skill', 'outline-skill', 'scene-plan-skill', 'write-skill', 'evaluate-skill'];
  }

  /**
   * Determine next chapter after current chapter completes
   */
  determineNextChapter(
    currentChapterId: string,
    allChapterIds: string[]
  ): string | null {
    const currentIndex = allChapterIds.indexOf(currentChapterId);
    if (currentIndex === -1 || currentIndex >= allChapterIds.length - 1) {
      return null; // No more chapters
    }
    return allChapterIds[currentIndex + 1];
  }

  /**
   * Reset to beginning of chapter loop (e.g., after rewrite)
   */
  resetToChapterStart(chapterId: string): void {
    if (this.state) {
      this.state.currentChapterId = chapterId;
      this.state.currentSkillId = 'write-skill';
      this.state.attemptCount = 0;
    }
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const skillOrchestrator = new SkillOrchestrator();

// ============================================================
// Convenience Functions
// ============================================================

export async function runSkillPipeline(
  projectId: string,
  startSkillId: string = 'bootstrap-skill'
): Promise<OrchestrationState> {
  const orchestrator = new SkillOrchestrator();
  orchestrator.initialize(projectId, startSkillId);

  while (orchestrator.shouldContinue()) {
    // In a real implementation, this would pull inputs from a queue
    // and execute skills until completion
    break; // Placeholder - actual implementation would loop
  }

  return orchestrator.getState()!;
}

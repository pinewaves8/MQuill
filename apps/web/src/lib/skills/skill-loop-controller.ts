/**
 * Skill Loop Controller - Iterative loop control with quality thresholds
 *
 * Decision logic:
 * - ≥80 overall → mark done, advance to next chapter
 * - 70-79 → trigger revision-skill for targeted fixes
 * - 60-69 → trigger write-skill for regeneration
 * - <60 → trigger outline-skill for structure rework
 *
 * Supports score-based, gate-based, and iterate-or-advance decision modes.
 */

import type { EvaluateSkillOutput, QualitySignal } from './skill-interface';
import { getSkillLoopConfig, getDownstreamSkills, getUpstreamSkill } from './skill-registry';

// ============================================================
// Loop Decision Types
// ============================================================

export type LoopDecision =
  | { action: 'advance'; reason: string } // Quality sufficient, move forward
  | { action: 'revise'; reason: string; targetSkill: string } // Partial rework needed
  | { action: 'rewrite'; reason: string; targetSkill: string } // Significant rework needed
  | { action: 'reboot'; reason: string; targetSkill: string } // Fundamental rework needed
  | { action: 'halt'; reason: string }; // Cannot continue, needs human intervention

export interface LoopContext {
  projectId: string;
  chapterId: string;
  currentSkillId: string;
  attemptCount: number;
  evaluationResult?: EvaluateSkillOutput;
  qualitySignals?: QualitySignal[];
}

// ============================================================
// Score-based Decision Logic
// ============================================================

export interface ScoreThresholds {
  advance: number; // ≥ this score → advance
  revise: number; // ≥ this, < advance → revise
  rewrite: number; // ≥ this, < revise → rewrite
  reboot: number; // < reboot → reboot (usually < 60)
}

const DEFAULT_THRESHOLDS: ScoreThresholds = {
  advance: 80,
  revise: 70,
  rewrite: 60,
  reboot: 50,
};

export function decideFromScores(
  scores: EvaluateSkillOutput['deliverable']['scores'],
  thresholds: Partial<ScoreThresholds> = {},
  decisionLogic: 'score_based' | 'gate_based' | 'iterate_or_advance' = 'score_based'
): LoopDecision {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };

  if (decisionLogic === 'gate_based') {
    return decideFromGate(scores);
  }

  if (decisionLogic === 'iterate_or_advance') {
    const total = typeof scores.total === 'number' ? scores.total : 0;
    if (total >= t.advance) {
      return { action: 'advance', reason: `Score ${total} meets advance threshold (≥${t.advance})` };
    }
    if (total >= t.revise) {
      return { action: 'revise', reason: `Score ${total} requires revision (${t.revise}-${t.advance - 1})`, targetSkill: 'revision-skill' };
    }
    if (total >= t.rewrite) {
      return { action: 'rewrite', reason: `Score ${total} requires rewrite (${t.rewrite}-${t.revise - 1})`, targetSkill: 'write-skill' };
    }
    return { action: 'reboot', reason: `Score ${total} requires structure reboot (<${t.rewrite})`, targetSkill: 'outline-skill' };
  }

  // score_based
  const total = typeof scores.total === 'number' ? scores.total : 0;

  if (total >= t.advance) {
    return {
      action: 'advance',
      reason: `Total score ${total} meets advance threshold (≥${t.advance})`,
    };
  }

  if (total >= t.revise) {
    return {
      action: 'revise',
      reason: `Total score ${total} in revision range (${t.revise}-${t.advance - 1})`,
      targetSkill: 'revision-skill',
    };
  }

  if (total >= t.rewrite) {
    return {
      action: 'rewrite',
      reason: `Total score ${total} in rewrite range (${t.rewrite}-${t.revise - 1})`,
      targetSkill: 'write-skill',
    };
  }

  if (total >= t.reboot) {
    return {
      action: 'reboot',
      reason: `Total score ${total} requires outline rework (${t.reboot}-${t.rewrite - 1})`,
      targetSkill: 'outline-skill',
    };
  }

  return {
    action: 'halt',
    reason: `Total score ${total} below halt threshold (<${t.reboot}). Human review required.`,
  };
}

// ============================================================
// Gate-based Decision Logic
// ============================================================

function decideFromGate(
  scores: EvaluateSkillOutput['deliverable']['scores']
): LoopDecision {
  const gate = (scores as unknown as { gate?: Record<string, { status: string }> }).gate;
  if (!gate) {
    // No gate data, fall back to score-based
    return decideFromScores(scores, DEFAULT_THRESHOLDS, 'score_based');
  }

  const failedGates: string[] = [];
  const warnGates: string[] = [];

  for (const [key, value] of Object.entries(gate)) {
    if (value.status === 'fail') {
      failedGates.push(key);
    } else if (value.status === 'warn') {
      warnGates.push(key);
    }
  }

  if (failedGates.length > 0) {
    return {
      action: 'rewrite',
      reason: `Gate failures: ${failedGates.join(', ')}`,
      targetSkill: 'write-skill',
    };
  }

  if (warnGates.length > 0) {
    return {
      action: 'revise',
      reason: `Gate warnings: ${warnGates.join(', ')}`,
      targetSkill: 'revision-skill',
    };
  }

  return {
    action: 'advance',
    reason: 'All gates passed',
  };
}

// ============================================================
// Quality Signal Based Decision
// ============================================================

export function decideFromQualitySignals(
  qualitySignals: QualitySignal[],
  thresholds: { minPassingScore: number; minSignalCount: number } = { minPassingScore: 70, minSignalCount: 3 }
): LoopDecision {
  const passedSignals = qualitySignals.filter((qs) => qs.passed);
  const failedSignals = qualitySignals.filter((qs) => !qs.passed && qs.score < qs.threshold);

  // All signals must pass
  if (failedSignals.length === 0 && passedSignals.length >= thresholds.minSignalCount) {
    return {
      action: 'advance',
      reason: `All ${passedSignals.length} quality signals passed`,
    };
  }

  // Identify critical failures
  const criticalFailures = failedSignals.filter((qs) => qs.score < qs.threshold * 0.5);
  if (criticalFailures.length > 0) {
    return {
      action: 'reboot',
      reason: `Critical quality failures: ${criticalFailures.map((qs) => qs.dimension).join(', ')}`,
      targetSkill: 'outline-skill',
    };
  }

  const moderateFailures = failedSignals.filter(
    (qs) => qs.score >= qs.threshold * 0.5 && qs.score < qs.threshold
  );
  if (moderateFailures.length > 0) {
    return {
      action: 'rewrite',
      reason: `Moderate quality failures: ${moderateFailures.map((qs) => qs.dimension).join(', ')}`,
      targetSkill: 'write-skill',
    };
  }

  return {
    action: 'revise',
    reason: `Minor quality issues in: ${failedSignals.map((qs) => qs.dimension).join(', ')}`,
    targetSkill: 'revision-skill',
  };
}

// ============================================================
// Main Loop Controller
// ============================================================

export function computeLoopDecision(context: LoopContext): LoopDecision {
  const { currentSkillId, attemptCount, evaluationResult } = context;

  const loopConfig = getSkillLoopConfig(currentSkillId);
  if (!loopConfig) {
    return { action: 'halt', reason: `No loop config found for skill: ${currentSkillId}` };
  }

  const { decision_logic, max_loop_attempts, quality_threshold } = loopConfig;

  // Check if max attempts exceeded
  if (max_loop_attempts && attemptCount >= max_loop_attempts) {
    return {
      action: 'halt',
      reason: `Max loop attempts (${max_loop_attempts}) exceeded for ${currentSkillId}. Human review required.`,
    };
  }

  // No evaluation result means skill hasn't been evaluated yet
  if (!evaluationResult) {
    return { action: 'advance', reason: 'No evaluation result, proceed to evaluation skill' };
  }

  const { scores, decision } = evaluationResult.deliverable;

  // Handle explicit decision from evaluation
  if (decision) {
    switch (decision) {
      case 'pass':
        return { action: 'advance', reason: `Evaluation decision: ${decision}` };
      case 'pass_with_notes':
        return { action: 'revise', reason: `Evaluation decision: ${decision}`, targetSkill: 'revision-skill' };
      case 'partial_rewrite':
        return { action: 'rewrite', reason: `Evaluation decision: ${decision}`, targetSkill: 'write-skill' };
      case 'full_rewrite':
        return { action: 'reboot', reason: `Evaluation decision: ${decision}`, targetSkill: 'outline-skill' };
      case 'human_review':
      case 'gate_fail':
        return { action: 'halt', reason: `Evaluation decision: ${decision}. Human intervention required.` };
    }
  }

  // Compute decision from scores
  const thresholds: Partial<ScoreThresholds> = {};
  if (quality_threshold) {
    thresholds.advance = quality_threshold;
    thresholds.revise = Math.max(50, quality_threshold - 10);
    thresholds.rewrite = Math.max(40, quality_threshold - 20);
  }

  return decideFromScores(
    scores,
    thresholds,
    decision_logic ?? 'score_based'
  );
}

// ============================================================
// Next Skill Routing
// ============================================================

export function getNextSkill(currentSkillId: string, decision: LoopDecision): string | null {
  if (decision.action === 'halt') {
    return null;
  }

  if (decision.action === 'advance') {
    const downstream = getDownstreamSkills(currentSkillId);
    return downstream.length > 0 ? downstream[0] : null;
  }

  // For revise/rewrite/reboot, route to target skill
  if ('targetSkill' in decision && decision.targetSkill) {
    return decision.targetSkill;
  }

  return null;
}

// ============================================================
// Retry Logic
// ============================================================

export function shouldRetry(context: LoopContext): boolean {
  const { currentSkillId, attemptCount } = context;
  const loopConfig = getSkillLoopConfig(currentSkillId);

  if (!loopConfig) return false;

  return loopConfig.retry_on_fail && (!loopConfig.max_loop_attempts || attemptCount < loopConfig.max_loop_attempts);
}

export function getNextAttempt(context: LoopContext): LoopContext {
  return {
    ...context,
    attemptCount: context.attemptCount + 1,
  };
}

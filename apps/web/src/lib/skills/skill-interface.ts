/**
 * Skill Interface - Harness-compliant skill system types
 *
 * Defines the core types for skill-based novel creation system:
 * - Skill definitions with input/output schemas
 * - Reference sample types for Few-Shot learning
 * - Quality signals for loop control
 * - Loop configuration for iterative refinement
 */

// ============================================================
// Reference Sample Types
// ============================================================

export type ReferenceLibraryType = 'narrative-framework' | 'visual-lens' | 'writing-technique';

export interface ReferenceExample {
  id: string;
  title: string;
  category: ReferenceLibraryType;
  content: string;
  technique_tags?: string[];
  source_author?: string;
  source_work?: string;
  quality_score?: number; // 0-100
}

export interface TechniqueDirective {
  technique_id: string;
  technique_name: string;
  application_hint: string;
}

// ============================================================
// Skill Execution Config
// ============================================================

export interface SkillModelConfig {
  provider: 'anthropic' | 'openai' | 'custom';
  model_name: string;
  temperature: number;
  max_tokens: number;
}

export interface RetryPolicy {
  max_attempts: number;
  backoff_multiplier: number;
  retry_on_quality_threshold?: number;
}

export interface ReferenceLibraryConfig {
  library_id: ReferenceLibraryType;
  retrieval_mode: 'semantic' | 'keyword' | 'hybrid';
  max_examples: number;
}

export interface SkillExecutionConfig {
  model: SkillModelConfig;
  prompt_template: string;
  grounding_sources: Array<'lore' | 'narrative' | 'style' | 'memory' | 'constraints' | 'timeline'>;
  reference_library_ids?: ReferenceLibraryType[];
  retry_policy?: RetryPolicy;
}

// ============================================================
// Loop Configuration
// ============================================================

export interface SkillLoopConfig {
  upstream_skill: string | null;
  downstream_skills: string[];
  retry_on_fail: boolean;
  quality_threshold?: number;
  max_loop_attempts?: number;
  decision_logic?: 'iterate_or_advance' | 'gate_based' | 'score_based';
}

// ============================================================
// Quality Signals
// ============================================================

export interface QualitySignal {
  dimension: string;
  score: number;
  threshold: number;
  passed: boolean;
  reasoning?: string;
}

export interface ReferenceUsageReport {
  techniques_used: string[];
  examples_retrieved: string[];
  few_shot_quality: 'excellent' | 'good' | 'fair' | 'poor';
}

// ============================================================
// Base Skill Interface
// ============================================================

export interface BaseSkill {
  skill_id: string;
  skill_name: string;
  description: string;
  version: string;
  input_schema: SkillInputSchema;
  output_schema: SkillOutputSchema;
  execution_config: SkillExecutionConfig;
  loop_config: SkillLoopConfig;
}

// ============================================================
// Skill IO Types
// ============================================================

export type SkillStatus = 'completed' | 'failed' | 'needs_revision' | 'pending';

export interface SkillInputSchema {
  projectId: string;
  reference_style_library_id?: ReferenceLibraryType;
  reference_examples?: ReferenceExample[];
  technique_directives?: TechniqueDirective[];
  [key: string]: unknown;
}

export interface SkillOutputSchema {
  status: SkillStatus;
  deliverable: unknown;
  quality_signals?: QualitySignal[];
  reference_usage?: ReferenceUsageReport;
  error?: string;
}

// ============================================================
// Specific Skill Input/Output Types
// ============================================================

// --- Bootstrap Skill ---
export interface BootstrapSkillInput extends SkillInputSchema {
  title: string;
  bookType: string;
  targetLength: string;
  language?: string;
  tags?: string[];
  description?: string;
}

export interface BootstrapSkillOutput extends SkillOutputSchema {
  deliverable: {
    charter: {
      theme: string;
      coreConflict: string;
      targetAudience: string;
      viewpoint?: string;
      styleKeywords: string[];
      forbiddenRules: string[];
      writingGoals: string[];
    };
    memories: Array<{
      memoryType: 'world' | 'narrative' | 'style' | 'canon';
      key: string;
      content: Record<string, unknown>;
    }>;
  };
}

// --- Outline Skill ---
export interface OutlineSkillInput extends SkillInputSchema {
  projectId: string;
  targetLength?: 'short' | 'mid' | 'long';
  volumeCount?: number;
}

export interface OutlineSkillOutput extends SkillOutputSchema {
  deliverable: {
    volumes: Array<{
      id: string;
      title: string;
      goal: string;
      chapters: Array<{
        id: string;
        title: string;
        chapterGoal: string;
      }>;
    }>;
  };
}

// --- Scene Plan Skill ---
export interface ScenePlanSkillInput extends SkillInputSchema {
  projectId: string;
  chapterId: string;
  chapterTitle: string;
  chapterGoal: string;
}

export interface ScenePlanSkillOutput extends SkillOutputSchema {
  deliverable: {
    scenes: Array<{
      id: string;
      title: string;
      summary: string;
      viewpointCharacterId?: string;
      goal?: string;
      conflict?: string;
      expectedOutcome?: string;
    }>;
  };
}

// --- Write Skill ---
export interface WriteSkillInput extends SkillInputSchema {
  projectId: string;
  chapterId: string;
  sceneId: string;
  scene: {
    id: string;
    title: string;
    summary: string;
    goal?: string;
    conflict?: string;
    expectedOutcome?: string;
  };
  chapterTitle?: string;
  chapterGoal?: string;
  previousContext?: string;
  recentEvents?: string[];
}

export interface WriteSkillOutput extends SkillOutputSchema {
  deliverable: {
    content: string;
    summary: string;
    used_beats?: string[];
    continuity_notes?: string[];
    risk_flags?: string[];
  };
}

// --- Evaluate Skill ---
export interface EvaluateSkillInput extends SkillInputSchema {
  projectId: string;
  chapterId: string;
  content: string;
  chapterGoal?: string;
  keyEvents?: string[];
  mainCharacters?: string[];
}

export interface EvaluateSkillOutput extends SkillOutputSchema {
  deliverable: {
    scores: {
      chapter_goal_completion: number;
      plot_progress_and_causality: number;
      conflict_and_tension: number;
      character_and_voice: number;
      language_and_style: number;
      continuity_and_consistency: number;
      information_and_pacing: number;
      ending_hook: number;
      total: number;
      ai_smell_severity?: 'low' | 'medium' | 'high';
    };
    gate: Record<string, { status: 'pass' | 'warn' | 'fail'; reason: string }>;
    decision: 'pass' | 'pass_with_notes' | 'partial_rewrite' | 'full_rewrite' | 'human_review' | 'gate_fail';
    strengths: string[];
    majorIssues: string[];
    revision: {
      must_fix: Array<{ text: string; excerpt?: string; paragraphIndex?: number }>;
      should_improve: Array<{ text: string; excerpt?: string; paragraphIndex?: number }>;
    };
  };
}

// --- Revision Skill ---
export interface RevisionSkillInput extends SkillInputSchema {
  projectId: string;
  chapterId: string;
  segmentId?: string;
  originalText: string;
  suggestion: string;
  goals?: string[];
  constraints?: string[];
  applyMode?: 'replace' | 'merge' | 'insert';
}

export interface RevisionSkillOutput extends SkillOutputSchema {
  deliverable: {
    revisedContent: string;
    applied: boolean;
    changeSummary: string;
  };
}

// --- Publishability Skill ---
export interface PublishabilitySkillInput extends SkillInputSchema {
  projectId: string;
  title: string;
}

export interface PublishabilitySkillOutput extends SkillOutputSchema {
  deliverable: {
    overall_score: number;
    dimension_scores: {
      plot_coherence: number;
      character_consistency: number;
      language_quality: number;
      thematic_depth: number;
      narrative_drive: number;
    };
    readiness_level: 'ready' | 'needs_revision' | 'not_ready';
    summary: string;
    recommendations: string[];
  };
}

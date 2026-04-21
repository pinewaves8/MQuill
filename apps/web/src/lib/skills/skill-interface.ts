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

export type ReferenceLibraryType =
  | 'narrative-framework'
  | 'visual-lens'
  | 'writing-technique'
  | 'scene-library'
  | 'event-library'
  | 'scene-event-pattern'
  | 'scene-event-example';

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
  priority?: 'high' | 'medium' | 'low';
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

// ============================================================
// Scene Event Library Types
// ============================================================

// Narrative Functions - 叙事功能类型
export type NarrativeFunction =
  | 'introduce_character'
  | 'establish_setting'
  | 'create_hook'
  | 'escalate_conflict'
  | 'create_reversal'
  | 'reveal_information'
  | 'advance_relationship'
  | 'create_crisis'
  | 'plant_foreshadowing'
  | 'payoff_foreshadowing'
  | 'build_climax'
  | 'emotional_beat'
  | 'shift_relationship'
  | 'reveal_truth';

// Event Types - 事件类型
export type EventType =
  | 'encounter'
  | 'revelation'
  | 'confrontation'
  | 'pursuit'
  | 'discovery'
  | 'betrayal'
  | 'sacrifice'
  | 'transformation'
  | 'conflict_escalation'
  | 'relationship_shift'
  | 'information_exchange'
  | 'identity_reveal'
  | 'trap'
  | 'escape'
  | 'negotiation'
  | 'ceremony'
  | 'accident'
  | 'secret_meeting'
  | 'departure'
  | 'reunion';

// Scene Template - 场景原型
export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  genre_tags: string[];
  era_tags: string[];
  location_type: string;
  time_type: string;
  weather: string;
  space_structure: string;
  mood_tags: string[];
  public_private_level: number;
  danger_level: number;
  secrecy_level: number;
  sensory_features: string[];
  social_rules: string[];
  affordances: string[];
  constraints: string[];
  typical_characters: string[];
  common_conflicts: string[];
  common_functions: string[];
  cliché_risk?: number;
  originality_score?: number;
  reference_examples?: string[];
  source_work?: string;
}

// Event Template - 事件原型
export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  genre_tags: string[];
  event_type: EventType;
  trigger_conditions: string[];
  participants: string[];
  participant_count: number;
  core_conflict: string;
  stakes: string;
  information_role: string;
  emotion_curve: string[];
  intensity: number;
  reversibility: number;
  dialogue_density: 'low' | 'medium' | 'high';
  action_density: 'low' | 'medium' | 'high';
  pace_impact: 'slow' | 'steady' | 'fast';
  common_outcomes: string[];
  twist_options: string[];
  cliché_risk?: number;
  originality_score?: number;
}

// Scene-Event Pattern - 场景-事件组合模板
export interface SceneEventPattern {
  id: string;
  name: string;
  description: string;
  scene_id: string;
  event_id: string;
  fit_score: number;
  why_it_works: string;
  typical_usage: string[];
  tone_variants: string[];
  cliché_risk: number;
  subversion_options: string[];
  upgrade_methods: string[];
  example_outline: string;
  effectiveness_score?: number;
  originality_score?: number;
}

// Scene Event Card - 结构化场景事件卡
export interface SceneEventCard {
  id: string;
  title: string;
  narrative_function: NarrativeFunction[];
  location: {
    type: string;
    atmosphere: string;
    sensory_details: string[];
    time: string;
    weather?: string;
  };
  participating_characters: Array<{
    character_id: string;
    role: 'protagonist' | 'antagonist' | 'supporting' | 'incidental';
    viewpoint: boolean;
    emotional_state: string;
  }>;
  objective: string;
  external_conflict: string;
  internal_conflict: string;
  event_trigger: string;
  event_progression: string[];
  key_turning_point: string;
  information_revealed: string[];
  information_hidden: string[];
  emotional_arc: string[];
  pacing_notes: string;
  ending_hook: string;
  tension_level: number;
  cliché_risk_assessment: number;
  originality_elements: string[];
  upgrade_applied: string[];
}

// ============================================================
// Scene Event Skill Input/Output Types
// ============================================================

// Scene Retrieval Skill
export interface SceneRetrievalSkillInput extends SkillInputSchema {
  projectId: string;
  narrative_function?: NarrativeFunction[];
  genre?: string;
  era?: string;
  intensity?: number;
  tone?: string;
  required_affordances?: string[];
  forbidden_location_types?: string[];
  character_count?: number;
  protagonist_emotional_state?: string;
  novelty_weight?: number;
  retrieval_mode?: 'semantic' | 'keyword' | 'hybrid';
  max_results?: number;
}

export interface SceneRetrievalSkillOutput extends SkillOutputSchema {
  deliverable: {
    scenes: SceneTemplate[];
    retrieval_reasoning: string;
    match_scores: Record<string, number>;
  };
}

// Event Retrieval Skill
export interface EventRetrievalSkillInput extends SkillInputSchema {
  projectId: string;
  narrative_function?: NarrativeFunction[];
  event_type?: EventType[];
  genre?: string;
  intensity?: number;
  pace_impact?: 'slow' | 'steady' | 'fast';
  information_role?: string;
  participant_count?: number;
  forbidden_event_types?: EventType[];
  previous_event_id?: string;
  novelty_weight?: number;
  retrieval_mode?: 'semantic' | 'keyword' | 'hybrid';
  max_results?: number;
}

export interface EventRetrievalSkillOutput extends SkillOutputSchema {
  deliverable: {
    events: EventTemplate[];
    retrieval_reasoning: string;
    match_scores: Record<string, number>;
  };
}

// SceneEvent Composer Skill
export interface SceneEventComposerSkillInput extends SkillInputSchema {
  projectId: string;
  chapter_goal: string;
  scene_goal: string;
  required_functions: NarrativeFunction[];
  candidate_scenes?: SceneTemplate[];
  candidate_events?: EventTemplate[];
  candidate_patterns?: SceneEventPattern[];
  character_states: Record<string, {
    emotional_state: string;
    relationship_states: Record<string, string>;
    hidden_secrets: string[];
    goals: string[];
  }>;
  tone_style?: string;
  intensity_target?: number;
  forbidden_cliches?: string[];
  must_include_elements?: string[];
  must_avoid_elements?: string[];
  word_budget?: number;
  candidate_count?: number;
}

export interface SceneEventComposerSkillOutput extends SkillOutputSchema {
  deliverable: {
    candidates: SceneEventCard[];
    selected_variant: 'conservative' | 'dramatic' | 'literary' | 'anti-cliché';
    combination_reasoning: string;
    pattern_usage: Array<{
      pattern_id: string;
      adaptation_notes: string;
    }>;
  };
}

// SceneEvent Polish Skill
export interface SceneEventPolishSkillInput extends SkillInputSchema {
  projectId: string;
  scene_event_card: SceneEventCard;
  polish_goals: Array<{
    goal: 'reduce_cliché' | 'enhance_originality' | 'adjust_tone' | 'strengthen_hook' | 'improve_pacing';
    priority: 'high' | 'medium' | 'low';
    specific_guidance?: string;
  }>;
  novel_style_keywords?: string[];
  forbidden_expressions?: string[];
  required_style_elements?: string[];
  genre?: string;
  intensity_adjustment?: number;
}

export interface SceneEventPolishSkillOutput extends SkillOutputSchema {
  deliverable: {
    polished_card: SceneEventCard;
    applied_polish: Array<{
      original_aspect: string;
      polished_aspect: string;
      technique_used: string;
    }>;
    cliché_mitigation: string[];
    originality_boost: string[];
  };
}

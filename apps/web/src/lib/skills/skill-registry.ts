/**
 * Skill Registry - Harness-compliant skill manifest
 *
 * Central registry of all skills with their loop configurations,
 * execution parameters, and downstream/upstream relationships.
 */

import type {
  BaseSkill,
  SkillLoopConfig,
  SkillExecutionConfig,
  ReferenceLibraryType,
} from './skill-interface';

// ============================================================
// Registry Entry
// ============================================================

export interface SkillRegistryEntry {
  skill: BaseSkill;
  handler: string; // Path to skill implementation handler
}

// ============================================================
// Skill Manifest
// ============================================================

export const SKILL_MANIFEST: Record<string, SkillRegistryEntry> = {};

// ============================================================
// Helper to build execution config
// ============================================================

function buildExecutionConfig(
  modelProvider: 'anthropic' | 'openai' = 'anthropic',
  modelName: string = 'claude-sonnet-4-7',
  temperature: number = 0.7,
  maxTokens: number = 8192,
  groundingSources: SkillExecutionConfig['grounding_sources'] = ['lore', 'narrative', 'style', 'memory', 'constraints', 'timeline'],
  referenceLibraryIds?: ReferenceLibraryType[]
): SkillExecutionConfig {
  return {
    model: {
      provider: modelProvider,
      model_name: modelName,
      temperature,
      max_tokens: maxTokens,
    },
    prompt_template: '', // Set by individual skills
    grounding_sources: groundingSources,
    reference_library_ids: referenceLibraryIds,
  };
}

// ============================================================
// Bootstrap Skill
// ============================================================

const bootstrapSkill: BaseSkill = {
  skill_id: 'bootstrap-skill',
  skill_name: 'Bootstrap Skill',
  description: 'Initial project bootstrapping - generates charter and memory system',
  version: '1.0.0',
  input_schema: {
    projectId: '',
    reference_style_library_id: 'narrative-framework',
  },
  output_schema: {
    status: 'completed',
    deliverable: null,
  },
  execution_config: buildExecutionConfig('anthropic', 'claude-sonnet-4-7', 0.8, 16384, ['lore', 'constraints', 'memory']),
  loop_config: {
    upstream_skill: null,
    downstream_skills: ['outline-skill'],
    retry_on_fail: true,
    quality_threshold: 70,
    max_loop_attempts: 3,
    decision_logic: 'gate_based',
  },
};

SKILL_MANIFEST[bootstrapSkill.skill_id] = {
  skill: bootstrapSkill,
  handler: './skills/bootstrap-skill.ts',
};

// ============================================================
// Outline Skill
// ============================================================

const outlineSkill: BaseSkill = {
  skill_id: 'outline-skill',
  skill_name: 'Outline Skill',
  description: 'Generates book outline with volumes and chapters',
  version: '1.0.0',
  input_schema: {
    projectId: '',
  },
  output_schema: {
    status: 'completed',
    deliverable: null,
  },
  execution_config: buildExecutionConfig(
    'anthropic',
    'claude-sonnet-4-7',
    0.7,
    8192,
    ['lore', 'narrative', 'style', 'constraints', 'timeline'],
    ['narrative-framework']
  ),
  loop_config: {
    upstream_skill: 'bootstrap-skill',
    downstream_skills: ['scene-plan-skill'],
    retry_on_fail: true,
    quality_threshold: 70,
    max_loop_attempts: 3,
    decision_logic: 'gate_based',
  },
};

SKILL_MANIFEST[outlineSkill.skill_id] = {
  skill: outlineSkill,
  handler: './skills/outline-skill.ts',
};

// ============================================================
// Scene Plan Skill
// ============================================================

const scenePlanSkill: BaseSkill = {
  skill_id: 'scene-plan-skill',
  skill_name: 'Scene Plan Skill',
  description: 'Generates scene cards for a chapter',
  version: '1.0.0',
  input_schema: {
    projectId: '',
    chapterId: '',
    chapterTitle: '',
    chapterGoal: '',
  },
  output_schema: {
    status: 'completed',
    deliverable: null,
  },
  execution_config: buildExecutionConfig(
    'anthropic',
    'claude-sonnet-4-7',
    0.7,
    8192,
    ['lore', 'narrative', 'style', 'memory', 'constraints'],
    ['visual-lens', 'writing-technique']
  ),
  loop_config: {
    upstream_skill: 'outline-skill',
    downstream_skills: ['write-skill'],
    retry_on_fail: true,
    quality_threshold: 65,
    max_loop_attempts: 3,
    decision_logic: 'iterate_or_advance',
  },
};

SKILL_MANIFEST[scenePlanSkill.skill_id] = {
  skill: scenePlanSkill,
  handler: './skills/scene-plan-skill.ts',
};

// ============================================================
// Write Skill
// ============================================================

const writeSkill: BaseSkill = {
  skill_id: 'write-skill',
  skill_name: 'Write Skill',
  description: 'Generates chapter content based on scene cards with technique directives',
  version: '1.0.0',
  input_schema: {
    projectId: '',
    chapterId: '',
    sceneId: '',
    scene: {
      id: '',
      title: '',
      summary: '',
      goal: '',
      conflict: '',
      expectedOutcome: '',
    },
  },
  output_schema: {
    status: 'completed',
    deliverable: null,
  },
  execution_config: buildExecutionConfig(
    'anthropic',
    'claude-sonnet-4-7',
    0.75,
    8192,
    ['lore', 'narrative', 'style', 'memory', 'constraints', 'timeline'],
    ['writing-technique', 'visual-lens']
  ),
  loop_config: {
    upstream_skill: 'scene-plan-skill',
    downstream_skills: ['evaluate-skill'],
    retry_on_fail: true,
    quality_threshold: 75,
    max_loop_attempts: 3,
    decision_logic: 'score_based',
  },
};

SKILL_MANIFEST[writeSkill.skill_id] = {
  skill: writeSkill,
  handler: './skills/write-skill.ts',
};

// ============================================================
// Evaluate Skill
// ============================================================

const evaluateSkill: BaseSkill = {
  skill_id: 'evaluate-skill',
  skill_name: 'Evaluate Skill',
  description: 'Evaluates chapter quality with 8-dimension scoring and gate checks',
  version: '1.0.0',
  input_schema: {
    projectId: '',
    chapterId: '',
    content: '',
    chapterGoal: '',
    keyEvents: [],
    mainCharacters: [],
  },
  output_schema: {
    status: 'completed',
    deliverable: null,
  },
  execution_config: buildExecutionConfig(
    'anthropic',
    'claude-sonnet-4-7',
    0.3,
    8192,
    ['lore', 'narrative', 'style', 'constraints']
  ),
  loop_config: {
    upstream_skill: 'write-skill',
    downstream_skills: [], // Decision point - routes to revision, rewrite, or next chapter
    retry_on_fail: false,
    quality_threshold: 80,
    max_loop_attempts: 1,
    decision_logic: 'score_based',
  },
};

SKILL_MANIFEST[evaluateSkill.skill_id] = {
  skill: evaluateSkill,
  handler: './skills/evaluate-skill.ts',
};

// ============================================================
// Revision Skill
// ============================================================

const revisionSkill: BaseSkill = {
  skill_id: 'revision-skill',
  skill_name: 'Revision Skill',
  description: 'Applies targeted revisions to chapter segments',
  version: '1.0.0',
  input_schema: {
    projectId: '',
    chapterId: '',
    segmentId: '',
    originalText: '',
    suggestion: '',
    goals: [],
    constraints: [],
    applyMode: 'replace',
  },
  output_schema: {
    status: 'completed',
    deliverable: null,
  },
  execution_config: buildExecutionConfig(
    'anthropic',
    'claude-sonnet-4-7',
    0.5,
    4096,
    ['lore', 'narrative', 'style', 'memory', 'constraints']
  ),
  loop_config: {
    upstream_skill: 'evaluate-skill',
    downstream_skills: ['evaluate-skill'],
    retry_on_fail: true,
    quality_threshold: 70,
    max_loop_attempts: 2,
    decision_logic: 'iterate_or_advance',
  },
};

SKILL_MANIFEST[revisionSkill.skill_id] = {
  skill: revisionSkill,
  handler: './skills/revision-skill.ts',
};

// ============================================================
// Publishability Skill
// ============================================================

const publishabilitySkill: BaseSkill = {
  skill_id: 'publishability-skill',
  skill_name: 'Publishability Skill',
  description: 'Final publishability assessment of completed manuscript',
  version: '1.0.0',
  input_schema: {
    projectId: '',
    title: '',
  },
  output_schema: {
    status: 'completed',
    deliverable: null,
  },
  execution_config: buildExecutionConfig(
    'anthropic',
    'claude-sonnet-4-7',
    0.4,
    8192,
    ['lore', 'narrative', 'style', 'memory', 'constraints', 'timeline'],
    ['narrative-framework', 'writing-technique']
  ),
  loop_config: {
    upstream_skill: null, // Terminal skill
    downstream_skills: [],
    retry_on_fail: false,
    decision_logic: 'gate_based',
  },
};

SKILL_MANIFEST[publishabilitySkill.skill_id] = {
  skill: publishabilitySkill,
  handler: './skills/publishability-skill.ts',
};

// ============================================================
// Utility Functions
// ============================================================

export function getSkill(skillId: string): SkillRegistryEntry | undefined {
  return SKILL_MANIFEST[skillId];
}

export function getSkillLoopConfig(skillId: string): SkillLoopConfig | undefined {
  return SKILL_MANIFEST[skillId]?.skill.loop_config;
}

export function getDownstreamSkills(skillId: string): string[] {
  return SKILL_MANIFEST[skillId]?.skill.loop_config.downstream_skills ?? [];
}

export function getUpstreamSkill(skillId: string): string | null {
  return SKILL_MANIFEST[skillId]?.skill.loop_config.upstream_skill ?? null;
}

export function getAllSkillIds(): string[] {
  return Object.keys(SKILL_MANIFEST);
}

export function getSkillChain(): string[] {
  return ['bootstrap-skill', 'outline-skill', 'scene-plan-skill', 'write-skill', 'evaluate-skill'];
}

import { z } from 'zod';

// Project validation schemas
export const CreateProjectSchema = z.object({
  title: z.string().min(1).max(200),
  bookType: z.enum(['novel', 'short', 'series', 'nonfiction', 'poetry']),
  targetLength: z.enum(['short', 'mid', 'long']),
  language: z.string().max(16).default('zh'),
  mode: z.enum(['auto', 'co_create', 'author_driven']),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  coverTone: z.string().optional(),
  viewpoint: z.string().optional(),
  targetAudience: z.string().optional(),
  styleKeywords: z.array(z.string()).optional(),
});

export const UpdateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  bookType: z.enum(['novel', 'short', 'series', 'nonfiction', 'poetry']).optional(),
  targetLength: z.enum(['short', 'mid', 'long']).optional(),
  language: z.string().max(16).optional(),
  mode: z.enum(['auto', 'co_create', 'author_driven']).optional(),
  status: z.enum(['draft', 'bootstrapping', 'active', 'paused', 'completed', 'archived']).optional(),
  description: z.string().optional(),
  coverTone: z.string().optional(),
  viewpoint: z.string().optional(),
  targetAudience: z.string().optional(),
  styleKeywords: z.array(z.string()).optional(),
});

// Chapter validation schemas
export const CreateChapterSchema = z.object({
  projectId: z.string().min(1),
  parentVolumeId: z.string().optional(),
  sortOrder: z.number().int().optional(),
  title: z.string().min(1).max(200),
  summary: z.string().optional(),
});

export const UpdateChapterSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().optional(),
  status: z.enum(['planned', 'drafting', 'revising', 'approved', 'done']).optional(),
  sortOrder: z.number().int().optional(),
});

// Scene validation schemas
export const CreateSceneSchema = z.object({
  projectId: z.string().uuid(),
  chapterId: z.string().uuid(),
  title: z.string().min(1).max(200),
  summary: z.string().optional(),
  viewpointCharacterId: z.string().uuid().optional(),
  goal: z.string().optional(),
  conflict: z.string().optional(),
  expectedOutcome: z.string().optional(),
  source: z.enum(['ai', 'manual', 'hybrid']).default('ai'),
  notes: z.string().optional(),
});

export const UpdateSceneSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().optional(),
  viewpointCharacterId: z.string().uuid().optional(),
  goal: z.string().optional(),
  conflict: z.string().optional(),
  expectedOutcome: z.string().optional(),
  status: z.enum(['draft', 'confirmed', 'generated', 'discarded']).optional(),
  notes: z.string().optional(),
});

export const ReorderScenesSchema = z.object({
  chapterId: z.string().uuid(),
  sceneIds: z.array(z.string().uuid()),
});

// Revision validation schemas
export const CreateRevisionSchema = z.object({
  projectId: z.string().uuid(),
  chapterId: z.string().uuid(),
  targetScope: z.enum(['selection', 'segment', 'chapter']).default('selection'),
  targetRefId: z.string().uuid().optional(),
  originalText: z.string().optional(),
  suggestion: z.string().min(1),
  goals: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  applyMode: z.enum(['replace', 'append', 'branch']).default('replace'),
  linkedIssueId: z.string().uuid().optional(),
  createdBy: z.enum(['user', 'agent']).default('user'),
});

// Version validation schemas
export const CreateVersionSchema = z.object({
  chapterId: z.string().uuid(),
  label: z.string().min(1).max(120),
  type: z.enum(['autosave', 'manual', 'revision', 'branch', 'current', 'baseline']).default('manual'),
  source: z.string().optional(),
  summary: z.string().optional(),
  parentId: z.string().uuid().optional(),
  branchName: z.string().max(120).optional(),
  snapshotContent: z.string(),
  wordCount: z.number().int().optional(),
  // Phase 4 扩展字段
  trigger: z.enum([
    'auto_outline',
    'auto_scene_plan',
    'auto_draft',
    'manual_save',
    'revision_apply',
    'restore',
    'branch_create',
  ]).optional(),
  stage: z.enum(['outline', 'scene_plan', 'draft', 'revision']).optional(),
  linkedRevisionId: z.string().uuid().optional(),
  linkedIssueIds: z.array(z.string().uuid()).optional(),
  metricsSnapshot: z.record(z.string(), z.number()).optional(),
  isBranchHead: z.boolean().optional(),
});

// 手动保存版本
export const SnapshotVersionSchema = z.object({
  label: z.string().min(1).max(120),
  summary: z.string().optional(),
  source: z.string().default('manual-save'),
  metricsSnapshot: z.record(z.string(), z.number()).optional(),
});

// 创建分支版本
export const CreateBranchVersionSchema = z.object({
  branchName: z.string().min(1).max(120),
  summary: z.string().optional(),
  metricsSnapshot: z.record(z.string(), z.number()).optional(),
});

export const CompareVersionsSchema = z.object({
  leftVersionId: z.string().uuid(),
  rightVersionId: z.string().uuid(),
});

// Issue validation schemas
// Issue types: legacy 6-dim + new 8-dim evaluation dimensions
const ISSUE_TYPES = [
  // Legacy 6-dim
  'style', 'pacing', 'character', 'lore', 'timeline', 'clarity',
  // 8-dim evaluation dimensions
  'chapter_goal_completion',
  'plot_progress_and_causality',
  'conflict_and_tension',
  'character_and_voice',
  'language_and_style',
  'continuity_and_consistency',
  'information_and_pacing',
  'ending_hook',
  'ai_smell',
] as const;

// Issue tags from design doc
const ISSUE_TAGS = [
  // 剧情类
  'weak_plot_progress', 'causality_gap', 'convenient_plot_device', 'missing_key_event',
  // 冲突类
  'low_tension', 'weak_conflict', 'stakes_too_low',
  // 人物类
  'flat_character_voice', 'character_out_of_role', 'weak_protagonist_agency', 'tool_like_supporting_cast',
  // 语言风格类
  'ai_smell', 'repetitive_expression', 'expository_tone', 'over_abstract_emotion', 'weak_style_alignment',
  // 连贯性类
  'continuity_error', 'worldbuilding_conflict', 'timeline_conflict', 'abrupt_transition',
  // 节奏类
  'pace_too_slow', 'pace_too_fast', 'info_dump', 'underdeveloped_scene',
  // 章节结构类
  'missing_hook', 'chapter_goal_not_met', 'chapter_flat_arc',
] as const;

export const CreateIssueSchema = z.object({
  projectId: z.string().uuid(),
  chapterId: z.string().uuid(),
  issueType: z.enum(ISSUE_TYPES),
  severity: z.enum(['low', 'medium', 'high']),
  title: z.string().min(1).max(200),
  reason: z.string().min(1),
  locationRef: z.string().optional(),
  suggestion: z.string().optional(),
  // Extended fields
  tags: z.array(z.enum(ISSUE_TAGS)).optional(),
  revisionLevel: z.enum(['must_fix', 'should_improve', 'optional_enhancement']).optional(),
  aiSmellSeverity: z.enum(['low', 'medium', 'high']).optional(),
});

export const UpdateIssueSchema = z.object({
  status: z.enum(['open', 'in_revision', 'fixed', 'wont_fix']).optional(),
  linkedVersionId: z.string().uuid().optional(),
  linkedVersionLabel: z.string().optional(),
  linkedVersionSummary: z.string().optional(),
});

// Memory validation schemas
export const CreateMemorySchema = z.object({
  projectId: z.string().uuid(),
  memoryType: z.enum(['canon', 'world', 'narrative', 'style', 'user']),
  key: z.string().min(1).max(200),
  content: z.record(z.string(), z.any()),
  priority: z.number().int().min(0).max(100).optional(),
  source: z.enum(['user', 'agent', 'system']).optional(),
});

// Draft validation schemas
export const SaveDraftSchema = z.object({
  chapterId: z.string().uuid(),
  segments: z.array(z.object({
    id: z.string().uuid().optional(),
    sceneId: z.string().uuid().optional(),
    segmentIndex: z.number().int(),
    content: z.string(),
    source: z.enum(['ai', 'manual', 'hybrid']).default('manual'),
    isLocked: z.boolean().default(false),
  })),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateChapterInput = z.infer<typeof CreateChapterSchema>;
export type UpdateChapterInput = z.infer<typeof UpdateChapterSchema>;
export type CreateSceneInput = z.infer<typeof CreateSceneSchema>;
export type UpdateSceneInput = z.infer<typeof UpdateSceneSchema>;
export type ReorderScenesInput = z.infer<typeof ReorderScenesSchema>;
export type CreateRevisionInput = z.infer<typeof CreateRevisionSchema>;
export type CreateVersionInput = z.infer<typeof CreateVersionSchema>;
export type CompareVersionsInput = z.infer<typeof CompareVersionsSchema>;
export type UpdateIssueInput = z.infer<typeof UpdateIssueSchema>;
export type SaveDraftInput = z.infer<typeof SaveDraftSchema>;

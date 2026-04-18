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
  type: z.enum(['autosave', 'manual', 'revision', 'branch', 'current']).default('manual'),
  source: z.string().optional(),
  summary: z.string().optional(),
  parentId: z.string().uuid().optional(),
  branchName: z.string().max(120).optional(),
  snapshotContent: z.string(),
  wordCount: z.number().int().optional(),
});

export const CompareVersionsSchema = z.object({
  leftVersionId: z.string().uuid(),
  rightVersionId: z.string().uuid(),
});

// Issue validation schemas
export const CreateIssueSchema = z.object({
  projectId: z.string().uuid(),
  chapterId: z.string().uuid(),
  issueType: z.enum(['style', 'pacing', 'character', 'lore', 'timeline', 'clarity']),
  severity: z.enum(['low', 'medium', 'high']),
  title: z.string().min(1).max(200),
  reason: z.string().min(1),
  locationRef: z.string().optional(),
  suggestion: z.string().optional(),
});

export const UpdateIssueSchema = z.object({
  status: z.enum(['open', 'in_revision', 'fixed', 'wont_fix']).optional(),
  linkedVersionId: z.string().uuid().optional(),
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

// Version types
export type VersionType = 'autosave' | 'manual' | 'revision' | 'branch' | 'current' | 'baseline';

export type VersionTrigger =
  | 'auto_outline'
  | 'auto_scene_plan'
  | 'auto_draft'
  | 'manual_save'
  | 'revision_apply'
  | 'restore'
  | 'branch_create';

export type VersionStage = 'outline' | 'scene_plan' | 'draft' | 'revision';

export interface VersionRecord {
  id: string;
  projectId: string;
  chapterId: string;
  label: string;
  type: VersionType;
  source?: string;
  summary?: string;
  parentId?: string;
  branchName?: string;
  snapshotContent: string;
  wordCount: number;
  isCurrent: boolean;
  createdAt: Date;
  // Phase 4 扩展字段
  trigger?: VersionTrigger;
  stage?: VersionStage;
  linkedRevisionId?: string;
  linkedIssueIds?: string[];
  metricsSnapshot?: Record<string, number>;
  isBranchHead?: boolean;
}

export interface CreateVersionInput {
  chapterId: string;
  label: string;
  type?: VersionType;
  source?: string;
  summary?: string;
  parentId?: string;
  branchName?: string;
  snapshotContent: string;
  wordCount: number;
  // Phase 4 扩展字段
  trigger?: VersionTrigger;
  stage?: VersionStage;
  linkedRevisionId?: string;
  linkedIssueIds?: string[];
  metricsSnapshot?: Record<string, number>;
  isBranchHead?: boolean;
}

export interface CompareVersionsInput {
  leftVersionId: string;
  rightVersionId: string;
}

export interface CompareVersionsOutput {
  leftVersion: VersionRecord;
  rightVersion: VersionRecord;
  diff: {
    sentenceDiff?: DiffResult;
    wordDiff?: DiffResult;
  };
}

export interface DiffResult {
  leftHtml: string;
  rightHtml: string;
  addedCount: number;
  removedCount: number;
}

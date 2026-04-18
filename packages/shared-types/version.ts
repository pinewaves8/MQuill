// Version types
export type VersionType = 'autosave' | 'manual' | 'revision' | 'branch' | 'current';

export interface VersionRecord {
  id: string;
  projectId: string;
  chapterId: string;
  label: string;
  type: VersionType;
  source: string;
  summary?: string;
  parentId?: string;
  branchName?: string;
  snapshotContent: string;
  wordCount: number;
  isCurrent: boolean;
  createdAt: Date;
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

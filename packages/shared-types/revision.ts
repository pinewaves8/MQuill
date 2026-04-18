// Revision types
export type RevisionStatus = 'draft' | 'running' | 'reviewed' | 'applied' | 'rejected';
export type RevisionTargetScope = 'selection' | 'segment' | 'chapter';
export type ApplyMode = 'replace' | 'append' | 'branch';

export interface RevisionTask {
  id: string;
  projectId: string;
  chapterId: string;
  targetScope: RevisionTargetScope;
  targetRefId?: string;
  originalText?: string;  // The selected text for revision
  suggestion: string;
  goals: string[];
  constraints: string[];
  applyMode: ApplyMode;
  status: RevisionStatus;
  linkedIssueId?: string;
  createdBy: 'user' | 'agent';
  createdAt: Date;
  updatedAt: Date;
}

export interface RevisionCandidate {
  id: string;
  revisionTaskId: string;
  originalText: string;
  candidateText: string;
  diffPayload?: DiffPayload;
  score?: number;
  reviewNotes?: string;
  createdAt: Date;
}

export interface DiffPayload {
  operations: DiffOperation[];
  addedCount: number;
  removedCount: number;
}

export interface DiffOperation {
  type: 'add' | 'remove' | 'same';
  text: string;
}

export interface CreateRevisionInput {
  projectId: string;
  chapterId: string;
  targetScope: RevisionTargetScope;
  targetRefId?: string;
  originalText?: string;  // The selected text for revision
  suggestion: string;
  goals?: string[];
  constraints?: string[];
  applyMode?: ApplyMode;
  linkedIssueId?: string;
  createdBy?: 'user' | 'agent';
}

export interface RunRevisionOutput {
  candidateId: string;
  originalText: string;
  candidateText: string;
  diffPayload: DiffPayload;
}

export interface ApplyRevisionInput {
  mode: ApplyMode;
  candidateId: string;
}

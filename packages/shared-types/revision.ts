// Revision types
export type RevisionStatus = 'draft' | 'running' | 'reviewed' | 'applied' | 'rejected';
export type RevisionTargetScope = 'selection' | 'segment' | 'chapter';
export type ApplyMode = 'replace' | 'append' | 'branch';

// Context from linked issue for revision
export interface IssueContext {
  excerpt?: string;      // Original problem text
  reason?: string;      // Why this is a problem
  suggestion?: string;   // AI suggested fix
  tags?: string[];      // Issue tags (e.g., 'ai_smell', 'low_tension')
  severity?: 'low' | 'medium' | 'high';
  paragraphIndex?: number; // Paragraph index for location
}

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
  issueContext?: IssueContext;  // Full issue context for auto-generated revisions
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
  issueContext?: IssueContext;  // Full issue context for auto-generated revisions
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

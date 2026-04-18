// Issue types
export type IssueType = 'style' | 'pacing' | 'character' | 'lore' | 'timeline' | 'clarity';
export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueStatus = 'open' | 'in_revision' | 'fixed' | 'wont_fix';

export interface EvaluationIssue {
  id: string;
  projectId: string;
  chapterId: string;
  issueType: IssueType;
  severity: IssueSeverity;
  title: string;
  reason: string;
  locationRef?: string;
  suggestion?: string;
  status: IssueStatus;
  linkedVersionId?: string;
  linkedVersionLabel?: string;
  linkedVersionSummary?: string;
  excerpt?: string;
  paragraphIndex?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluateChapterInput {
  projectId: string;
  chapterId: string;
  dimensions?: IssueType[];
}

export interface EvaluateChapterOutput {
  chapterId: string;
  scoreSummary: Record<IssueType, number>;
  issues: EvaluationIssue[];
}

export interface CreateRevisionFromIssueInput {
  issueId: string;
  suggestion?: string;
  goals?: string[];
  constraints?: string[];
}

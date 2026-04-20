import type {
  EvaluationDecision,
  EvaluationScoreSummary,
  GateResults,
  IssueTag,
  RevisionLevel,
} from './issue';

// Chapter types
export type ChapterStatus = 'planned' | 'drafting' | 'revising' | 'approved' | 'done';
export type DraftSource = 'ai' | 'manual' | 'hybrid';

export interface Chapter {
  id: string;
  projectId: string;
  parentVolumeId?: string;
  sortOrder: number;
  title: string;
  summary?: string;
  status: ChapterStatus;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
  // Evaluation scores stored for persistence
  evaluationScores?: EvaluationScoreData;
  evaluationSummary?: EvaluationSummaryData;
  evaluationDetails?: EvaluationDetailsData;
  evaluationHistory?: EvaluationHistoryEntry[];
}

// Stored evaluation score data (6-dimension card)
export interface EvaluationScoreData {
  overall: number;
  overallGrade: 'excellent' | 'good' | 'fair' | 'poor';
  percentile: number;
  dimensions: {
    readability: number;
    rhythm: number;
    characterConsistency: number;
    plotCompleteness: number;
    foreshadowRecovery: number;
    aiSmell: number;
  };
  evaluatedAt: string;  // ISO timestamp
}

export interface EvaluationSummaryData {
  decision: string;
  gate: {
    text_completeness: { status: string; reason: string };
    readability_format: { status: string; reason: string };
    continuity_hard_conflict: { status: string; reason: string };
    chapter_goal_alignment: { status: string; reason: string };
    ai_template_smell: { status: string; reason: string };
  };
  strengths: string[];
  majorIssues: string[];
  issueTags: string[];
  evaluatedAt: string;
}

export interface PersistedRevisionSuggestionItem {
  text: string;
  level: RevisionLevel;
  excerpt?: string;
  paragraphIndex?: number;
}

export interface EvaluationDetailsData {
  chapterId: string;
  scores: EvaluationScoreSummary;
  decision: EvaluationDecision;
  gate: GateResults;
  issueTags: IssueTag[];
  strengths: string[];
  majorIssues: string[];
  revision: {
    must_fix: PersistedRevisionSuggestionItem[];
    should_improve: PersistedRevisionSuggestionItem[];
    optional_enhancements: PersistedRevisionSuggestionItem[];
  };
  evaluatedAt: string;
}

export interface EvaluationHistoryEntry {
  id: string;
  chapterId: string;
  evaluatedAt: string;
  overallScore: number;
  decision: EvaluationDecision;
  scoreCard: EvaluationScoreData;
  summary: EvaluationSummaryData;
  details: EvaluationDetailsData;
  issueCount: number;
  createdRevisionCount: number;
}

export interface DraftSegment {
  id: string;
  projectId: string;
  chapterId: string;
  sceneId?: string;
  segmentIndex: number;
  content: string;
  source: DraftSource;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetDraftOutput {
  chapterId: string;
  segments: DraftSegment[];
  totalWordCount: number;
}

export interface SaveDraftInput {
  chapterId: string;
  segments: DraftSegment[];
}

// Book Outline types
export interface VolumeOutline {
  id: string;
  title: string;
  goal: string;
  conflict: string;
  result: string;
  color: string;
  chapters: ChapterOutline[];
}

export interface ChapterOutline {
  id: string;
  title: string;
  chapterGoal: string;
  mainEvents: string;
  characterProgress: string;
  hook: string;
}

export interface BookOutline {
  projectId: string;
  volumes: VolumeOutline[];
  createdAt: Date;
  updatedAt: Date;
}

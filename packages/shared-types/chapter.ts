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

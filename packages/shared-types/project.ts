// Project types
export type ProjectStatus = 'draft' | 'bootstrapping' | 'active' | 'paused' | 'completed' | 'archived';
export type BookType = 'novel' | 'short' | 'series' | 'nonfiction' | 'poetry';
export type TargetLength = 'short' | 'mid' | 'long';
export type CreationMode = 'auto' | 'co_create' | 'author_driven';
export type Language = 'zh' | 'zh-tw' | 'en' | 'ja';

export interface Project {
  id: string;
  title: string;
  bookType: BookType;
  targetLength: TargetLength;
  language: Language;
  mode: CreationMode;
  status: ProjectStatus;
  description?: string;
  coverTone?: string;
  viewpoint?: string;
  targetAudience?: string;
  styleKeywords?: string[];
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectTag {
  id: string;
  projectId: string;
  tag: string;
}

export interface ProjectCharter {
  id: string;
  projectId: string;
  theme?: string;
  coreConflict?: string;
  targetAudience?: string;
  viewpoint?: string;
  styleKeywords: string[];
  forbiddenRules: string[];
  writingGoals: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  title: string;
  bookType: BookType;
  targetLength: TargetLength;
  language: Language;
  mode: CreationMode;
  tags?: string[];
  description?: string;
  coverTone?: string;
  viewpoint?: string;
  targetAudience?: string;
  styleKeywords?: string[];
}

export interface ProjectOverview {
  project: Project;
  charter?: ProjectCharter;
  chaptersSummary: ChapterSummary[];
  sceneStats: SceneStats;
  issueStats: IssueStats;
  latestVersions: VersionSummary[];
}

export interface ChapterSummary {
  id: string;
  title: string;
  status: string;
  wordCount: number;
}

export interface SceneStats {
  total: number;
  byStatus: Record<string, number>;
}

export interface IssueStats {
  total: number;
  open: number;
  bySeverity: Record<string, number>;
}

export interface VersionSummary {
  id: string;
  label: string;
  type: string;
  createdAt: Date;
}

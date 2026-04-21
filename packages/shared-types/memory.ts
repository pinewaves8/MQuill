// Memory types
export type MemoryType = 'canon' | 'world' | 'narrative' | 'style' | 'user' | 'foreshadow';
export type MemorySource = 'user' | 'agent' | 'system';

export interface Memory {
  id: string;
  projectId: string;
  memoryType: MemoryType;
  key: string;
  content: MemoryContent;
  priority: number;
  source: MemorySource;
  updatedAt: Date;
}

export interface MemoryContent {
  // Flexible content structure - can contain any relevant data
  text?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  // For different memory types
  facts?: string[];
  events?: NarrativeEvent[];
  characters?: CharacterInfo[];
  locations?: LocationInfo[];
  rules?: string[];
  // Character relationships (for narrative type)
  characterRelations?: CharacterRelation[];
  // Timeline info (for narrative type)
  timelineMarkers?: TimelineMarker[];
  // Foreshadowing entries (for foreshadow type)
  foreshadowings?: ForeshadowingEntry[];
}

export interface ForeshadowingEntry {
  id: string;
  type: 'object' | 'event' | 'character' | 'dialogue' | 'emotion';  // 伏笔类型
  hintText: string;         // 伏笔原文摘录
  setupChapterId: string;   // 伏笔埋下的章节
  setupChapterTitle: string;
  expectedResolution: string; // 预期的回收方式
  resolved: boolean;        // 是否已回收
  resolvedChapterId?: string; // 回收发生的章节
  resolutionText?: string;  // 回收原文
  notes?: string;           // 备注
}

export interface NarrativeEvent {
  id: string;
  title: string;
  description: string;
  chapterId?: string;
  timestamp?: string;
  importance: 'minor' | 'major' | 'critical';
  // Enhanced fields for timeline
  storyTime?: string;        // In-story time (e.g., "三年前", "Chapter 2")
  tags?: string[];          // Event tags for categorization
  involvedCharacters?: string[]; // Character IDs involved in this event
}

export interface CharacterInfo {
  id: string;
  name: string;
  role: string;
  description?: string;
  traits?: string[];
  // Enhanced fields
  firstAppearance?: string;  // Chapter ID where character first appeared
  personalityProfile?: string[];  // Personality traits for drift detection
  speechPatterns?: string[]; // Typical speech patterns
  relationships?: string[];  // Related character IDs
}

export interface CharacterRelation {
  from: string;  // Character ID
  to: string;    // Character ID
  type: 'ally' | 'enemy' | 'family' | 'mentor' | 'rival' | 'neutral';
  description?: string;
  sinceChapter?: string;
}

export interface TimelineMarker {
  id: string;
  chapterId: string;
  storyTime: string;      // In-story time description
  chapterTitle: string;
  summary: string;        // Brief summary of what happened
  keyEvents: string[];    // Event IDs that occurred
}

export interface LocationInfo {
  id: string;
  name: string;
  description: string;
  significance?: string;
}

export interface CreateMemoryInput {
  projectId: string;
  memoryType: MemoryType;
  key: string;
  content: MemoryContent;
  priority?: number;
  source?: MemorySource;
}

export interface UpdateMemoryInput {
  content?: MemoryContent;
  priority?: number;
}

export interface QueryMemoriesInput {
  projectId: string;
  memoryType?: MemoryType;
  query?: string;
  limit?: number;
}

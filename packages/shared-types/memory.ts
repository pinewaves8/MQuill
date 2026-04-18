// Memory types
export type MemoryType = 'canon' | 'world' | 'narrative' | 'style' | 'user';
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
}

export interface NarrativeEvent {
  id: string;
  title: string;
  description: string;
  chapterId?: string;
  timestamp?: string;
  importance: 'minor' | 'major' | 'critical';
}

export interface CharacterInfo {
  id: string;
  name: string;
  role: string;
  description?: string;
  traits?: string[];
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

// Scene types
export type SceneStatus = 'draft' | 'confirmed' | 'generated' | 'discarded';
export type SceneSource = 'ai' | 'manual' | 'hybrid';

export interface SceneCard {
  id: string;
  projectId: string;
  chapterId: string;
  sortOrder: number;
  title: string;
  summary?: string;
  viewpointCharacterId?: string;
  goal?: string;
  conflict?: string;
  expectedOutcome?: string;
  source: SceneSource;
  status: SceneStatus;
  notes?: string;
  // HTML prototype fields
  tag?: string;
  color?: 'purple' | 'blue' | 'amber' | 'emerald' | 'slate' | 'rose';
  mergedFrom?: string[];
  mergedInto?: string;
  branchFromSceneId?: string;
  branchFromTag?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSceneInput {
  projectId: string;
  chapterId: string;
  title: string;
  summary?: string;
  viewpointCharacterId?: string;
  goal?: string;
  conflict?: string;
  expectedOutcome?: string;
  source?: SceneSource;
  notes?: string;
}

export interface UpdateSceneInput {
  title?: string;
  summary?: string;
  viewpointCharacterId?: string;
  goal?: string;
  conflict?: string;
  expectedOutcome?: string;
  status?: SceneStatus;
  notes?: string;
}

export interface ReorderScenesInput {
  chapterId: string;
  sceneIds: string[];
}

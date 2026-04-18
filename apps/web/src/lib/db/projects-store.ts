// In-memory database store for v1 with file-based persistence for development
import { Project, Chapter, SceneCard, DraftSegment, RevisionTask, RevisionCandidate, VersionRecord, EvaluationIssue, ProjectTag, ProjectCharter, Memory, MemoryType, WritingProgress } from '@packages/shared-types';
import { loadCollection, saveCollection } from './file-storage';

const COLLECTIONS = {
  projects: 'projects',
  tags: 'tags',
  charters: 'charters',
  chapters: 'chapters',
  scenes: 'scenes',
  segments: 'segments',
  versions: 'versions',
  issues: 'issues',
  revisions: 'revisions',
  candidates: 'candidates',
  memories: 'memories',
  progress: 'progress',
} as const;

// Project store
class ProjectStore {
  private projects: Map<string, Project> = new Map();
  private tags: Map<string, ProjectTag[]> = new Map();
  private charters: Map<string, ProjectCharter> = new Map();
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Load from file storage
    try {
      const savedProjects = loadCollection<Project>(COLLECTIONS.projects);
      savedProjects.forEach((p) => this.projects.set(p.id, p));

      const savedTags = loadCollection<{ projectId: string; tags: ProjectTag[] }>(COLLECTIONS.tags);
      savedTags.forEach((t) => this.tags.set(t.projectId, t.tags));

      const savedCharters = loadCollection<ProjectCharter>(COLLECTIONS.charters);
      savedCharters.forEach((c) => this.charters.set(c.projectId, c));
    } catch (error) {
      console.error('[ProjectStore] Failed to load:', error);
    }
  }

  private persist(): void {
    this.ensureInitialized();
    try {
      saveCollection(COLLECTIONS.projects, Array.from(this.projects.values()));
      saveCollection(COLLECTIONS.tags, Array.from(this.tags.entries()).map(([k, v]) => ({ projectId: k, tags: v })));
      saveCollection(COLLECTIONS.charters, Array.from(this.charters.values()));
    } catch (error) {
      console.error('[ProjectStore] Failed to persist:', error);
    }
  }

  async create(input: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'>): Promise<Project> {
    this.ensureInitialized();
    const id = crypto.randomUUID();
    const project: Project = {
      ...input,
      id,
      wordCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(id, project);

    const charter: ProjectCharter = {
      id: crypto.randomUUID(),
      projectId: id,
      styleKeywords: input.styleKeywords || [],
      forbiddenRules: [],
      writingGoals: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.charters.set(id, charter);
    this.persist();

    return project;
  }

  async getAll(): Promise<Project[]> {
    this.ensureInitialized();
    return Array.from(this.projects.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async getById(id: string): Promise<Project | null> {
    this.ensureInitialized();
    return this.projects.get(id) || null;
  }

  async update(id: string, updates: Partial<Project>): Promise<Project | null> {
    this.ensureInitialized();
    const project = this.projects.get(id);
    if (!project) return null;
    const updated = { ...project, ...updates, updatedAt: new Date() };
    this.projects.set(id, updated);
    this.persist();
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    this.ensureInitialized();
    const result = this.projects.delete(id);
    if (result) {
      this.charters.delete(id);
      this.tags.delete(id);
      this.persist();
    }
    return result;
  }

  async getTags(projectId: string): Promise<ProjectTag[]> {
    this.ensureInitialized();
    return this.tags.get(projectId) || [];
  }

  async setTags(projectId: string, tags: string[]): Promise<void> {
    this.ensureInitialized();
    this.tags.set(
      projectId,
      tags.map((tag) => ({ id: crypto.randomUUID(), projectId, tag }))
    );
    this.persist();
  }

  async getCharter(projectId: string): Promise<ProjectCharter | null> {
    this.ensureInitialized();
    return this.charters.get(projectId) || null;
  }

  async updateCharter(projectId: string, updates: Partial<ProjectCharter>): Promise<ProjectCharter | null> {
    this.ensureInitialized();
    const charter = this.charters.get(projectId);
    if (!charter) return null;
    const updated = { ...charter, ...updates, updatedAt: new Date() };
    this.charters.set(projectId, updated);
    this.persist();
    return updated;
  }
}

// Chapter store
class ChapterStore {
  private chapters: Map<string, Chapter> = new Map();
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const saved = loadCollection<Chapter>(COLLECTIONS.chapters);
      saved.forEach((c) => this.chapters.set(c.id, c));
    } catch (error) {
      console.error('[ChapterStore] Failed to load:', error);
    }
  }

  private persist(): void {
    this.ensureInitialized();
    try {
      saveCollection(COLLECTIONS.chapters, Array.from(this.chapters.values()));
    } catch (error) {
      console.error('[ChapterStore] Failed to persist:', error);
    }
  }

  async create(input: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'>): Promise<Chapter> {
    this.ensureInitialized();
    const id = crypto.randomUUID();
    const chapter: Chapter = {
      ...input,
      id,
      wordCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.chapters.set(id, chapter);
    this.persist();
    return chapter;
  }

  async getByProject(projectId: string): Promise<Chapter[]> {
    this.ensureInitialized();
    return Array.from(this.chapters.values())
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getById(id: string): Promise<Chapter | null> {
    this.ensureInitialized();
    return this.chapters.get(id) || null;
  }

  async update(id: string, updates: Partial<Chapter>): Promise<Chapter | null> {
    this.ensureInitialized();
    const chapter = this.chapters.get(id);
    if (!chapter) return null;
    const updated = { ...chapter, ...updates, updatedAt: new Date() };
    this.chapters.set(id, updated);
    this.persist();
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    this.ensureInitialized();
    const result = this.chapters.delete(id);
    if (result) this.persist();
    return result;
  }
}

// Scene store
class SceneStore {
  private scenes: Map<string, SceneCard> = new Map();
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const saved = loadCollection<SceneCard>(COLLECTIONS.scenes);
      saved.forEach((s) => this.scenes.set(s.id, s));
    } catch (error) {
      console.error('[SceneStore] Failed to load:', error);
    }
  }

  private persist(): void {
    this.ensureInitialized();
    try {
      saveCollection(COLLECTIONS.scenes, Array.from(this.scenes.values()));
    } catch (error) {
      console.error('[SceneStore] Failed to persist:', error);
    }
  }

  async create(input: Omit<SceneCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<SceneCard> {
    this.ensureInitialized();
    const id = crypto.randomUUID();
    const scene: SceneCard = {
      ...input,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.scenes.set(id, scene);
    this.persist();
    return scene;
  }

  async getByChapter(chapterId: string): Promise<SceneCard[]> {
    this.ensureInitialized();
    return Array.from(this.scenes.values())
      .filter((s) => s.chapterId === chapterId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getById(id: string): Promise<SceneCard | null> {
    this.ensureInitialized();
    return this.scenes.get(id) || null;
  }

  async update(id: string, updates: Partial<SceneCard>): Promise<SceneCard | null> {
    this.ensureInitialized();
    const scene = this.scenes.get(id);
    if (!scene) return null;
    const updated = { ...scene, ...updates, updatedAt: new Date() };
    this.scenes.set(id, updated);
    this.persist();
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    this.ensureInitialized();
    const result = this.scenes.delete(id);
    if (result) this.persist();
    return result;
  }

  async reorder(chapterId: string, sceneIds: string[]): Promise<void> {
    this.ensureInitialized();
    sceneIds.forEach((sceneId, index) => {
      const scene = this.scenes.get(sceneId);
      if (scene && scene.chapterId === chapterId) {
        this.scenes.set(sceneId, { ...scene, sortOrder: index, updatedAt: new Date() });
      }
    });
    this.persist();
  }
}

// Draft segments store
class DraftSegmentStore {
  private segments: Map<string, DraftSegment> = new Map();
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const saved = loadCollection<DraftSegment>(COLLECTIONS.segments);
      saved.forEach((s) => this.segments.set(s.id, s));
    } catch (error) {
      console.error('[DraftSegmentStore] Failed to load:', error);
    }
  }

  private persist(): void {
    this.ensureInitialized();
    try {
      saveCollection(COLLECTIONS.segments, Array.from(this.segments.values()));
    } catch (error) {
      console.error('[DraftSegmentStore] Failed to persist:', error);
    }
  }

  async getByChapter(chapterId: string): Promise<DraftSegment[]> {
    this.ensureInitialized();
    return Array.from(this.segments.values())
      .filter((s) => s.chapterId === chapterId)
      .sort((a, b) => a.segmentIndex - b.segmentIndex);
  }

  async upsert(segment: Omit<DraftSegment, 'id' | 'createdAt' | 'updatedAt'>): Promise<DraftSegment> {
    this.ensureInitialized();
    const existing = Array.from(this.segments.values()).find(
      (s) => s.chapterId === segment.chapterId && s.segmentIndex === segment.segmentIndex
    );
    if (existing) {
      const updated = { ...existing, ...segment, updatedAt: new Date() };
      this.segments.set(existing.id, updated);
      this.persist();
      return updated;
    }
    const id = crypto.randomUUID();
    const newSegment: DraftSegment = {
      ...segment,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.segments.set(id, newSegment);
    this.persist();
    return newSegment;
  }

  async update(id: string, updates: Partial<DraftSegment>): Promise<DraftSegment | null> {
    this.ensureInitialized();
    const segment = this.segments.get(id);
    if (!segment) return null;
    const updated = { ...segment, ...updates, updatedAt: new Date() };
    this.segments.set(id, updated);
    this.persist();
    return updated;
  }

  async getById(id: string): Promise<DraftSegment | null> {
    this.ensureInitialized();
    return this.segments.get(id) || null;
  }

  async deleteByChapter(chapterId: string): Promise<void> {
    this.ensureInitialized();
    const toDelete = Array.from(this.segments.values())
      .filter((s) => s.chapterId === chapterId)
      .map((s) => s.id);
    for (const id of toDelete) {
      this.segments.delete(id);
    }
    this.persist();
  }

  async deleteById(id: string): Promise<void> {
    this.ensureInitialized();
    this.segments.delete(id);
    this.persist();
  }

  async deleteExcluding(chapterId: string, keepIds: Set<string>): Promise<void> {
    this.ensureInitialized();
    const toDelete = Array.from(this.segments.values())
      .filter((s) => s.chapterId === chapterId && !keepIds.has(s.id) && !s.isLocked)
      .map((s) => s.id);
    for (const id of toDelete) {
      this.segments.delete(id);
    }
    this.persist();
  }
}

// Version store
class VersionStore {
  private versions: Map<string, VersionRecord> = new Map();
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const saved = loadCollection<VersionRecord>(COLLECTIONS.versions);
      saved.forEach((v) => this.versions.set(v.id, v));
    } catch (error) {
      console.error('[VersionStore] Failed to load:', error);
    }
  }

  private persist(): void {
    this.ensureInitialized();
    try {
      saveCollection(COLLECTIONS.versions, Array.from(this.versions.values()));
    } catch (error) {
      console.error('[VersionStore] Failed to persist:', error);
    }
  }

  async create(input: Omit<VersionRecord, 'id' | 'createdAt'>): Promise<VersionRecord> {
    this.ensureInitialized();
    const id = crypto.randomUUID();
    const version: VersionRecord = {
      ...input,
      id,
      createdAt: new Date(),
    };
    this.versions.set(id, version);

    if (version.isCurrent) {
      Array.from(this.versions.values())
        .filter((v) => v.chapterId === version.chapterId && v.id !== id)
        .forEach((v) => {
          this.versions.set(v.id, { ...v, isCurrent: false });
        });
    }
    this.persist();
    return version;
  }

  async getByChapter(chapterId: string): Promise<VersionRecord[]> {
    this.ensureInitialized();
    return Array.from(this.versions.values())
      .filter((v) => v.chapterId === chapterId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getById(id: string): Promise<VersionRecord | null> {
    this.ensureInitialized();
    return this.versions.get(id) || null;
  }

  async restore(id: string): Promise<VersionRecord | null> {
    this.ensureInitialized();
    const version = this.versions.get(id);
    if (!version) return null;

    const updated = { ...version, isCurrent: true };
    this.versions.set(id, updated);

    Array.from(this.versions.values())
      .filter((v) => v.chapterId === version.chapterId && v.id !== id)
      .forEach((v) => {
        this.versions.set(v.id, { ...v, isCurrent: false });
      });
    this.persist();
    return updated;
  }
}

// Issue store
class IssueStore {
  private issues: Map<string, EvaluationIssue> = new Map();
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const saved = loadCollection<EvaluationIssue>(COLLECTIONS.issues);
      saved.forEach((i) => this.issues.set(i.id, i));
    } catch (error) {
      console.error('[IssueStore] Failed to load:', error);
    }
  }

  private persist(): void {
    this.ensureInitialized();
    try {
      saveCollection(COLLECTIONS.issues, Array.from(this.issues.values()));
    } catch (error) {
      console.error('[IssueStore] Failed to persist:', error);
    }
  }

  async create(input: Omit<EvaluationIssue, 'id' | 'createdAt' | 'updatedAt'>): Promise<EvaluationIssue> {
    this.ensureInitialized();
    const id = crypto.randomUUID();
    const issue: EvaluationIssue = {
      ...input,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.issues.set(id, issue);
    this.persist();
    return issue;
  }

  async getByChapter(chapterId: string): Promise<EvaluationIssue[]> {
    this.ensureInitialized();
    return Array.from(this.issues.values())
      .filter((i) => i.chapterId === chapterId)
      .sort((a, b) => {
        const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  async getById(id: string): Promise<EvaluationIssue | null> {
    this.ensureInitialized();
    return this.issues.get(id) || null;
  }

  async update(id: string, updates: Partial<EvaluationIssue>): Promise<EvaluationIssue | null> {
    this.ensureInitialized();
    const issue = this.issues.get(id);
    if (!issue) return null;
    const updated = { ...issue, ...updates, updatedAt: new Date() };
    this.issues.set(id, updated);
    this.persist();
    return updated;
  }
}

// Revision store
class RevisionStore {
  private revisions: Map<string, RevisionTask> = new Map();
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const saved = loadCollection<RevisionTask>(COLLECTIONS.revisions);
      saved.forEach((r) => this.revisions.set(r.id, r));
    } catch (error) {
      console.error('[RevisionStore] Failed to load:', error);
    }
  }

  private persist(): void {
    this.ensureInitialized();
    try {
      saveCollection(COLLECTIONS.revisions, Array.from(this.revisions.values()));
    } catch (error) {
      console.error('[RevisionStore] Failed to persist:', error);
    }
  }

  async create(input: Omit<RevisionTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<RevisionTask> {
    this.ensureInitialized();
    const id = crypto.randomUUID();
    const revision: RevisionTask = {
      ...input,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.revisions.set(id, revision);
    this.persist();
    return revision;
  }

  async getByChapter(chapterId: string): Promise<RevisionTask[]> {
    this.ensureInitialized();
    return Array.from(this.revisions.values())
      .filter((r) => r.chapterId === chapterId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getById(id: string): Promise<RevisionTask | null> {
    this.ensureInitialized();
    return this.revisions.get(id) || null;
  }

  async update(id: string, updates: Partial<RevisionTask>): Promise<RevisionTask | null> {
    this.ensureInitialized();
    const revision = this.revisions.get(id);
    if (!revision) return null;
    const updated = { ...revision, ...updates, updatedAt: new Date() };
    this.revisions.set(id, updated);
    this.persist();
    return updated;
  }
}

// Revision candidate store
class RevisionCandidateStore {
  private candidates: Map<string, RevisionCandidate> = new Map();
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const saved = loadCollection<RevisionCandidate>(COLLECTIONS.candidates);
      saved.forEach((c) => this.candidates.set(c.id, c));
    } catch (error) {
      console.error('[RevisionCandidateStore] Failed to load:', error);
    }
  }

  private persist(): void {
    this.ensureInitialized();
    try {
      saveCollection(COLLECTIONS.candidates, Array.from(this.candidates.values()));
    } catch (error) {
      console.error('[RevisionCandidateStore] Failed to persist:', error);
    }
  }

  async create(input: Omit<RevisionCandidate, 'id' | 'createdAt'>): Promise<RevisionCandidate> {
    this.ensureInitialized();
    const id = crypto.randomUUID();
    const candidate: RevisionCandidate = {
      ...input,
      id,
      createdAt: new Date(),
    };
    this.candidates.set(id, candidate);
    this.persist();
    return candidate;
  }

  async getByRevision(revisionTaskId: string): Promise<RevisionCandidate[]> {
    this.ensureInitialized();
    return Array.from(this.candidates.values())
      .filter((c) => c.revisionTaskId === revisionTaskId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getById(id: string): Promise<RevisionCandidate | null> {
    this.ensureInitialized();
    return this.candidates.get(id) || null;
  }
}

// Memory store
class MemoryStore {
  private memories: Map<string, Memory> = new Map();
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const saved = loadCollection<Memory>(COLLECTIONS.memories);
      saved.forEach((m) => this.memories.set(m.id, m));
    } catch (error) {
      console.error('[MemoryStore] Failed to load:', error);
    }
  }

  private persist(): void {
    this.ensureInitialized();
    try {
      saveCollection(COLLECTIONS.memories, Array.from(this.memories.values()));
    } catch (error) {
      console.error('[MemoryStore] Failed to persist:', error);
    }
  }

  async create(input: Omit<Memory, 'id' | 'updatedAt'>): Promise<Memory> {
    this.ensureInitialized();
    const id = crypto.randomUUID();
    const memory: Memory = {
      ...input,
      id,
      updatedAt: new Date(),
    };
    this.memories.set(id, memory);
    this.persist();
    return memory;
  }

  async getByProject(projectId: string, memoryType?: MemoryType): Promise<Memory[]> {
    this.ensureInitialized();
    return Array.from(this.memories.values())
      .filter((m) => m.projectId === projectId && (!memoryType || m.memoryType === memoryType))
      .sort((a, b) => b.priority - b.priority || b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getById(id: string): Promise<Memory | null> {
    this.ensureInitialized();
    return this.memories.get(id) || null;
  }

  async update(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    this.ensureInitialized();
    const memory = this.memories.get(id);
    if (!memory) return null;
    const updated = { ...memory, ...updates, updatedAt: new Date() };
    this.memories.set(id, updated);
    this.persist();
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    this.ensureInitialized();
    const result = this.memories.delete(id);
    if (result) this.persist();
    return result;
  }

  async query(projectId: string, searchQuery: string, memoryType?: MemoryType): Promise<Memory[]> {
    this.ensureInitialized();
    const memories = await this.getByProject(projectId, memoryType);
    const queryLower = searchQuery.toLowerCase();

    return memories.filter((m) => {
      const contentStr = JSON.stringify(m.content).toLowerCase();
      return contentStr.includes(queryLower) || m.key.toLowerCase().includes(queryLower);
    });
  }
}

// Writing progress store
class WritingProgressStore {
  private progress: Map<string, WritingProgress> = new Map();
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const saved = loadCollection<WritingProgress>(COLLECTIONS.progress);
      saved.forEach((p) => this.progress.set(p.id, p));
    } catch (error) {
      console.error('[WritingProgressStore] Failed to load:', error);
    }
  }

  private persist(): void {
    this.ensureInitialized();
    try {
      saveCollection(COLLECTIONS.progress, Array.from(this.progress.values()));
    } catch (error) {
      console.error('[WritingProgressStore] Failed to persist:', error);
    }
  }

  async getByProject(projectId: string): Promise<WritingProgress[]> {
    this.ensureInitialized();
    return Array.from(this.progress.values())
      .filter((p) => p.projectId === projectId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async upsertDay(projectId: string, date: string, wordsWritten: number, totalWords: number): Promise<WritingProgress> {
    this.ensureInitialized();
    const existing = Array.from(this.progress.values()).find(
      (p) => p.projectId === projectId && p.date === date
    );
    if (existing) {
      const updated = {
        ...existing,
        wordsWritten: existing.wordsWritten + wordsWritten,
        totalWords,
        updatedAt: new Date(),
      };
      this.progress.set(existing.id, updated);
      this.persist();
      return updated;
    }
    const id = crypto.randomUUID();
    const newProgress: WritingProgress = {
      id,
      projectId,
      date,
      wordsWritten,
      totalWords,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.progress.set(id, newProgress);
    this.persist();
    return newProgress;
  }

  async getStats(projectId: string): Promise<{
    totalDaysWriting: number;
    totalWordsWritten: number;
    averageWordsPerDay: number;
    currentStreak: number;
    longestStreak: number;
  }> {
    this.ensureInitialized();
    const projectProgress = await this.getByProject(projectId);
    if (projectProgress.length === 0) {
      return { totalDaysWriting: 0, totalWordsWritten: 0, averageWordsPerDay: 0, currentStreak: 0, longestStreak: 0 };
    }

    const totalDaysWriting = projectProgress.length;
    const totalWordsWritten = projectProgress.reduce((sum, p) => sum + p.wordsWritten, 0);
    const averageWordsPerDay = Math.round(totalWordsWritten / totalDaysWriting);

    // Calculate streaks
    const dates = projectProgress.map((p) => p.date).sort((a, b) => b.localeCompare(a));
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (dates[0] === today || dates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = (prev.getTime() - curr.getTime()) / 86400000;
        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return { totalDaysWriting, totalWordsWritten, averageWordsPerDay, currentStreak, longestStreak };
  }
}

// Export singleton instances
export const projectStore = new ProjectStore();
export const chapterStore = new ChapterStore();
export const sceneStore = new SceneStore();
export const draftSegmentStore = new DraftSegmentStore();
export const versionStore = new VersionStore();
export const issueStore = new IssueStore();
export const revisionStore = new RevisionStore();
export const revisionCandidateStore = new RevisionCandidateStore();
export const memoryStore = new MemoryStore();
export const writingProgressStore = new WritingProgressStore();

// Development seed data - only seeds if storage is empty
export async function seedDevelopmentData(): Promise<boolean> {
  const existing = await projectStore.getAll();
  if (existing.length > 0) return false;

  const project = await projectStore.create({
    title: '春天的故事',
    bookType: 'novel',
    targetLength: 'long',
    language: 'zh',
    mode: 'auto',
    status: 'active',
    description: '演示项目 - 春天的故事',
    coverTone: 'emerald',
    viewpoint: '第三人称全知',
    targetAudience: '16-25岁年轻女性',
    styleKeywords: ['青春', '成长', '悬疑'],
  });

  await projectStore.updateCharter(project.id, {
    theme: '关于青春成长与自我发现',
    coreConflict: '主角在寻找真相的过程中逐渐认识自己',
    styleKeywords: ['细腻', '文艺', '清新'],
    forbiddenRules: ['避免过于血腥暴力', '避免过于露白'],
    writingGoals: ['完成10万字', '保持更新'],
  });

  const chapter = await chapterStore.create({
    projectId: project.id,
    title: '第一章：初春',
    sortOrder: 1,
    status: 'drafting',
  });

  await sceneStore.create({
    projectId: project.id,
    chapterId: chapter.id,
    sortOrder: 1,
    title: '场景一：图书馆的偶遇',
    summary: '主角在图书馆无意间发现了一本尘封的日记，揭开了多年前的秘密...',
    goal: '引入故事核心悬念',
    conflict: '好奇心与恐惧的冲突',
    expectedOutcome: '读者对主角身份产生疑问',
    source: 'ai',
    status: 'confirmed',
  });

  await draftSegmentStore.upsert({
    projectId: project.id,
    chapterId: chapter.id,
    segmentIndex: 1,
    content: '三月的阳光透过图书馆的落地窗洒进来，在地板上投下斑驳的光影。林晚晚的手指轻轻划过书架上那些落满灰尘的书脊，寻找着那本据说能解开一切谜团的日记...\n\n忽然，一本暗红色封面的笔记本从最高层滑落，砸在她脚边。封面上没有任何标记，只有一朵压印的玫瑰花。她弯腰捡起，翻开第一页——\n\n「如果你能看见这些文字，说明命运的齿轮已经开始转动...」',
    source: 'ai',
    isLocked: false,
  });

  return true;
}

// Auto-seed in development if empty (defer to first API call)
let seeded = false;
export function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;
  seedDevelopmentData().then((didSeed) => {
    if (didSeed) console.log('[MQuill] Demo project seeded');
  });
}

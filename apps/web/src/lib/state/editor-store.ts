import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, Chapter, DraftSegment } from '@packages/shared-types';

interface EditorState {
  // Current context
  projectId: string | null;
  chapterId: string | null;

  // Data
  project: Project | null;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  draftSegments: DraftSegment[];

  // UI state
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProjectId: (projectId: string | null) => void;
  setChapterId: (chapterId: string | null) => void;
  setProject: (project: Project | null) => void;
  setChapters: (chapters: Chapter[]) => void;
  setCurrentChapter: (chapter: Chapter | null) => void;
  setDraftSegments: (segments: DraftSegment[]) => void;
  updateDraftSegment: (segmentId: string, content: string) => void;
  setIsDirty: (isDirty: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  projectId: null,
  chapterId: null,
  project: null,
  chapters: [],
  currentChapter: null,
  draftSegments: [],
  isDirty: false,
  isLoading: false,
  error: null,
};

export const useEditorStore = create<EditorState>()((set) => ({
  ...initialState,

  setProjectId: (projectId) => set({ projectId }),

  setChapterId: (chapterId) => set({ chapterId }),

  setProject: (project) => set({ project }),

  setChapters: (chapters) => set({ chapters }),

  setCurrentChapter: (currentChapter) => set({ currentChapter }),

  setDraftSegments: (draftSegments) => set({ draftSegments, isDirty: false }),

  updateDraftSegment: (segmentId, content) =>
    set((state) => ({
      draftSegments: state.draftSegments.map((seg) =>
        seg.id === segmentId ? { ...seg, content } : seg
      ),
      isDirty: true,
    })),

  setIsDirty: (isDirty) => set({ isDirty }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));

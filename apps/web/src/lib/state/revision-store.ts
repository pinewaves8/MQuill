import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RevisionTask, RevisionCandidate } from '@packages/shared-types';

interface RevisionState {
  // Modal state
  isModalOpen: boolean;
  isReviewing: boolean;

  // Selection
  selectedText: string;
  selectionRange: { start: number; end: number } | null;
  targetScope: 'selection' | 'segment' | 'chapter';

  // Revision task
  currentRevision: RevisionTask | null;
  candidates: RevisionCandidate[];
  currentCandidateIndex: number;

  // Form inputs
  suggestions: string[];
  goals: string[];
  constraints: string[];
  applyMode: 'replace' | 'append' | 'branch';

  // Actions
  openModal: (selectedText?: string, range?: { start: number; end: number }, targetScope?: 'selection' | 'segment' | 'chapter') => void;
  closeModal: () => void;
  setSelectedText: (text: string) => void;
  setSelectionRange: (range: { start: number; end: number } | null) => void;
  setTargetScope: (scope: 'selection' | 'segment' | 'chapter') => void;
  setCurrentRevision: (revision: RevisionTask | null) => void;
  setCandidates: (candidates: RevisionCandidate[]) => void;
  addCandidate: (candidate: RevisionCandidate) => void;
  setCurrentCandidateIndex: (index: number) => void;
  setSuggestions: (suggestions: string[]) => void;
  setGoals: (goals: string[]) => void;
  setConstraints: (constraints: string[]) => void;
  setApplyMode: (mode: 'replace' | 'append' | 'branch') => void;
  setIsReviewing: (isReviewing: boolean) => void;
  reset: () => void;
}

const initialState = {
  isModalOpen: false,
  isReviewing: false,
  selectedText: '',
  selectionRange: null,
  targetScope: 'selection' as const,
  currentRevision: null,
  candidates: [],
  currentCandidateIndex: -1,
  suggestions: [],
  goals: [],
  constraints: [],
  applyMode: 'replace' as const,
};

export const useRevisionStore = create<RevisionState>()(
  persist(
    (set) => ({
      ...initialState,

      openModal: (selectedText = '', range = undefined, targetScope = 'selection') =>
        set({
          isModalOpen: true,
          selectedText,
          selectionRange: range,
          targetScope,
        }),

      closeModal: () => set(initialState),

      setSelectedText: (selectedText) => set({ selectedText }),

      setSelectionRange: (selectionRange) => set({ selectionRange }),

      setTargetScope: (targetScope) => set({ targetScope }),

      setCurrentRevision: (currentRevision) => set({ currentRevision }),

      setCandidates: (candidates) => set({ candidates }),

      addCandidate: (candidate) =>
        set((state) => ({
          candidates: [...state.candidates, candidate],
          currentCandidateIndex: state.candidates.length,
        })),

      setCurrentCandidateIndex: (currentCandidateIndex) =>
        set({ currentCandidateIndex }),

      setSuggestions: (suggestions) => set({ suggestions }),

      setGoals: (goals) => set({ goals }),

      setConstraints: (constraints) => set({ constraints }),

      setApplyMode: (applyMode) => set({ applyMode }),

      setIsReviewing: (isReviewing) => set({ isReviewing }),

      reset: () => set(initialState),
    }),
    {
      name: 'mquill-revision-state',
      partialize: (state) => ({
        selectedText: state.selectedText,
        selectionRange: state.selectionRange,
        targetScope: state.targetScope,
        suggestions: state.suggestions,
        goals: state.goals,
        constraints: state.constraints,
        applyMode: state.applyMode,
      }),
    }
  )
);

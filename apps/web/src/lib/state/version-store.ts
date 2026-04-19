import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VersionRecord } from '@packages/shared-types';

interface VersionState {
  // Data
  versions: VersionRecord[];
  selectedChapterId: string | null;
  compareLeftId: string | null;
  compareRightId: string | null;

  // UI
  diffMode: 'sentence' | 'word';
  showOnlyChanges: boolean;
  isDrawerOpen: boolean;
  filterType: string | null;
  showBranchOnly: boolean;

  // Actions
  setVersions: (versions: VersionRecord[]) => void;
  addVersion: (version: VersionRecord) => void;
  setSelectedChapterId: (chapterId: string | null) => void;
  setCompareLeftId: (id: string | null) => void;
  setCompareRightId: (id: string | null) => void;
  setDiffMode: (mode: 'sentence' | 'word') => void;
  setShowOnlyChanges: (show: boolean) => void;
  toggleShowOnlyChanges: () => void;
  setIsDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  setFilterType: (type: string | null) => void;
  setShowBranchOnly: (show: boolean) => void;
  clearComparison: () => void;
  reset: () => void;
}

const initialState = {
  versions: [],
  selectedChapterId: null,
  compareLeftId: null,
  compareRightId: null,
  diffMode: 'sentence' as const,
  showOnlyChanges: false,
  isDrawerOpen: false,
  filterType: null,
  showBranchOnly: false,
};

export const useVersionStore = create<VersionState>()(
  persist(
    (set) => ({
      ...initialState,

      setVersions: (versions) => set({ versions }),

      addVersion: (version) =>
        set((state) => ({ versions: [version, ...state.versions] })),

      setSelectedChapterId: (selectedChapterId) => set({ selectedChapterId }),

      setCompareLeftId: (compareLeftId) => set({ compareLeftId }),

      setCompareRightId: (compareRightId) => set({ compareRightId }),

      setDiffMode: (diffMode) => set({ diffMode }),

      setShowOnlyChanges: (showOnlyChanges) => set({ showOnlyChanges }),

      toggleShowOnlyChanges: () =>
        set((state) => ({ showOnlyChanges: !state.showOnlyChanges })),

      setIsDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),

      toggleDrawer: () =>
        set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      setFilterType: (filterType) => set({ filterType }),

      setShowBranchOnly: (showBranchOnly) => set({ showBranchOnly }),

      clearComparison: () => set({ compareLeftId: null, compareRightId: null }),

      reset: () => set(initialState),
    }),
    {
      name: 'mquill-version-state',
      partialize: (state) => ({
        selectedChapterId: state.selectedChapterId,
        compareLeftId: state.compareLeftId,
        compareRightId: state.compareRightId,
        diffMode: state.diffMode,
        showOnlyChanges: state.showOnlyChanges,
        filterType: state.filterType,
        showBranchOnly: state.showBranchOnly,
      }),
    }
  )
);

import { create } from 'zustand';
import { VersionRecord } from '@packages/shared-types';

interface VersionState {
  // Data
  versions: VersionRecord[];
  compareLeftId: string | null;
  compareRightId: string | null;

  // UI
  diffMode: 'sentence' | 'word';
  showOnlyChanges: boolean;
  isDrawerOpen: boolean;

  // Actions
  setVersions: (versions: VersionRecord[]) => void;
  addVersion: (version: VersionRecord) => void;
  setCompareLeftId: (id: string | null) => void;
  setCompareRightId: (id: string | null) => void;
  setDiffMode: (mode: 'sentence' | 'word') => void;
  setShowOnlyChanges: (show: boolean) => void;
  toggleShowOnlyChanges: () => void;
  setIsDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  reset: () => void;
}

const initialState = {
  versions: [],
  compareLeftId: null,
  compareRightId: null,
  diffMode: 'sentence' as const,
  showOnlyChanges: false,
  isDrawerOpen: false,
};

export const useVersionStore = create<VersionState>()((set) => ({
  ...initialState,

  setVersions: (versions) => set({ versions }),

  addVersion: (version) =>
    set((state) => ({ versions: [version, ...state.versions] })),

  setCompareLeftId: (compareLeftId) => set({ compareLeftId }),

  setCompareRightId: (compareRightId) => set({ compareRightId }),

  setDiffMode: (diffMode) => set({ diffMode }),

  setShowOnlyChanges: (showOnlyChanges) => set({ showOnlyChanges }),

  toggleShowOnlyChanges: () =>
    set((state) => ({ showOnlyChanges: !state.showOnlyChanges })),

  setIsDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),

  toggleDrawer: () =>
    set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

  reset: () => set(initialState),
}));

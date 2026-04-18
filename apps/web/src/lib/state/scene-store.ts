import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SceneCard } from '@packages/shared-types';

interface SceneState {
  // Data
  scenes: SceneCard[];
  selectedSceneId: string | null;

  // UI state
  isPanelCollapsed: boolean;
  isLoading: boolean;
  isGenerating: boolean;

  // Actions
  setScenes: (scenes: SceneCard[]) => void;
  addScene: (scene: SceneCard) => void;
  updateScene: (sceneId: string, updates: Partial<SceneCard>) => void;
  removeScene: (sceneId: string) => void;
  setSelectedSceneId: (sceneId: string | null) => void;
  setIsPanelCollapsed: (collapsed: boolean) => void;
  togglePanelCollapsed: () => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  reorderScenes: (sceneIds: string[]) => void;
  reset: () => void;
}

const initialState = {
  scenes: [],
  selectedSceneId: null,
  isPanelCollapsed: false,
  isLoading: false,
  isGenerating: false,
};

export const useSceneStore = create<SceneState>()(
  persist(
    (set) => ({
      ...initialState,

      setScenes: (scenes) => set({ scenes }),

      addScene: (scene) =>
        set((state) => ({ scenes: [...state.scenes, scene] })),

      updateScene: (sceneId, updates) =>
        set((state) => ({
          scenes: state.scenes.map((s) =>
            s.id === sceneId ? { ...s, ...updates } : s
          ),
        })),

      removeScene: (sceneId) =>
        set((state) => ({
          scenes: state.scenes.filter((s) => s.id !== sceneId),
          selectedSceneId:
            state.selectedSceneId === sceneId ? null : state.selectedSceneId,
        })),

      setSelectedSceneId: (selectedSceneId) => set({ selectedSceneId }),

      setIsPanelCollapsed: (isPanelCollapsed) => set({ isPanelCollapsed }),

      togglePanelCollapsed: () =>
        set((state) => ({ isPanelCollapsed: !state.isPanelCollapsed })),

      setIsLoading: (isLoading) => set({ isLoading }),

      setIsGenerating: (isGenerating) => set({ isGenerating }),

      reorderScenes: (sceneIds) =>
        set((state) => {
          const sceneMap = new Map(state.scenes.map((s) => [s.id, s]));
          const reordered = sceneIds
            .map((id, index) => {
              const scene = sceneMap.get(id);
              return scene ? { ...scene, sortOrder: index } : null;
            })
            .filter((s): s is SceneCard => s !== null);
          return { scenes: reordered };
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'mquill-scene-state',
      partialize: (state) => ({
        isPanelCollapsed: state.isPanelCollapsed,
      }),
    }
  )
);

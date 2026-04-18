'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SceneCard, DraftSegment } from '@packages/shared-types';
import { useSceneStore } from '@/lib/state/scene-store';
import { SceneCardComponent } from '@/components/editor/scene-card';
import { SceneEditModal } from '@/components/editor/scene-edit-modal';
import { toast } from '@/components/ui/toast';

interface ScenePanelProps {
  projectId: string;
  chapterId?: string;
  scenes: SceneCard[];
  segments?: DraftSegment[];
  onScenesChange: (scenes: SceneCard[]) => void;
  onRefreshChapters?: () => void;
}

export function ScenePanel({ projectId, chapterId, scenes, segments = [], onScenesChange, onRefreshChapters }: ScenePanelProps) {
  const {
    isPanelCollapsed,
    togglePanelCollapsed,
    selectedSceneId,
    setSelectedSceneId,
    addScene,
    updateScene,
    removeScene,
  } = useSceneStore();

  const [isCreating, setIsCreating] = useState(false);
  const [editingScene, setEditingScene] = useState<SceneCard | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([]);
  const [scenesConfirmed, setScenesConfirmed] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveSceneId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveSceneId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = scenes.findIndex((s) => s.id === active.id);
      const newIndex = scenes.findIndex((s) => s.id === over.id);

      const newScenes = [...scenes];
      const [removed] = newScenes.splice(oldIndex, 1);
      newScenes.splice(newIndex, 0, removed);

      onScenesChange(newScenes);

      // Persist reorder to server
      try {
        await fetch('/api/scenes/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapterId,
            sceneIds: newScenes.map((s) => s.id),
          }),
        });
      } catch (error) {
        console.error('Failed to reorder scenes:', error);
      }
    }
  };

  const handleAddScene = async () => {
    if (!chapterId) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          chapterId,
          title: `场景 ${scenes.length + 1}`,
          summary: '',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        addScene(data.scene);
      }
    } catch (error) {
      console.error('Failed to create scene:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateScene = async (sceneId: string, updates: Partial<SceneCard>) => {
    try {
      const res = await fetch(`/api/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        updateScene(sceneId, data.scene);
      }
    } catch (error) {
      console.error('Failed to update scene:', error);
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    try {
      const res = await fetch(`/api/scenes/${sceneId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        removeScene(sceneId);
      }
    } catch (error) {
      console.error('Failed to delete scene:', error);
    }
  };

  const handleGenerateFromScene = async (sceneId: string) => {
    setIsGenerating(true);
    setGeneratingSceneId(sceneId);
    try {
      const res = await fetch(`/api/scenes/${sceneId}/generate-draft`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        updateScene(sceneId, data.scene);
        onRefreshChapters?.();
        toast.success('正文生成成功');
      } else {
        toast.error('生成失败，请重试');
      }
    } catch (error) {
      console.error('Failed to generate draft:', error);
      toast.error('网络错误，请检查连接');
    } finally {
      setIsGenerating(false);
      setGeneratingSceneId(null);
    }
  };

  const handleMergeSelect = (sceneId: string) => {
    setSelectedMergeIds((prev) =>
      prev.includes(sceneId)
        ? prev.filter((id) => id !== sceneId)
        : [...prev, sceneId]
    );
  };

  const handleMergeScenes = async () => {
    if (selectedMergeIds.length < 2) {
      toast.error('请至少选择 2 个场景进行合并');
      return;
    }
    // TODO: Call API to merge scenes
    toast.success(`已合并 ${selectedMergeIds.length} 个场景`);
    setSelectedMergeIds([]);
  };

  const handleConfirmScenes = () => {
    setScenesConfirmed(true);
    toast.success('场景已确认，锁定状态');
  };

  const handleDiscardScene = async (sceneId: string) => {
    try {
      const res = await fetch(`/api/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'discarded' }),
      });
      if (res.ok) {
        const data = await res.json();
        updateScene(sceneId, data.scene);
      }
    } catch (error) {
      console.error('Failed to discard scene:', error);
    }
  };

  const handleRestoreScene = async (sceneId: string) => {
    try {
      const res = await fetch(`/api/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      if (res.ok) {
        const data = await res.json();
        updateScene(sceneId, data.scene);
      }
    } catch (error) {
      console.error('Failed to restore scene:', error);
    }
  };

  const handleRestoreAsBranch = async (sceneId: string) => {
    // TODO: API call to restore as branch
    toast.success('已从废弃场景恢复为分支');
  };

  const activeSelectedCount = selectedMergeIds.length;

  if (isPanelCollapsed) {
    return (
      <aside className="scene-panel collapsed">
        <button
          type="button"
          onClick={togglePanelCollapsed}
          className="scene-panel-collapsed-bar"
          title="展开 AI 场景助手"
        >
          <span className="scene-panel-collapsed-label">展开 AI 场景助手</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="scene-panel bg-gray-50 border-r border-gray-200 flex flex-col h-full z-10">
      <div className="scene-panel-main flex flex-col h-full">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-1 gap-3">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI 场景助手
              </h3>
              <p className="text-xs text-gray-500 mt-2 mb-3">基于上下文智能生成的写作纲要</p>
            </div>
            <div className="flex items-center gap-2">
              {isGenerating ? (
                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  生成中
                </span>
              ) : (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {scenes.length} 个场景
                </span>
              )}
              <button
                type="button"
                onClick={togglePanelCollapsed}
                className="w-8 h-8 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center"
                title="收起 AI 场景助手"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>
          <div className="text-[11px] text-gray-400 mb-3 flex items-center gap-2">
            <span>拖拽可调整场景顺序</span>
            <span>·</span>
            <span>可标记为草稿 / 已确认 / 已生成 / 已废弃</span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={handleConfirmScenes}
                disabled={scenesConfirmed || scenes.filter(s => s.status !== 'discarded').length === 0}
                className="flex-1 py-2 px-3 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                {scenesConfirmed ? '已确认' : '确认场景'}
              </button>
              <button
                onClick={() => {
                  // Regenerate all scenes - stub
                }}
                className="py-2 px-3 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重新生成
              </button>
            </div>

            <button
              onClick={handleAddScene}
              className="w-full py-2 px-3 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
              disabled={!chapterId || isCreating}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              新增场景
            </button>
          </div>
        </div>

        {/* Scene List with DnD */}
        <div className="flex-1 overflow-y-auto p-4">
          {scenes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">暂无场景</p>
              <p className="text-xs text-gray-400 mt-1">点击上方按钮添加场景</p>
            </div>
          ) : (
            <>
              {/* Merge toolbar */}
              <div className="scene-merge-toolbar mb-3 p-3 bg-white border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">场景演化</div>
                    <div className="text-xs text-gray-500 mt-1">
                      已选 <span className="font-semibold text-gray-900">{activeSelectedCount}</span> 个场景，可用于合并；废弃场景可随时恢复。
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMergeIds([])}
                      className={`px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors ${activeSelectedCount ? '' : 'opacity-50'}`}
                      disabled={!activeSelectedCount}
                    >
                      清空选择
                    </button>
                    <button
                      type="button"
                      onClick={handleMergeScenes}
                      className={`px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors ${activeSelectedCount >= 2 ? '' : 'opacity-50 cursor-not-allowed'}`}
                      disabled={activeSelectedCount < 2}
                    >
                      合并所选
                    </button>
                  </div>
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={scenes.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {scenes.map((scene) => (
                      <SceneCardComponent
                        key={scene.id}
                        scene={scene}
                        isSelected={selectedSceneId === scene.id}
                        isDragged={activeSceneId === scene.id}
                        isGenerating={generatingSceneId === scene.id}
                        isMergeSelected={selectedMergeIds.includes(scene.id)}
                        scenesConfirmed={scenesConfirmed}
                        onSelect={() => setSelectedSceneId(scene.id)}
                        onUpdate={(updates) => handleUpdateScene(scene.id, updates)}
                        onDelete={() => handleDeleteScene(scene.id)}
                        onGenerate={() => handleGenerateFromScene(scene.id)}
                        onEdit={() => setEditingScene(scene)}
                        onMergeSelect={() => handleMergeSelect(scene.id)}
                        onDiscard={() => handleDiscardScene(scene.id)}
                        onRestore={() => handleRestoreScene(scene.id)}
                        onRestoreAsBranch={() => handleRestoreAsBranch(scene.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeSceneId ? (
                    <div className="p-4 bg-white border-2 border-purple-500 rounded-xl shadow-2xl opacity-90 rotate-2">
                      <p className="font-medium text-gray-900 text-sm">
                        {scenes.find((s) => s.id === activeSceneId)?.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">拖放中...</p>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              {/* Scene Source Mapping Section */}
              {scenes.length > 0 && scenes.some(s => s.status === 'generated') && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    来源追踪
                  </div>
                  <div className="space-y-2">
                    {scenes
                      .filter(s => s.status === 'generated' && s.id)
                      .map((scene) => {
                        const mappedSegment = segments.find(seg => seg.sceneId === scene.id);
                        const segmentIndex = mappedSegment ? mappedSegment.segmentIndex + 1 : null;
                        const preview = mappedSegment?.content?.slice(0, 60) || '';
                        return (
                          <button
                            key={scene.id}
                            type="button"
                            onClick={() => {
                              // Dispatch locate event for text-editor to handle
                              window.dispatchEvent(new CustomEvent('locate-scene-in-editor', {
                                detail: { sceneId: scene.id }
                              }));
                            }}
                            className="scene-source-card w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                    {scene.tag || '场景'}
                                  </span>
                                  {segmentIndex && (
                                    <span className="text-[11px] text-gray-500">
                                      正文第{segmentIndex}段
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm font-medium text-gray-900 mb-1">
                                  {scene.title}
                                </div>
                                {preview && (
                                  <div className="text-xs text-gray-600 leading-relaxed">
                                    {preview}...
                                  </div>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-400 whitespace-nowrap">定位</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Generate more scenes button */}
              <button
                type="button"
                onClick={handleAddScene}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2 mt-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                生成更多场景
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <SceneEditModal
        scene={editingScene}
        isOpen={!!editingScene}
        onClose={() => setEditingScene(null)}
        onSave={(updates) => {
          if (editingScene) {
            handleUpdateScene(editingScene.id, updates);
          }
        }}
      />
    </aside>
  );
}

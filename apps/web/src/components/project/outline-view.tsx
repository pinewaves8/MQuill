'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, ProjectCharter, Chapter, VolumeOutline as VolumeOutlineType, ChapterOutline as ChapterOutlineType } from '@packages/shared-types';
import { CharterPanel } from './charter-panel';

interface OutlineViewProps {
  project: Project;
  onSelectChapter: (chapter: Chapter) => void;
  onRefreshChapters: () => void;
}

interface BookOutline {
  volumes: VolumeOutlineType[];
}

const DEFAULT_COLORS = [
  'bg-blue-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-purple-500',
  'bg-emerald-500',
];

export function OutlineView({ project, onSelectChapter, onRefreshChapters }: OutlineViewProps) {
  const [charter, setCharter] = useState<ProjectCharter | null>(null);
  const [showCharter, setShowCharter] = useState(false);
  const [outline, setOutline] = useState<BookOutline | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [editingVolumeId, setEditingVolumeId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [tempVolume, setTempVolume] = useState<VolumeOutlineType | null>(null);
  const [tempChapter, setTempChapter] = useState<ChapterOutlineType | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const charterRes = await fetch(`/api/projects/${project.id}/charter`);
        if (charterRes.ok) {
          const charterData = await charterRes.json();
          setCharter(charterData.charter);
        }

        const outlineRes = await fetch(`/api/projects/${project.id}/outline`);
        if (outlineRes.ok) {
          const outlineData = await outlineRes.json();
          if (outlineData.outline) {
            setOutline(outlineData.outline);
            if (outlineData.outline.volumes?.length > 0) {
              setExpandedVolumes(new Set([outlineData.outline.volumes[0].id]));
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, [project.id]);

  const saveOutline = useCallback(async () => {
    if (!outline) return;
    setIsSaving(true);
    try {
      await fetch(`/api/projects/${project.id}/outline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outline),
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save outline:', error);
    } finally {
      setIsSaving(false);
    }
  }, [outline, project.id]);

  const handleGenerateOutline = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/agents/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      if (res.ok) {
        const data = await res.json();
        const generatedOutline = data.outline;

        if (generatedOutline?.volumes) {
          generatedOutline.volumes.forEach((vol: VolumeOutlineType, idx: number) => {
            if (!vol.color) {
              vol.color = DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
            }
          });
        }

        setOutline(generatedOutline);

        // Auto-save
        await fetch(`/api/projects/${project.id}/outline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generatedOutline),
        });

        if (generatedOutline?.volumes?.length > 0) {
          setExpandedVolumes(new Set([generatedOutline.volumes[0].id]));
        }
      }
    } catch (error) {
      console.error('Failed to generate outline:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportChapters = async () => {
    if (!outline) return;
    setIsImporting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/chapters/from-outline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volumes: outline.volumes }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`成功导入 ${data.count} 个章节到正文`);
        onRefreshChapters();
      }
    } catch (error) {
      console.error('Failed to import chapters:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const updateVolume = (volumeId: string, field: keyof VolumeOutlineType, value: string) => {
    if (!outline) return;
    setOutline({
      ...outline,
      volumes: outline.volumes.map(vol =>
        vol.id === volumeId ? { ...vol, [field]: value } : vol
      ),
    });
    setHasUnsavedChanges(true);
  };

  const updateChapter = (volumeId: string, chapterId: string, field: keyof ChapterOutlineType, value: string) => {
    if (!outline) return;
    setOutline({
      ...outline,
      volumes: outline.volumes.map(vol =>
        vol.id === volumeId
          ? {
              ...vol,
              chapters: vol.chapters.map(ch =>
                ch.id === chapterId ? { ...ch, [field]: value } : ch
              ),
            }
          : vol
      ),
    });
    setHasUnsavedChanges(true);
  };

  const startEditVolume = (volume: VolumeOutlineType) => {
    setEditingVolumeId(volume.id);
    setTempVolume({ ...volume });
  };

  const startEditChapter = (chapter: ChapterOutlineType) => {
    setEditingChapterId(chapter.id);
    setTempChapter({ ...chapter });
  };

  const cancelEditVolume = () => {
    setEditingVolumeId(null);
    setTempVolume(null);
  };

  const cancelEditChapter = () => {
    setEditingChapterId(null);
    setTempChapter(null);
  };

  const saveEditVolume = () => {
    if (!tempVolume || !outline) return;
    setOutline({
      ...outline,
      volumes: outline.volumes.map(vol =>
        vol.id === tempVolume.id ? tempVolume : vol
      ),
    });
    setHasUnsavedChanges(true);
    setEditingVolumeId(null);
    setTempVolume(null);
  };

  const saveEditChapter = (volumeId: string) => {
    if (!tempChapter || !outline) return;
    setOutline({
      ...outline,
      volumes: outline.volumes.map(vol =>
        vol.id === volumeId
          ? {
              ...vol,
              chapters: vol.chapters.map(ch =>
                ch.id === tempChapter.id ? tempChapter : ch
              ),
            }
          : vol
      ),
    });
    setHasUnsavedChanges(true);
    setEditingChapterId(null);
    setTempChapter(null);
  };

  const toggleVolume = (volumeId: string) => {
    setExpandedVolumes((prev) => {
      const next = new Set(prev);
      if (next.has(volumeId)) {
        next.delete(volumeId);
      } else {
        next.add(volumeId);
      }
      return next;
    });
  };

  return (
    <>
      {showCharter ? (
        <CharterPanel projectId={project.id} isOpen={true} />
      ) : (
        <div className="w-[80%] mx-auto py-12 fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">故事大纲</h2>
              <p className="text-sm text-gray-500 mt-1">{project.title}</p>
            </div>
            <div className="flex items-center gap-3">
              {outline && (
                <>
                  <button
                    onClick={handleImportChapters}
                    disabled={isImporting}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isImporting ? '导入中...' : '导入章节到正文'}
                  </button>
                  <button
                    onClick={saveOutline}
                    disabled={isSaving || !hasUnsavedChanges}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? '保存中...' : '保存大纲'}
                    {hasUnsavedChanges && <span className="w-2 h-2 bg-amber-500 rounded-full"></span>}
                  </button>
                </>
              )}
              <button
                onClick={handleGenerateOutline}
                disabled={isGenerating}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    生成中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI 生成大纲
                  </>
                )}
              </button>
              <button
                onClick={() => setShowCharter(true)}
                className="px-4 py-2 bg-purple-100 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-200 transition-colors"
              >
                Charter 设定
              </button>
              <button
                onClick={() => window.location.href = `/projects/${project.id}/editor`}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                打开编辑器
              </button>
            </div>
          </div>

          {/* Outline Content */}
          <div className="space-y-6">
            {/* Project Info */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">项目信息</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-gray-500 block mb-1">类型</span>
                  <span className="text-sm font-medium text-gray-900">
                    {project.bookType === 'novel' && '长篇小说'}
                    {project.bookType === 'short' && '短篇小说'}
                    {project.bookType === 'series' && '系列作品'}
                    {project.bookType === 'nonfiction' && '非虚构'}
                    {project.bookType === 'poetry' && '诗歌'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">篇幅</span>
                  <span className="text-sm font-medium text-gray-900">
                    {project.targetLength === 'short' && '短篇'}
                    {project.targetLength === 'mid' && '中篇'}
                    {project.targetLength === 'long' && '长篇'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">模式</span>
                  <span className="text-sm font-medium text-gray-900">
                    {project.mode === 'auto' && 'AI 主导'}
                    {project.mode === 'co_create' && '协同创作'}
                    {project.mode === 'author_driven' && '作者主导'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">状态</span>
                  <span className="text-sm font-medium text-gray-900">
                    {project.status === 'draft' && '草稿'}
                    {project.status === 'bootstrapping' && '初始化中'}
                    {project.status === 'active' && '进行中'}
                    {project.status === 'paused' && '已暂停'}
                    {project.status === 'completed' && '已完成'}
                    {project.status === 'archived' && '已归档'}
                  </span>
                </div>
              </div>

              {/* Style Keywords */}
              {((project.styleKeywords?.length ?? 0) > 0 || (charter?.styleKeywords?.length ?? 0) > 0) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="text-xs text-gray-500 block mb-2">风格关键词</span>
                  <div className="flex flex-wrap gap-2">
                    {(project.styleKeywords ?? charter?.styleKeywords ?? []).map((keyword, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Core Settings */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">核心设定</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {project.description || charter?.theme || '暂无核心设定，请前往 Charter 设定添加。'}
              </p>
            </div>

            {/* Volume/Chapter Outline */}
            {outline && outline.volumes.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 text-lg">分卷大纲</h3>
                {outline.volumes.map((volume, volIndex) => (
                  <div key={volume.id} className="w-full border border-gray-200 rounded-xl overflow-hidden">
                    {/* Volume Header */}
                    <div
                      className="flex items-center justify-between px-5 py-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleVolume(volume.id)}
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${expandedVolumes.has(volume.id) ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className={`w-2 h-2 ${volume.color} rounded-full`}></span>
                        {editingVolumeId === volume.id ? (
                          <input
                            type="text"
                            value={tempVolume?.title || ''}
                            onChange={(e) => setTempVolume(prev => prev ? { ...prev, title: e.target.value } : null)}
                            onBlur={() => saveEditVolume()}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditVolume()}
                            className="font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="font-medium text-gray-900"
                            onDoubleClick={(e) => { e.stopPropagation(); startEditVolume(volume); }}
                          >
                            {volume.title}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{volume.chapters.length} 章</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditVolume(volume); }}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="编辑卷信息"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Volume Details */}
                    {expandedVolumes.has(volume.id) && (
                      <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-4">
                        {/* Volume Meta - Editable */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">卷目标</span>
                            {editingVolumeId === volume.id ? (
                              <textarea
                                value={tempVolume?.goal || ''}
                                onChange={(e) => setTempVolume(prev => prev ? { ...prev, goal: e.target.value } : null)}
                                className="w-full text-gray-700 bg-white border border-gray-300 rounded p-2 text-xs resize-none"
                                rows={3}
                              />
                            ) : (
                              <span
                                className="text-gray-700 cursor-pointer hover:bg-gray-100 rounded px-1"
                                onDoubleClick={() => startEditVolume(volume)}
                              >
                                {volume.goal}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">卷冲突</span>
                            {editingVolumeId === volume.id ? (
                              <textarea
                                value={tempVolume?.conflict || ''}
                                onChange={(e) => setTempVolume(prev => prev ? { ...prev, conflict: e.target.value } : null)}
                                className="w-full text-gray-700 bg-white border border-gray-300 rounded p-2 text-xs resize-none"
                                rows={3}
                              />
                            ) : (
                              <span
                                className="text-gray-700 cursor-pointer hover:bg-gray-100 rounded px-1"
                                onDoubleClick={() => startEditVolume(volume)}
                              >
                                {volume.conflict}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">卷结果</span>
                            {editingVolumeId === volume.id ? (
                              <textarea
                                value={tempVolume?.result || ''}
                                onChange={(e) => setTempVolume(prev => prev ? { ...prev, result: e.target.value } : null)}
                                className="w-full text-gray-700 bg-white border border-gray-300 rounded p-2 text-xs resize-none"
                                rows={3}
                              />
                            ) : (
                              <span
                                className="text-gray-700 cursor-pointer hover:bg-gray-100 rounded px-1"
                                onDoubleClick={() => startEditVolume(volume)}
                              >
                                {volume.result}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Edit Volume Actions */}
                        {editingVolumeId === volume.id && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={cancelEditVolume}
                              className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
                            >
                              取消
                            </button>
                            <button
                              onClick={saveEditVolume}
                              className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                            >
                              保存修改
                            </button>
                          </div>
                        )}

                        {/* Chapters */}
                        {volume.chapters.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">章节规划</span>
                            <div className="space-y-3">
                              {volume.chapters.map((chapter, chIndex) => (
                                <div
                                  key={chapter.id}
                                  className="bg-white rounded-lg border border-gray-100 p-4 hover:border-gray-200 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-gray-400 w-8">
                                        第{volIndex * 10 + chIndex + 1}章
                                      </span>
                                      {editingChapterId === chapter.id ? (
                                        <input
                                          type="text"
                                          value={tempChapter?.title || ''}
                                          onChange={(e) => setTempChapter(prev => prev ? { ...prev, title: e.target.value } : null)}
                                          onBlur={() => saveEditChapter(volume.id)}
                                          onKeyDown={(e) => e.key === 'Enter' && saveEditChapter(volume.id)}
                                          className="font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                                          autoFocus
                                        />
                                      ) : (
                                        <span
                                          className="font-medium text-gray-900 cursor-pointer hover:bg-gray-50 rounded px-1"
                                          onDoubleClick={() => startEditChapter(chapter)}
                                        >
                                          {chapter.title}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => startEditChapter(chapter)}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="编辑章节"
                                    >
                                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                  </div>

                                  {editingChapterId === chapter.id ? (
                                    <div className="space-y-2 mt-2">
                                      <div>
                                        <span className="text-xs text-gray-400">目标：</span>
                                        <textarea
                                          value={tempChapter?.chapterGoal || ''}
                                          onChange={(e) => setTempChapter(prev => prev ? { ...prev, chapterGoal: e.target.value } : null)}
                                          className="w-full text-xs text-gray-600 bg-white border border-gray-300 rounded p-2 resize-none"
                                          rows={2}
                                        />
                                      </div>
                                      <div>
                                        <span className="text-xs text-gray-400">事件：</span>
                                        <textarea
                                          value={tempChapter?.mainEvents || ''}
                                          onChange={(e) => setTempChapter(prev => prev ? { ...prev, mainEvents: e.target.value } : null)}
                                          className="w-full text-xs text-gray-600 bg-white border border-gray-300 rounded p-2 resize-none"
                                          rows={2}
                                        />
                                      </div>
                                      <div>
                                        <span className="text-xs text-gray-400">人物：</span>
                                        <textarea
                                          value={tempChapter?.characterProgress || ''}
                                          onChange={(e) => setTempChapter(prev => prev ? { ...prev, characterProgress: e.target.value } : null)}
                                          className="w-full text-xs text-gray-600 bg-white border border-gray-300 rounded p-2 resize-none"
                                          rows={2}
                                        />
                                      </div>
                                      <div>
                                        <span className="text-xs text-gray-400">钩子：</span>
                                        <textarea
                                          value={tempChapter?.hook || ''}
                                          onChange={(e) => setTempChapter(prev => prev ? { ...prev, hook: e.target.value } : null)}
                                          className="w-full text-xs text-gray-600 bg-white border border-gray-300 rounded p-2 resize-none"
                                          rows={2}
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2 pt-2">
                                        <button
                                          onClick={cancelEditChapter}
                                          className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
                                        >
                                          取消
                                        </button>
                                        <button
                                          onClick={() => saveEditChapter(volume.id)}
                                          className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                        >
                                          保存修改
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mt-2 min-w-0">
                                      <div>
                                        <span className="text-gray-400">目标：</span>{chapter.chapterGoal}
                                      </div>
                                      <div>
                                        <span className="text-gray-400">事件：</span>{chapter.mainEvents}
                                      </div>
                                      <div>
                                        <span className="text-gray-400">人物：</span>{chapter.characterProgress}
                                      </div>
                                      <div>
                                        <span className="text-gray-400">钩子：</span>{chapter.hook}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!outline && (
              <div className="w-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 mb-2">暂无大纲</p>
                <p className="text-sm text-gray-400">点击"AI 生成大纲"开始生成故事结构</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

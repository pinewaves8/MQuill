'use client';

import { useState, useEffect } from 'react';
import { Project, Chapter, SceneCard } from '@packages/shared-types';
import { CharterPanel } from './charter-panel';

interface OutlineViewProps {
  project: Project;
  onSelectChapter: (chapter: Chapter) => void;
  onRefreshChapters: () => void;
}

interface ChapterWithScenes extends Chapter {
  scenes: SceneCard[];
}

export function OutlineView({ project, onSelectChapter, onRefreshChapters }: OutlineViewProps) {
  const [chapters, setChapters] = useState<ChapterWithScenes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCharter, setShowCharter] = useState(false);

  useEffect(() => {
    const fetchOutline = async () => {
      try {
        // Fetch chapters
        const chaptersRes = await fetch(`/api/projects/${project.id}/chapters`);
        if (!chaptersRes.ok) return;

        const chaptersData = await chaptersRes.json();
        const chaptersList: Chapter[] = chaptersData.chapters || [];

        // Fetch scenes for each chapter
        const chaptersWithScenes = await Promise.all(
          chaptersList.map(async (chapter) => {
            const scenesRes = await fetch(`/api/scenes?chapterId=${chapter.id}`);
            const scenesData = scenesRes.ok ? await scenesRes.json() : { scenes: [] };
            return { ...chapter, scenes: scenesData.scenes as SceneCard[] };
          })
        );

        setChapters(chaptersWithScenes);

        // Auto-expand first chapter
        if (chaptersWithScenes.length > 0) {
          setExpandedChapters(new Set([chaptersWithScenes[0].id]));
        }
      } catch (error) {
        console.error('Failed to fetch outline:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOutline();
  }, [project.id]);

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-100 text-gray-600';
      case 'drafting': return 'bg-blue-100 text-blue-700';
      case 'revising': return 'bg-amber-100 text-amber-700';
      case 'approved': return 'bg-emerald-100 text-emerald-700';
      case 'done': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getSceneStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-600';
      case 'confirmed': return 'bg-amber-50 text-amber-700';
      case 'generated': return 'bg-emerald-50 text-emerald-700';
      case 'discarded': return 'bg-rose-50 text-rose-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {showCharter ? (
        <CharterPanel projectId={project.id} isOpen={true} />
      ) : (
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">项目大纲</h2>
              <p className="text-sm text-gray-500 mt-1">{chapters.length} 个章节</p>
            </div>
            <div className="flex items-center gap-3">
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

      {/* Outline Tree */}
      <div className="space-y-2">
        {chapters.map((chapter, chapterIndex) => (
          <div key={chapter.id} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Chapter Header */}
            <div
              className={`flex items-center justify-between px-4 py-3 bg-white cursor-pointer hover:bg-gray-50 transition-colors ${
                expandedChapters.has(chapter.id) ? 'border-b border-gray-200' : ''
              }`}
              onClick={() => toggleChapter(chapter.id)}
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedChapters.has(chapter.id) ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-xs font-medium text-gray-400 w-12">
                  第{chapterIndex + 1}章
                </span>
                <span className="font-medium text-gray-900">{chapter.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(chapter.status)}`}>
                  {chapter.status === 'planned' && '计划中'}
                  {chapter.status === 'drafting' && '写作中'}
                  {chapter.status === 'revising' && '修订中'}
                  {chapter.status === 'approved' && '已批准'}
                  {chapter.status === 'done' && '已完成'}
                </span>
                <span className="text-xs text-gray-400">
                  {chapter.wordCount.toLocaleString()} 字
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectChapter(chapter);
                  }}
                  className="px-3 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded transition-colors"
                >
                  编辑
                </button>
              </div>
            </div>

            {/* Scenes */}
            {expandedChapters.has(chapter.id) && (
              <div className="bg-gray-50 px-4 py-3 space-y-2">
                {chapter.scenes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">暂无场景</p>
                ) : (
                  chapter.scenes.map((scene, sceneIndex) => (
                    <div
                      key={scene.id}
                      className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-8">
                          {sceneIndex + 1}.
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-700">{scene.title}</p>
                          {scene.summary && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{scene.summary}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${getSceneStatusColor(scene.status)}`}>
                          {scene.status === 'draft' && '草稿'}
                          {scene.status === 'confirmed' && '已确认'}
                          {scene.status === 'generated' && '已生成'}
                          {scene.status === 'discarded' && '已废弃'}
                        </span>
                        {scene.source === 'ai' && (
                          <span className="px-1.5 py-0.5 text-[10px] text-purple-600 bg-purple-50 rounded">
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {chapters.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无章节</p>
          <p className="text-sm text-gray-400 mt-1">点击项目总览中的"AI 生成目录"开始</p>
        </div>
      )}
    </div>
      )}
    </>
  );
}

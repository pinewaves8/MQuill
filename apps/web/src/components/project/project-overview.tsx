'use client';

import { useState, useEffect } from 'react';
import { Project, Chapter, SceneCard, EvaluationIssue } from '@packages/shared-types';

interface ProjectOverviewProps {
  project: Project;
}

interface OverviewStats {
  totalChapters: number;
  totalScenes: number;
  generatedScenes: number;
  totalWords: number;
  openIssues: number;
  highSeverityIssues: number;
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const [stats, setStats] = useState<OverviewStats>({
    totalChapters: 0,
    totalScenes: 0,
    generatedScenes: 0,
    totalWords: 0,
    openIssues: 0,
    highSeverityIssues: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingToc, setIsGeneratingToc] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch chapters
        const chaptersRes = await fetch(`/api/projects/${project.id}/chapters`);
        const chaptersPayload = chaptersRes.ok ? await chaptersRes.json() : { data: { chapters: [] } };
        const chapters: Chapter[] = chaptersPayload.data?.chapters || [];

        // Fetch all scenes and issues for each chapter
        let totalScenes = 0;
        let generatedScenes = 0;
        let totalWords = 0;
        let openIssues = 0;
        let highSeverityIssues = 0;

        for (const chapter of chapters) {
          totalWords += chapter.wordCount;

          // Fetch scenes
          const scenesRes = await fetch(`/api/scenes?chapterId=${chapter.id}`);
          const scenesPayload = scenesRes.ok ? await scenesRes.json() : { data: { scenes: [] } };
          const scenes: SceneCard[] = scenesPayload.data?.scenes || [];
          totalScenes += scenes.length;
          generatedScenes += scenes.filter((s) => s.status === 'generated').length;

          // Fetch issues
          const issuesRes = await fetch(`/api/issues?chapterId=${chapter.id}`);
          const issuesPayload = issuesRes.ok ? await issuesRes.json() : { data: { issues: [] } };
          const issues: EvaluationIssue[] = issuesPayload.data?.issues || [];
          openIssues += issues.filter((i) => i.status === 'open').length;
          highSeverityIssues += issues.filter((i) => i.severity === 'high' && i.status === 'open').length;
        }

        setStats({
          totalChapters: chapters.length,
          totalScenes,
          generatedScenes,
          totalWords,
          openIssues,
          highSeverityIssues,
        });
      } catch (error) {
        console.error('Failed to fetch project stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [project.id]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const completionRate = stats.totalScenes > 0
    ? Math.round((stats.generatedScenes / stats.totalScenes) * 100)
    : 0;

  // Helper to generate chapter titles based on project type
  function generateChapterTitles(projectTitle: string, bookType: string, count: number): string[] {
    const templates: Record<string, string[]> = {
      novel: [
        '楔子', '第一章 缘起', '第二章 相遇', '第三章 波澜', '第四章 转折',
        '第五章 冲突', '第六章 高潮', '第七章 抉择', '第八章 真相', '第九章 落幕', '尾声',
      ],
      default: Array.from({ length: count }, (_, i) => `第${i + 1}章`),
    };

    return templates[bookType] || templates.default;
  }

  const handleGenerateToc = async () => {
    if (stats.totalChapters > 0) {
      alert('已有章节存在，请先删除现有章节或手动添加');
      return;
    }

    setIsGeneratingToc(true);
    try {
      // Generate placeholder chapter titles based on project type
      const chapterCount = 10; // Default number of chapters
      const titles = generateChapterTitles(project.title, project.bookType, chapterCount);

      for (let i = 0; i < titles.length; i++) {
        await fetch(`/api/projects/${project.id}/chapters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            title: titles[i],
          }),
        });
      }

      alert(`已生成 ${titles.length} 个章节`);
      // Refresh the page to show new chapters
      window.location.reload();
    } catch (error) {
      console.error('Failed to generate TOC:', error);
      alert('生成失败，请重试');
    } finally {
      setIsGeneratingToc(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">项目总览</h2>
        <p className="text-sm text-gray-500 mt-1">{project.title}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* 章节数 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalChapters}</p>
              <p className="text-xs text-gray-500">章节</p>
            </div>
          </div>
        </div>

        {/* 总字数 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalWords.toLocaleString()}</p>
              <p className="text-xs text-gray-500">总字数</p>
            </div>
          </div>
        </div>

        {/* 场景完成率 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
              <p className="text-xs text-gray-500">场景完成率</p>
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-purple-600 h-1.5 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4">
        {/* 场景数 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">场景统计</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {stats.generatedScenes} / {stats.totalScenes}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">已生成 / 总数</p>
            </div>
          </div>
        </div>

        {/* 问题统计 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待处理问题</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {stats.openIssues}
              </p>
            </div>
            <div className="text-right">
              {stats.highSeverityIssues > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                  {stats.highSeverityIssues} 严重
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">项目信息</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">类型</p>
            <p className="font-medium text-gray-900">{project.bookType === 'novel' ? '长篇小说' : project.bookType}</p>
          </div>
          <div>
            <p className="text-gray-500">目标字数</p>
            <p className="font-medium text-gray-900">{project.targetLength?.toLocaleString() || '未设置'}</p>
          </div>
          <div>
            <p className="text-gray-500">状态</p>
            <p className="font-medium text-gray-900 capitalize">{project.status}</p>
          </div>
          <div>
            <p className="text-gray-500">创建时间</p>
            <p className="font-medium text-gray-900">
              {new Date(project.createdAt).toLocaleDateString('zh-CN')}
            </p>
          </div>
        </div>
      </div>

      {/* AI 生成目录 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">AI 目录生成</h3>
            <p className="text-xs text-gray-500 mt-1">基于项目类型和风格，生成章节大纲</p>
          </div>
          <button
            onClick={handleGenerateToc}
            disabled={isGeneratingToc}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isGeneratingToc ? (
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                AI 生成目录
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

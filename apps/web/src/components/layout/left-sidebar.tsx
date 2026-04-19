'use client';

import { Project, Chapter } from '@packages/shared-types';

interface LeftSidebarProps {
  projectId: string;
  project: Project | null;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  activeTab: 'chapters' | 'outline' | 'versions' | 'evaluation';
  onTabChange: (tab: 'chapters' | 'outline' | 'versions' | 'evaluation') => void;
  onSelectChapter: (chapter: Chapter) => void;
}

export function LeftSidebar({
  projectId,
  project,
  chapters,
  currentChapter,
  activeTab,
  onTabChange,
  onSelectChapter,
}: LeftSidebarProps) {
  const coverToneColors: Record<string, string> = {
    amber: 'bg-amber-100',
    emerald: 'bg-emerald-100',
    blue: 'bg-blue-100',
    purple: 'bg-purple-100',
    slate: 'bg-slate-200',
    rose: 'bg-rose-100',
  };

  const bookIcon = project?.title?.charAt(0) || '新';

  return (
    <aside className="w-sidebar bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden z-20 shadow-sm">
      {/* Header - Fixed at top */}
      <div className="shrink-0 p-4 border-b border-gray-100">
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回作品列表
        </button>

        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-serif text-base ${
              coverToneColors[project?.coverTone || 'amber'] || coverToneColors.amber
            }`}
          >
            {bookIcon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-900 text-base leading-tight truncate">
              {project?.title || '加载中...'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {project?.bookType === 'novel' ? '长篇小说' : '其他'}
            </p>
          </div>
        </div>
      </div>

      {/* Middle scroll area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="py-4">
          {/* Project section */}
          <section className="px-3 pb-4 border-b border-gray-100">
            <div className="px-1 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              项目
            </div>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => onTabChange('outline')}
                  className={`nav-btn w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                    activeTab === 'outline'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg
                    className={`w-4 h-4 ${activeTab === 'outline' ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  大纲
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('chapters')}
                  className={`nav-btn w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                    activeTab === 'chapters'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg
                    className={`w-4 h-4 ${activeTab === 'chapters' ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  章节
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('versions')}
                  className={`nav-btn w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                    activeTab === 'versions'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg
                    className={`w-4 h-4 ${activeTab === 'versions' ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  版本
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('evaluation')}
                  className={`nav-btn w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                    activeTab === 'evaluation'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg
                    className={`w-4 h-4 ${activeTab === 'evaluation' ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  评估
                </button>
              </li>
              <li>
                <a
                  href={`/projects/${projectId}/settings`}
                  className="nav-btn w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors group text-gray-600 hover:bg-gray-50"
                >
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  设置
                </a>
              </li>
            </ul>
          </section>

          {/* Chapters section */}
          <section className="px-3 pt-4">
            {/* Sticky chapter list header */}
            <div className="sticky top-0 z-10 bg-white flex items-center justify-between mb-3 px-1 py-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">目录</span>
              <button
                onClick={async () => {
                  if (!projectId) return;
                  try {
                    const res = await fetch(`/api/projects/${projectId}/chapters`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        projectId,
                        title: '未命名章节',
                      }),
                    });
                    if (res.ok) {
                      const payload = await res.json();
                      const chaptersRes = await fetch(`/api/projects/${projectId}/chapters`);
                      if (chaptersRes.ok) {
                        const chaptersPayload = await chaptersRes.json();
                        window.dispatchEvent(new CustomEvent('chapters-refresh', { detail: chaptersPayload.data?.chapters || [] }));
                      }
                      if (payload.data?.chapter) {
                        onSelectChapter(payload.data.chapter);
                      }
                    }
                  } catch (error) {
                    console.error('Failed to create chapter:', error);
                  }
                }}
                className="text-xs text-gray-900 hover:text-gray-600 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                新增
              </button>
            </div>

            {/* Chapter list */}
            <div className="space-y-1">
              {chapters.map((chapter, index) => (
                <div
                  key={chapter.id}
                  onClick={() => onSelectChapter(chapter)}
                  className={`chapter-item px-3 py-2.5 rounded-lg cursor-pointer transition-all group ${
                    currentChapter?.id === chapter.id ? 'active' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-400">
                      第{index + 1}章
                    </span>
                    <span className="text-xs text-gray-400">
                      {chapter.wordCount.toLocaleString()} 字
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate chapter-title-display">
                    {chapter.title}
                  </h3>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* User - Fixed at bottom */}
      <div className="shrink-0 p-4 border-t border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
            alt="User"
            className="w-8 h-8 rounded-full bg-gray-200"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">一叶渡烟岚</p>
            <p className="text-xs text-gray-500 truncate">Pro 会员</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

'use client';

import { useState } from 'react';
import { Project } from '@packages/shared-types';

interface ProjectCardProps {
  project: Project;
  statusLabel: string;
  onDelete?: (projectId: string) => void;
}

const coverToneColors: Record<string, string> = {
  amber: 'from-amber-100 to-orange-50',
  emerald: 'from-emerald-100 to-teal-50',
  blue: 'from-blue-100 to-indigo-50',
  purple: 'from-purple-100 to-pink-50',
  slate: 'from-slate-200 to-gray-100',
  rose: 'from-rose-100 to-red-50',
};

export function ProjectCard({ project, statusLabel, onDelete }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const colorClass = coverToneColors[project.coverTone || 'amber'] || coverToneColors.amber;
  const firstChar = project.title.charAt(0);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete?.(project.id);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setShowMenu(false);
    }
  };

  return (
    <>
      <div
        className="book-card bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer group relative"
        onClick={() => {
          window.location.href = `/projects/${project.id}/editor`;
        }}
      >
        {/* Cover */}
        <div className={`h-40 bg-gradient-to-br ${colorClass} relative overflow-hidden`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-serif text-gray-800/10 select-none">{firstChar}</span>
          </div>
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 bg-white/90 backdrop-blur text-xs font-medium text-gray-700 rounded-full shadow-sm">
              {statusLabel}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
        </div>

        {/* Info */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-lg font-bold text-gray-900 group-hover:text-amber-700 transition-colors">
              {project.title}
            </h4>
            <div className="relative">
              <button
                className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div
                  className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-32"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => {
                      window.location.href = `/projects/${project.id}/settings`;
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    项目设置
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setShowMenu(false);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    删除项目
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
            {project.description || '暂无描述'}
          </p>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                0 章
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatRelativeTime(project.updatedAt)}
              </span>
            </div>
            <span className="text-amber-600 font-medium">
              {project.wordCount.toLocaleString()} 字
            </span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">删除项目</h3>
                <p className="text-sm text-gray-500">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              确定要删除「<span className="font-medium">{project.title}</span>」吗？所有章节、场景和内容都将被永久删除。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) {
    return `${Math.floor(days / 30)}个月前`;
  } else if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
}

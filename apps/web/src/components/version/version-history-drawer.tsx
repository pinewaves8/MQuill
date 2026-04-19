'use client';

import { useState, useEffect } from 'react';
import { VersionRecord } from '@packages/shared-types';

interface VersionHistoryDrawerProps {
  chapterId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectVersion: (version: VersionRecord) => void;
  onRestoreVersion: (versionId: string) => void;
}

export function VersionHistoryDrawer({
  chapterId,
  isOpen,
  onClose,
  onSelectVersion,
  onRestoreVersion,
}: VersionHistoryDrawerProps) {
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && chapterId) {
      fetchVersions();
    }
  }, [isOpen, chapterId]);

  const fetchVersions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}/versions`);
      if (res.ok) {
        const payload = await res.json();
        setVersions(payload.data?.versions || []);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('确定要恢复到这个版本吗？当前内容会作为备份保存。')) return;

    try {
      const res = await fetch(`/api/versions/${versionId}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        alert('版本已恢复');
        onRestoreVersion(versionId);
        onClose();
      }
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-md bg-white shadow-2xl h-full flex flex-col fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">版本历史</h3>
            <p className="text-xs text-gray-500 mt-0.5">{versions.length} 个版本</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Version List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <span className="text-gray-500">加载中...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">暂无版本记录</p>
              <p className="text-xs text-gray-400 mt-1">保存正文后会自动创建版本</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${
                    selectedVersionId === version.id ? 'bg-purple-50' : ''
                  }`}
                  onClick={() => setSelectedVersionId(version.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {version.label}
                        </h4>
                        {version.isCurrent && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                            当前
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {version.type === 'manual' && '手动保存'}
                        {version.type === 'autosave' && '自动保存'}
                        {version.type === 'revision' && '修订'}
                        {version.type === 'branch' && '分支'}
                        {version.type === 'current' && '当前'}
                      </p>
                      {version.summary && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{version.summary}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-gray-400">
                        {new Date(version.createdAt).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {version.wordCount.toLocaleString()} 字
                      </div>
                    </div>
                  </div>

                  {selectedVersionId === version.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVersion(version);
                        }}
                        className="flex-1 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        查看内容
                      </button>
                      {!version.isCurrent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(version.id);
                          }}
                          className="flex-1 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        >
                          恢复此版本
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { VersionRecord } from '@packages/shared-types';
import { DiffViewer, DiffSummary } from '@/components/version/diff-viewer';
import { VersionHistoryDrawer } from '@/components/version/version-history-drawer';

export default function VersionsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<[VersionRecord | null, VersionRecord | null]>([null, null]);
  const [compareResult, setCompareResult] = useState<{
    versionA: VersionRecord;
    versionB: VersionRecord;
    diffOperations: { type: 'add' | 'remove' | 'same'; text: string }[];
  } | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    const fetchVersions = async () => {
      // Get first chapter's versions as example
      try {
        const chaptersRes = await fetch(`/api/projects/${projectId}/chapters`);
        if (chaptersRes.ok) {
          const data = await chaptersRes.json();
          if (data.chapters?.length > 0) {
            const chapterId = data.chapters[0].id;
            const versionsRes = await fetch(`/api/chapters/${chapterId}/versions`);
            if (versionsRes.ok) {
              const versionsData = await versionsRes.json();
              setVersions(versionsData.versions || []);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch versions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersions();
  }, [projectId]);

  const handleCompare = async () => {
    if (!selectedVersions[0] || !selectedVersions[1]) return;

    setIsComparing(true);
    try {
      const res = await fetch('/api/versions/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionIdA: selectedVersions[0].id,
          versionIdB: selectedVersions[1].id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCompareResult(data);
      }
    } catch (error) {
      console.error('Failed to compare versions:', error);
    } finally {
      setIsComparing(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    try {
      const res = await fetch(`/api/versions/${versionId}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        alert('版本已恢复');
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href={`/projects/${projectId}/editor`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回编辑器
            </a>
            <h1 className="text-xl font-bold text-gray-900">版本比较</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Version Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">选择要比较的版本</h2>

          <div className="grid grid-cols-2 gap-6">
            {/* Version A */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                版本 A（较旧）
              </label>
              <select
                value={selectedVersions[0]?.id || ''}
                onChange={(e) => {
                  const version = versions.find((v) => v.id === e.target.value);
                  setSelectedVersions([version || null, selectedVersions[1]]);
                  setCompareResult(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">选择版本...</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} - {formatDate(v.createdAt)} ({v.wordCount}字)
                  </option>
                ))}
              </select>
            </div>

            {/* Version B */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                版本 B（较新）
              </label>
              <select
                value={selectedVersions[1]?.id || ''}
                onChange={(e) => {
                  const version = versions.find((v) => v.id === e.target.value);
                  setSelectedVersions([selectedVersions[0], version || null]);
                  setCompareResult(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">选择版本...</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} - {formatDate(v.createdAt)} ({v.wordCount}字)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCompare}
              disabled={!selectedVersions[0] || !selectedVersions[1] || isComparing}
              className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isComparing ? '比较中...' : '开始比较'}
            </button>
          </div>
        </div>

        {/* Comparison Result */}
        {compareResult && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">比较结果</h2>
              <DiffSummary
                addedCount={compareResult.diffOperations.filter((op) => op.type === 'add').length}
                removedCount={compareResult.diffOperations.filter((op) => op.type === 'remove').length}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{compareResult.versionA.label}</p>
                <p className="text-gray-500">{formatDate(compareResult.versionA.createdAt)}</p>
                <p className="text-gray-500">{compareResult.versionA.wordCount.toLocaleString()} 字</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{compareResult.versionB.label}</p>
                <p className="text-gray-500">{formatDate(compareResult.versionB.createdAt)}</p>
                <p className="text-gray-500">{compareResult.versionB.wordCount.toLocaleString()} 字</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              <DiffViewer operations={compareResult.diffOperations} />
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => handleRestore(compareResult.versionA.id)}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                恢复到版本 A
              </button>
              <button
                onClick={() => handleRestore(compareResult.versionB.id)}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                恢复到版本 B
              </button>
            </div>
          </div>
        )}

        {/* Version History List */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">版本历史</h2>

          {versions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">暂无版本记录</p>
              <p className="text-sm text-gray-400 mt-1">保存正文后会自动创建版本</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{version.label}</h3>
                      {version.isCurrent && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                          当前
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {version.type === 'manual' && '手动保存'}
                      {version.type === 'autosave' && '自动保存'}
                      {version.type === 'revision' && '修订'}
                      {version.type === 'branch' && '分支'}
                      {version.type === 'current' && '当前'}
                      {' · '}
                      {formatDate(version.createdAt)}
                      {' · '}
                      {version.wordCount.toLocaleString()} 字
                    </p>
                    {version.summary && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-1">{version.summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedVersions([
                          versions.find((v) => v.id !== version.id) || null,
                          version,
                        ]);
                        setCompareResult(null);
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    >
                      比较
                    </button>
                    {!version.isCurrent && (
                      <button
                        onClick={() => handleRestore(version.id)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        恢复
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

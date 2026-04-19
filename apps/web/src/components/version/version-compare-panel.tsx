'use client';

import { useState, useEffect } from 'react';
import { VersionRecord } from '@packages/shared-types';

interface VersionComparePanelProps {
  leftVersion: VersionRecord | null;
  rightVersion: VersionRecord | null;
  onLeftChange: (version: VersionRecord | null) => void;
  onRightChange: (version: VersionRecord | null) => void;
  versions: VersionRecord[];
}

export function VersionComparePanel({
  leftVersion,
  rightVersion,
  onLeftChange,
  onRightChange,
  versions,
}: VersionComparePanelProps) {
  const [viewMode, setViewMode] = useState<'content' | 'diff'>('content');
  const [diffResult, setDiffResult] = useState<{
    operations: { type: 'add' | 'remove' | 'same'; text: string }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-fetch diff when in diff mode
  useEffect(() => {
    if (viewMode === 'diff' && leftVersion && rightVersion && leftVersion.id !== rightVersion.id) {
      fetchDiff();
    }
  }, [viewMode, leftVersion, rightVersion]);

  const fetchDiff = async () => {
    if (!leftVersion || !rightVersion) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/versions/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftVersionId: leftVersion.id,
          rightVersionId: rightVersion.id,
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        setDiffResult(payload.data?.diff || null);
      }
    } catch (error) {
      console.error('Failed to compare versions:', error);
    } finally {
      setIsLoading(false);
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

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'manual':
        return '手动保存';
      case 'autosave':
        return '自动保存';
      case 'revision':
        return '修订';
      case 'branch':
        return '分支';
      case 'current':
        return '当前';
      case 'baseline':
        return '基线';
      default:
        return type || '-';
    }
  };

  const renderVersionContent = (version: VersionRecord, isLeft: boolean) => (
    <div className={`flex flex-col h-full overflow-hidden min-h-0 ${isLeft ? 'bg-gray-50' : 'bg-white'}`}>
      {/* Version Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900">{version.label}</h4>
          {version.isCurrent && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              当前
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
          <span>{formatDate(version.createdAt)}</span>
          <span>·</span>
          <span>{version.wordCount.toLocaleString()} 字</span>
          <span>·</span>
          <span>{getTypeLabel(version.type)}</span>
        </div>
        {version.source && (
          <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block">
            来源：{version.source}
          </div>
        )}
        {version.branchName && (
          <div className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded inline-block ml-1">
            分支：{version.branchName}
          </div>
        )}
        {version.summary && (
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">{version.summary}</p>
        )}
      </div>

      {/* Version Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
          {version.snapshotContent || '(空)'}
        </div>
      </div>
    </div>
  );

  const renderDiffContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-500">加载中...</span>
        </div>
      );
    }

    if (!diffResult) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          暂无差异
        </div>
      );
    }

    const addedCount = diffResult.operations.filter((op) => op.type === 'add').length;
    const removedCount = diffResult.operations.filter((op) => op.type === 'remove').length;

    return (
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-3 flex items-center gap-4 text-sm">
          <span className="text-green-600">+{addedCount} 行</span>
          <span className="text-red-600">-{removedCount} 行</span>
        </div>
        <div className="text-sm leading-relaxed">
          {diffResult.operations.map((op, idx) => {
            if (op.type === 'same') {
              return (
                <span key={idx} className="text-gray-700">
                  {op.text}
                </span>
              );
            } else if (op.type === 'add') {
              return (
                <span key={idx} className="bg-green-100 text-green-800">
                  {op.text}
                </span>
              );
            } else {
              return (
                <span key={idx} className="bg-red-100 text-red-800 line-through">
                  {op.text}
                </span>
              );
            }
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Version Selectors */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">版本 A</label>
          <select
            value={leftVersion?.id || ''}
            onChange={(e) => {
              const version = versions.find((v) => v.id === e.target.value);
              onLeftChange(version || null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none text-sm"
          >
            <option value="">选择版本...</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id} disabled={v.id === rightVersion?.id}>
                {v.label} · {formatDate(v.createdAt)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">版本 B</label>
          <select
            value={rightVersion?.id || ''}
            onChange={(e) => {
              const version = versions.find((v) => v.id === e.target.value);
              onRightChange(version || null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none text-sm"
          >
            <option value="">选择版本...</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id} disabled={v.id === leftVersion?.id}>
                {v.label} · {formatDate(v.createdAt)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* View Mode Toggle */}
      {leftVersion && rightVersion && leftVersion.id !== rightVersion.id && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setViewMode('content')}
            className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
              viewMode === 'content'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            内容对比
          </button>
          <button
            onClick={() => setViewMode('diff')}
            className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
              viewMode === 'diff'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            差异视图
          </button>
        </div>
      )}

      {/* Content Area */}
      {!leftVersion || !rightVersion ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          选择两个版本以开始比较
        </div>
      ) : leftVersion.id === rightVersion.id ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          请选择两个不同的版本
        </div>
      ) : viewMode === 'content' ? (
        <div className="flex-1 grid grid-cols-\[1fr_1px_1fr\] border border-gray-200 rounded-2xl overflow-hidden min-h-0">
          <div className="overflow-hidden">{renderVersionContent(leftVersion, true)}</div>
          <div className="bg-gray-200" />
          <div className="overflow-hidden">{renderVersionContent(rightVersion, false)}</div>
        </div>
      ) : (
        <div className="flex-1 border border-gray-200 rounded-2xl overflow-hidden bg-white">
          {renderDiffContent()}
        </div>
      )}
    </div>
  );
}

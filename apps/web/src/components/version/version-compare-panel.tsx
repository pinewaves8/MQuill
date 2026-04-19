'use client';

import { useEffect, useState } from 'react';
import { VersionRecord } from '@packages/shared-types';

import { DiffSummary, DiffViewer } from './diff-viewer';

interface VersionComparePanelProps {
  leftVersion: VersionRecord | null;
  rightVersion: VersionRecord | null;
  onLeftChange: (version: VersionRecord | null) => void;
  onRightChange: (version: VersionRecord | null) => void;
  versions: VersionRecord[];
}

interface DiffResult {
  operations: Array<{ type: 'add' | 'remove' | 'same'; text: string }>;
}

export function VersionComparePanel({
  leftVersion,
  rightVersion,
  onLeftChange,
  onRightChange,
  versions,
}: VersionComparePanelProps) {
  const [viewMode, setViewMode] = useState<'content' | 'diff'>('content');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (viewMode === 'diff' && leftVersion && rightVersion && leftVersion.id !== rightVersion.id) {
      void fetchDiff();
    }
  }, [viewMode, leftVersion, rightVersion]);

  const fetchDiff = async () => {
    if (!leftVersion || !rightVersion) {
      return;
    }

    setIsLoading(true);
    setDiffError(null);

    try {
      const response = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftVersionId: leftVersion.id,
          rightVersionId: rightVersion.id,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          typeof payload?.error === 'string' ? payload.error : 'Failed to compare versions'
        );
      }

      const payload = await response.json();
      setDiffResult(payload.data?.diff ?? null);
    } catch (error) {
      console.error('Failed to compare versions:', error);
      setDiffResult(null);
      setDiffError(error instanceof Error ? error.message : 'Failed to compare versions');
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
    <div className={`flex flex-col ${isLeft ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="border-b border-gray-200 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h4 className="font-medium text-gray-900">{version.label}</h4>
          {version.isCurrent && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              当前
            </span>
          )}
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>{formatDate(version.createdAt)}</span>
          <span>·</span>
          <span>{version.wordCount.toLocaleString()} 字</span>
          <span>·</span>
          <span>{getTypeLabel(version.type)}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {version.source && (
            <div className="inline-block rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
              来源: {version.source}
            </div>
          )}
          {version.branchName && (
            <div className="inline-block rounded bg-purple-50 px-2 py-1 text-xs text-purple-700">
              分支: {version.branchName}
            </div>
          )}
        </div>

        {version.summary && (
          <p className="mt-2 text-xs leading-relaxed text-gray-500">{version.summary}</p>
        )}
      </div>

      <div className="p-4">
        <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-700">
          {version.snapshotContent || '(空)'}
        </div>
      </div>
    </div>
  );

  const renderDiffContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-gray-500">加载中...</span>
        </div>
      );
    }

    if (!diffResult) {
      return (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
          {diffError || '暂无差异'}
        </div>
      );
    }

    const addedCount = diffResult.operations.filter((operation) => operation.type === 'add').length;
    const removedCount = diffResult.operations.filter((operation) => operation.type === 'remove').length;

    return (
      <div className="flex flex-col p-4">
        <div className="mb-3">
          <DiffSummary addedCount={addedCount} removedCount={removedCount} />
        </div>
        <DiffViewer
          operations={diffResult.operations}
          originalText={leftVersion?.snapshotContent}
          revisedText={rightVersion?.snapshotContent}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">版本 A</label>
          <select
            value={leftVersion?.id || ''}
            onChange={(event) => {
              const version = versions.find((item) => item.id === event.target.value);
              onLeftChange(version || null);
            }}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
          >
            <option value="">选择版本...</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id} disabled={version.id === rightVersion?.id}>
                {version.label} · {formatDate(version.createdAt)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">版本 B</label>
          <select
            value={rightVersion?.id || ''}
            onChange={(event) => {
              const version = versions.find((item) => item.id === event.target.value);
              onRightChange(version || null);
            }}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
          >
            <option value="">选择版本...</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id} disabled={version.id === leftVersion?.id}>
                {version.label} · {formatDate(version.createdAt)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {leftVersion && rightVersion && leftVersion.id !== rightVersion.id && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setViewMode('content')}
            className={`rounded-lg px-4 py-1.5 text-sm transition-colors ${
              viewMode === 'content'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            内容对比
          </button>
          <button
            onClick={() => setViewMode('diff')}
            className={`rounded-lg px-4 py-1.5 text-sm transition-colors ${
              viewMode === 'diff'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            差异视图
          </button>
        </div>
      )}

      {!leftVersion || !rightVersion ? (
        <div className="flex min-h-[240px] items-center justify-center text-sm text-gray-400">
          选择两个版本以开始比较
        </div>
      ) : leftVersion.id === rightVersion.id ? (
        <div className="flex min-h-[240px] items-center justify-center text-sm text-gray-400">
          请选择两个不同的版本
        </div>
      ) : viewMode === 'content' ? (
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-gray-200 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
          <div>{renderVersionContent(leftVersion, true)}</div>
          <div className="hidden bg-gray-200 md:block" />
          <div>{renderVersionContent(rightVersion, false)}</div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white">
          {renderDiffContent()}
        </div>
      )}
    </div>
  );
}

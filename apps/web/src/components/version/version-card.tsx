'use client';

import { VersionRecord } from '@packages/shared-types';

interface VersionCardProps {
  version: VersionRecord;
  isSelected?: boolean;
  isComparing?: boolean;
  onSelect: (version: VersionRecord) => void;
  onCompare?: (version: VersionRecord) => void;
  onRestore?: (version: VersionRecord) => void;
  onBranch?: (version: VersionRecord) => void;
  showActions?: boolean;
}

export function VersionCard({
  version,
  isSelected,
  isComparing,
  onSelect,
  onCompare,
  onRestore,
  onBranch,
  showActions = true,
}: VersionCardProps) {
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
        return '编辑中';
      case 'baseline':
        return '基线';
      default:
        return type || '未知';
    }
  };

  return (
    <div
      className={`p-4 border rounded-xl cursor-pointer transition-all ${
        isSelected
          ? 'border-purple-500 bg-purple-50'
          : isComparing
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      } ${version.isCurrent ? 'bg-white' : 'bg-gray-50'}`}
      onClick={() => onSelect(version)}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Left: Icon + Title */}
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              version.isCurrent ? 'bg-green-100' : 'bg-gray-200'
            }`}
          >
            <svg
              className={`w-5 h-5 ${version.isCurrent ? 'text-green-600' : 'text-gray-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900">{version.label}</h4>
              {version.isCurrent && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  当前
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(version.createdAt)} · {version.wordCount.toLocaleString()} 字
            </p>
          </div>
        </div>

        {/* Right: Type Badge */}
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          version.isCurrent
            ? 'bg-green-100 text-green-700'
            : version.type === 'baseline'
            ? 'bg-green-100 text-green-700'
            : version.type === 'revision'
            ? 'bg-blue-100 text-blue-700'
            : version.type === 'branch'
            ? 'bg-orange-100 text-orange-700'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {getTypeLabel(version.type)}
        </span>
      </div>

      {/* Source & Branch Tags */}
      {(version.source || version.branchName) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {version.source && (
            <span className="px-2 py-1 bg-blue-50 text-xs text-blue-700 rounded">
              来源：{version.source}
            </span>
          )}
          {version.branchName && (
            <span className="px-2 py-1 bg-purple-50 text-xs text-purple-700 rounded">
              分支：{version.branchName}
            </span>
          )}
        </div>
      )}

      {/* Summary */}
      {version.summary && (
        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
          {version.summary}
        </p>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-gray-200">
          {!version.isCurrent && onRestore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestore(version);
              }}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              恢复此版本
            </button>
          )}

          {!version.isCurrent && onBranch && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBranch(version);
              }}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              另存为分支
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onCompare?.(version);
            }}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            加入比较
          </button>
        </div>
      )}
    </div>
  );
}

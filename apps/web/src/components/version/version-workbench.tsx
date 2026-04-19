'use client';

import { useState, useEffect } from 'react';
import { Chapter, VersionRecord } from '@packages/shared-types';
import { VersionCard } from './version-card';
import { VersionComparePanel } from './version-compare-panel';
import { SaveVersionModal } from './save-version-modal';
import { CreateBranchModal } from './create-branch-modal';

interface VersionWorkbenchProps {
  projectId: string;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  onClose?: () => void;
}

export function VersionWorkbench({ projectId, chapters, currentChapter, onClose }: VersionWorkbenchProps) {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(currentChapter?.id || null);
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Comparison state
  const [leftVersion, setLeftVersion] = useState<VersionRecord | null>(null);
  const [rightVersion, setRightVersion] = useState<VersionRecord | null>(null);

  // Modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [branchVersion, setBranchVersion] = useState<VersionRecord | null>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);

  // Sync with currentChapter from sidebar - when user selects a chapter, workbench follows
  useEffect(() => {
    if (currentChapter) {
      setSelectedChapterId(currentChapter.id);
    }
  }, [currentChapter?.id]);

  // Fetch versions when selectedChapterId changes
  useEffect(() => {
    if (!selectedChapterId) {
      setVersions([]);
      setLeftVersion(null);
      setRightVersion(null);
      setIsLoading(false);
      return;
    }

    const fetchVersions = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/chapters/${selectedChapterId}/versions`);
        if (res.ok) {
          const payload = await res.json();
          const fetchedVersions = payload.data?.versions || [];
          setVersions(fetchedVersions);

          // Auto-select: current version (left) vs previous version (right)
          // Versions are sorted with current first (index 0), previous is index 1
          setLeftVersion(fetchedVersions[0] || null);
          setRightVersion(fetchedVersions[1] || null);
        }
      } catch (error) {
        console.error('Failed to fetch versions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersions();
  }, [selectedChapterId]);

  const handleVersionSelect = (version: VersionRecord) => {
    if (!leftVersion) {
      setLeftVersion(version);
    } else if (!rightVersion || rightVersion.id === leftVersion.id) {
      setRightVersion(version);
    } else {
      setRightVersion(version);
    }
  };

  const handleCompare = (version: VersionRecord) => {
    if (!leftVersion) {
      setLeftVersion(version);
    } else {
      setRightVersion(version);
    }
  };

  const handleRestore = async (version: VersionRecord) => {
    if (!confirm(`确定要恢复到「${version.label}」吗？当前内容会作为备份保存。`)) return;

    try {
      const res = await fetch(`/api/versions/${version.id}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        alert('版本已恢复');
        // Refresh versions
        if (selectedChapterId) {
          const versionsRes = await fetch(`/api/chapters/${selectedChapterId}/versions`);
          if (versionsRes.ok) {
            const payload = await versionsRes.json();
            setVersions(payload.data?.versions || []);
          }
        }
      }
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  const handleBranch = (version: VersionRecord) => {
    setBranchVersion(version);
    setShowBranchModal(true);
  };

  const handleBranchSuccess = async () => {
    alert('分支已创建');
    if (selectedChapterId) {
      const versionsRes = await fetch(`/api/chapters/${selectedChapterId}/versions`);
      if (versionsRes.ok) {
        const payload = await versionsRes.json();
        setVersions(payload.data?.versions || []);
      }
    }
  };

  const handleSaveSuccess = async () => {
    if (selectedChapterId) {
      const versionsRes = await fetch(`/api/chapters/${selectedChapterId}/versions`);
      if (versionsRes.ok) {
        const payload = await versionsRes.json();
        setVersions(payload.data?.versions || []);
      }
    }
  };

  const clearComparison = () => {
    setLeftVersion(null);
    setRightVersion(null);
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                返回
              </button>
            )}
            <h1 className="text-xl font-bold text-gray-900">版本工作台</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Chapter Selector */}
            <select
              value={selectedChapterId || ''}
              onChange={(e) => setSelectedChapterId(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="">选择章节...</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>

            {/* Save Button */}
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={!selectedChapterId}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              保存当前为新版本
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-gray-500">加载中...</span>
          </div>
        ) : !selectedChapterId ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-gray-500">请选择要查看的章节</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-10">
            {/* Left Panel: Version History */}
            <div className="xl:col-span-4 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
                <h2 className="font-semibold text-gray-900">
                  版本历史
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {versions.length} 个版本
                  </span>
                </h2>
              </div>

              <div className="p-4">
                {versions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">暂无版本记录</p>
                    <p className="text-sm text-gray-400 mt-1">保存正文或生成内容后会自动创建版本</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versions.map((version) => (
                      <VersionCard
                        key={version.id}
                        version={version}
                        isSelected={
                          leftVersion?.id === version.id || rightVersion?.id === version.id
                        }
                        isComparing={false}
                        onSelect={handleVersionSelect}
                        onCompare={() => handleCompare(version)}
                        onRestore={handleRestore}
                        onBranch={handleBranch}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Comparison */}
            <div className="xl:col-span-6 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">版本比较</h2>
                {(leftVersion || rightVersion) && (
                  <button
                    onClick={clearComparison}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    清除选择
                  </button>
                )}
              </div>

              <div className="p-4">
                <VersionComparePanel
                  leftVersion={leftVersion}
                  rightVersion={rightVersion}
                  onLeftChange={setLeftVersion}
                  onRightChange={setRightVersion}
                  versions={versions}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedChapterId && (
        <SaveVersionModal
          chapterId={selectedChapterId}
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSuccess={handleSaveSuccess}
        />
      )}

      <CreateBranchModal
        version={branchVersion}
        isOpen={showBranchModal}
        onClose={() => {
          setShowBranchModal(false);
          setBranchVersion(null);
        }}
        onSuccess={handleBranchSuccess}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { VersionRecord } from '@packages/shared-types';

interface CreateBranchModalProps {
  version: VersionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (branchName: string) => void;
}

export function CreateBranchModal({ version, isOpen, onClose, onSuccess }: CreateBranchModalProps) {
  const [branchName, setBranchName] = useState('');
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !version) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      setError('请输入分支名称');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/versions/${version.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: branchName.trim(),
          summary: summary.trim() || undefined,
        }),
      });

      if (res.ok) {
        onSuccess(branchName.trim());
        onClose();
        setBranchName('');
        setSummary('');
      } else {
        const data = await res.json();
        setError(data.error || '创建失败');
      }
    } catch (err) {
      setError('创建失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 fade-in">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">创建分支版本</h3>
          <p className="text-sm text-gray-500 mt-1">
            基于「{version.label}」创建分支，不会影响主线内容
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                分支名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="例如：修订方案A"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                maxLength={120}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                分支说明
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="描述这个分支的目的..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !branchName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {isSubmitting ? '创建中...' : '创建分支'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

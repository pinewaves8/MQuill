'use client';

import { useState, useEffect } from 'react';
import { SceneCard } from '@packages/shared-types';

interface SceneEditModalProps {
  scene: SceneCard | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<SceneCard>) => void;
}

export function SceneEditModal({ scene, isOpen, onClose, onSave }: SceneEditModalProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<SceneCard['status']>('draft');

  useEffect(() => {
    if (scene) {
      setTitle(scene.title);
      setSummary(scene.summary || '');
      setStatus(scene.status);
    }
  }, [scene]);

  if (!isOpen || !scene) return null;

  const handleSave = () => {
    onSave({
      title,
      summary,
      status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">编辑场景</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              场景标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="输入场景标题..."
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              场景摘要
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all"
              placeholder="描述这个场景的内容、氛围、关键情节点..."
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              状态
            </label>
            <div className="flex gap-2">
              {(['draft', 'confirmed', 'generated', 'discarded'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    status === s
                      ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s === 'draft' && '草稿'}
                  {s === 'confirmed' && '已确认'}
                  {s === 'generated' && '已生成'}
                  {s === 'discarded' && '已废弃'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

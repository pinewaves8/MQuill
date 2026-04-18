'use client';

import { useState } from 'react';
import { CreateProjectInput } from '@/lib/validation/schemas';
import { AutoGenProgressModal } from './auto-gen-progress-modal';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: any) => void;
}

const bookTypes = [
  { value: 'novel', label: '长篇小说' },
  { value: 'short', label: '短篇小说' },
  { value: 'series', label: '系列作品' },
  { value: 'nonfiction', label: '非虚构' },
  { value: 'poetry', label: '诗歌散文' },
];

const languages = [
  { value: 'zh', label: '简体中文' },
  { value: 'zh-tw', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

const targetLengths = [
  { value: 'short', label: '短篇 (< 3万字)' },
  { value: 'mid', label: '中篇 (3-10万字)' },
  { value: 'long', label: '长篇 (> 10万字)' },
];

const modes = [
  { value: 'auto', label: 'AI 全自动' },
  { value: 'co_create', label: '人机协作' },
  { value: 'author_driven', label: '作者主导' },
];

const coverTones = ['amber', 'emerald', 'blue', 'purple', 'slate', 'rose'];

const genreTags = ['历史', '悬疑', '武侠', '科幻', '言情', '奇幻', '现实', '都市', '军事', '悬疑'];

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [formData, setFormData] = useState<CreateProjectInput>({
    title: '',
    bookType: 'novel',
    targetLength: 'mid',
    language: 'zh',
    mode: 'co_create',
    tags: [],
    description: '',
    coverTone: 'amber',
    styleKeywords: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAutoGen, setShowAutoGen] = useState(false);

  if (!isOpen) return null;

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...(prev.tags || []), tag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const data = await response.json();

      if (formData.mode === 'auto') {
        setShowAutoGen(true);
      } else {
        onSuccess(data.project);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoGenComplete = (project: any) => {
    setShowAutoGen(false);
    onSuccess(project);
  };

  const handleCancelAutoGen = () => {
    setShowAutoGen(false);
    onClose();
  };

  return (
    <>
      <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto slide-in-right">
        <form onSubmit={handleSubmit}>
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">创建新书</h2>
                <p className="text-sm text-gray-500 mt-1">填写基本信息，开始你的创作之旅</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  书名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="给你的书起个名字..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all text-lg placeholder-gray-400"
                />
              </div>

              {/* Book Type & Language */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">书籍类型</label>
                  <select
                    value={formData.bookType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bookType: e.target.value as any }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all bg-white"
                  >
                    {bookTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">语言</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData((prev) => ({ ...prev, language: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all bg-white"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Length & Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">目标篇幅</label>
                  <select
                    value={formData.targetLength}
                    onChange={(e) => setFormData((prev) => ({ ...prev, targetLength: e.target.value as any }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all bg-white"
                  >
                    {targetLengths.map((len) => (
                      <option key={len.value} value={len.value}>
                        {len.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">创作模式</label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mode: e.target.value as any }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all bg-white"
                  >
                    {modes.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Genre Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分类标签</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {genreTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        formData.tags?.includes(tag)
                          ? 'border-gray-900 text-gray-900 bg-gray-100'
                          : 'border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">内容描述</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="简要描述这本书的内容、世界观或创作灵感..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all resize-none placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 mt-2">这将帮助你更好地组织思路，也可以留空稍后填写</p>
              </div>

              {/* Cover Tone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">封面色调</label>
                <div className="flex gap-3">
                  {coverTones.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, coverTone: tone }))}
                      className={`w-12 h-12 rounded-xl transition-all hover:scale-110 ${
                        tone === 'amber' ? 'bg-amber-100' :
                        tone === 'emerald' ? 'bg-emerald-100' :
                        tone === 'blue' ? 'bg-blue-100' :
                        tone === 'purple' ? 'bg-purple-100' :
                        tone === 'slate' ? 'bg-slate-200' :
                        'bg-rose-100'
                      } border-2 ${
                        formData.coverTone === tone ? 'border-gray-900 ring-2 ring-gray-200' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* AI Mode Hint */}
              {formData.mode === 'auto' && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center gap-2 text-xs text-amber-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    全自动模式下，创建后 AI 将立即开始生成完整内容
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.title}
                className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '创建中...' : '创建并进入'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    <AutoGenProgressModal
      isOpen={showAutoGen}
      bookTitle={formData.title}
      onCancel={handleCancelAutoGen}
      onSwitchToManual={() => {
        setShowAutoGen(false);
        setFormData((prev) => ({ ...prev, mode: 'co_create' }));
      }}
      onComplete={onSuccess}
    />
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ProjectTag } from '@packages/shared-types';

interface TagManagerProps {
  projectId: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagManager({ projectId, tags, onTagsChange }: TagManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    setIsAdding(true);
    try {
      const updatedTags = [...tags, newTag.trim()];
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (res.ok) {
        onTagsChange(updatedTags);
        setNewTag('');
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      const updatedTags = tags.filter((t) => t !== tagToRemove);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (res.ok) {
        onTagsChange(updatedTags);
      }
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
        标签 ({tags.length})
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900 text-sm">项目标签</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Existing Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg group"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add New Tag */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入标签名称..."
          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button
          onClick={handleAddTag}
          disabled={!newTag.trim() || isAdding}
          className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          添加
        </button>
      </div>

      {/* Suggestions */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 mb-2">建议标签：</p>
        <div className="flex flex-wrap gap-1">
          {['玄幻', '都市', '科幻', '悬疑', '言情', '武侠', '历史'].
            filter((s) => !tags.includes(s)).
            slice(0, 5).
            map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setNewTag(suggestion);
                }}
                className="px-2 py-0.5 text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
              >
                {suggestion}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

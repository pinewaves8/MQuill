'use client';

import { useEffect, useState, useRef } from 'react';
import { useRevisionStore } from '@/lib/state/revision-store';

export function SelectionToolbar() {
  const { selectedText, isModalOpen, openModal, setSelectedText, setSelectionRange } = useRevisionStore();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  // Listen for selection changes in the text editor
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setIsVisible(false);
        return;
      }

      const text = selection.toString().trim();
      if (text.length === 0) {
        setIsVisible(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Position toolbar below the selection, centered
      setPosition({
        top: rect.bottom + 8 + window.scrollY,
        left: rect.left + rect.width / 2 - 80,
      });
      setIsVisible(true);
    };

    document.addEventListener('mouseup', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleSelectionChange);
    };
  }, []);

  const handleOpenRevision = () => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value.substring(start, end);
      setSelectedText(text);
      setSelectionRange({ start, end });
    }
    openModal(selectedText);
    setIsVisible(false);
  };

  if (!isVisible || isModalOpen) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[60] fade-in"
      style={{ top: position.top, left: position.left }}
    >
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl flex items-center gap-1 px-2 py-1.5 min-w-[160px]">
        <button
          onClick={handleOpenRevision}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium hover:bg-white/10 rounded-lg transition-colors flex-1"
          title="AI 修订选中文本"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI 修订
        </button>

        <div className="w-px h-5 bg-white/20" />

        <button
          onClick={() => {
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
            }
            setIsVisible(false);
          }}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          title="取消选择"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Arrow pointing up */}
      <div
        className="absolute left-1/2 -top-2 -translate-x-1/2 w-0 h-0"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '8px solid #111827',
        }}
      />
    </div>
  );
}

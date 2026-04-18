'use client';

import { Project, Chapter } from '@packages/shared-types';
import { useRevisionStore } from '@/lib/state/revision-store';
import { getSelectedTextFromEditor } from '@/lib/editor-utils';

interface EditorHeaderProps {
  project: Project | null;
  chapter: Chapter | null;
  wordCount: number;
  chapterContent?: string;
  onReviseChapter?: (content: string) => void;
}

export function EditorHeader({ project, chapter, wordCount, chapterContent, onReviseChapter }: EditorHeaderProps) {
  const { openModal } = useRevisionStore();

  return (
    <header className="h-14 border-b border-gray-100 flex items-center justify-between px-6 bg-white/90 backdrop-blur-sm z-10">
      <div className="flex items-center gap-4">
        <button
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
          title="专注模式"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{chapter?.title || '选择章节'}</span>
          <span className="text-gray-300">·</span>
          <span className="text-green-600 flex items-center gap-1 text-xs">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            已保存
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Revision Buttons */}
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
          <button
            onClick={() => {
              if (onReviseChapter && chapterContent) {
                onReviseChapter(chapterContent);
              }
            }}
            disabled={!chapterContent}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded transition-all flex items-center gap-1 disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI 修订本章
          </button>
          <div className="w-px h-4 bg-gray-300" />
          <button
            onClick={() => {
              requestAnimationFrame(() => {
                const selection = getSelectedTextFromEditor();
                if (selection) {
                  openModal(selection.text, { start: selection.start, end: selection.end }, 'selection');
                } else {
                  openModal('', undefined, 'selection');
                }
              });
            }}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded transition-all flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            修订选中
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-100">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{wordCount.toLocaleString()} 字</span>
        </div>
        <button className="px-4 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
          发布
        </button>
      </div>
    </header>
  );
}

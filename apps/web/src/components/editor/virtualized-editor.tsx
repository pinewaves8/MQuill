'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Chapter, DraftSegment } from '@packages/shared-types';

interface VirtualizedEditorProps {
  chapter: Chapter | null;
  segments: DraftSegment[];
  onSegmentsChange: (segments: DraftSegment[]) => void;
  onChapterUpdate?: (chapter: Chapter) => void;
}

interface Paragraph {
  index: number;
  content: string;
  startOffset: number;
  endOffset: number;
}

const PARAGRAPH_HEIGHT = 150; // Estimated height per paragraph
const OVERSCAN = 5; // Number of items to render outside viewport

export function VirtualizedEditor({
  chapter,
  segments,
  onSegmentsChange,
  onChapterUpdate,
}: VirtualizedEditorProps) {
  const [content, setContent] = useState(segments.map((s) => s.content).join('\n\n'));
  const [title, setTitle] = useState(chapter?.title || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isTitleDirty, setIsTitleDirty] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [editingParagraph, setEditingParagraph] = useState<number | null>(null);
  const [focusedParagraphIndex, setFocusedParagraphIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync content when segments change from outside
  useEffect(() => {
    const newContent = segments.map((s) => s.content).join('\n\n');
    if (newContent !== content && !isDirty) {
      setContent(newContent);
    }
  }, [segments]);

  // Sync title when chapter changes
  useEffect(() => {
    if (chapter?.title !== title && !isTitleDirty) {
      setTitle(chapter?.title || '');
    }
  }, [chapter?.title]);

  // Parse content into paragraphs
  const paragraphs = useMemo<Paragraph[]>(() => {
    const paras: Paragraph[] = [];
    let currentOffset = 0;
    const blocks = content.split(/\n\n+/);

    blocks.forEach((block, index) => {
      if (block.trim()) {
        paras.push({
          index,
          content: block,
          startOffset: currentOffset,
          endOffset: currentOffset + block.length,
        });
      }
      currentOffset += block.length + 2; // +2 for \n\n
    });

    return paras;
  }, [content]);

  // Virtualizer for paragraph rendering
  const virtualizer = useVirtualizer({
    count: paragraphs.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => PARAGRAPH_HEIGHT,
    overscan: OVERSCAN,
  });

  // Auto-save with debounce
  useEffect(() => {
    if (!chapter || !isDirty) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content, isDirty, chapter]);

  const handleSave = useCallback(async () => {
    if (!chapter) return;

    setIsSaving(true);
    try {
      if (isTitleDirty && title !== chapter.title) {
        await fetch(`/api/chapters/${chapter.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        onChapterUpdate?.({ ...chapter, title });
      }

      const res = await fetch(`/api/chapters/${chapter.id}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: chapter.id,
          segments: [
            {
              segmentIndex: 0,
              content,
              source: 'manual',
              isLocked: false,
            },
          ],
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        onSegmentsChange(payload.data?.segments || []);
        const wordCount = content.length;
        onChapterUpdate?.({ ...chapter!, title, wordCount });
        setLastSaved(new Date());
        setIsDirty(false);
        setIsTitleDirty(false);
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [chapter, content, title, isTitleDirty, onSegmentsChange, onChapterUpdate]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  }, []);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setIsTitleDirty(true);
  }, []);

  const handleParagraphEdit = useCallback((paragraphIndex: number, newText: string) => {
    // Find the paragraph and replace it in content
    const paragraph = paragraphs[paragraphIndex];
    if (!paragraph) return;

    const before = content.substring(0, paragraph.startOffset);
    const after = content.substring(paragraph.endOffset);
    const newContent = before + newText + after;

    setContent(newContent);
    setIsDirty(true);
    setEditingParagraph(null);
  }, [content, paragraphs]);

  const handleParagraphClick = useCallback((paragraphIndex: number) => {
    setEditingParagraph(paragraphIndex);
    setFocusedParagraphIndex(paragraphIndex);

    // Scroll to the paragraph
    virtualizer.scrollToIndex(paragraphIndex, { align: 'start' });
  }, [virtualizer]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  const wordCount = content.length;
  const charCountText = `${wordCount.toLocaleString()} 字`;

  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    if (diff < 5) return '刚刚保存';
    if (diff < 60) return `${diff}秒前保存`;
    return lastSaved.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const getSaveStatusText = () => {
    if (isSaving) return { text: '保存中...', className: 'text-yellow-600' };
    if (isDirty) return { text: '未保存', className: 'text-amber-600' };
    if (lastSaved) return { text: formatLastSaved(), className: 'text-green-600' };
    return null;
  };

  const saveStatus = getSaveStatusText();

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      className={`flex-1 overflow-hidden bg-white relative ${isFocusMode ? 'focus-mode' : ''}`}
      onKeyDown={handleKeyDown}
    >
      <div className="max-w-3xl mx-auto px-8 py-10">
        {/* Chapter Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              第一章
            </span>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              {charCountText}
            </span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full text-3xl font-bold text-gray-900 border-none outline-none placeholder-gray-300 bg-transparent editor-font"
            placeholder="输入章节标题..."
          />
        </div>

        {/* Virtualized Paragraph List */}
        <div
          ref={containerRef}
          className="overflow-auto"
          style={{ height: 'calc(100vh - 280px)' }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualItem) => {
              const paragraph = paragraphs[virtualItem.index];
              const isEditing = editingParagraph === virtualItem.index;

              return (
                <div
                  key={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className={`mb-6 paragraph-block ${isEditing ? 'editing' : ''}`}
                >
                  {isEditing ? (
                    <textarea
                      ref={(el) => {
                        if (el) textareaRefs.current.set(virtualItem.index, el);
                      }}
                      defaultValue={paragraph.content}
                      className="w-full min-h-[100px] resize-none border-2 border-blue-500 outline-none text-lg leading-[1.8] text-gray-800 editor-font rounded-lg p-4 shadow-sm"
                      autoFocus
                      onBlur={(e) => {
                        handleParagraphEdit(virtualItem.index, e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          handleParagraphEdit(virtualItem.index, e.currentTarget.value);
                        }
                        // Ctrl+Enter to save and move to next
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault();
                          handleParagraphEdit(virtualItem.index, e.currentTarget.value);
                          if (virtualItem.index < paragraphs.length - 1) {
                            handleParagraphClick(virtualItem.index + 1);
                          }
                        }
                      }}
                    />
                  ) : (
                    <div
                      className="text-lg leading-[1.8] text-gray-800 editor-font cursor-text min-h-[50px] p-4 rounded-lg hover:bg-gray-50 transition-colors"
                      onClick={() => handleParagraphClick(virtualItem.index)}
                    >
                      {paragraph.content || (
                        <span className="text-gray-400 italic">点击编辑此段落...</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="fixed bottom-4 right-4 flex items-center gap-3">
          {saveStatus && (
            <span className={`text-xs flex items-center gap-1.5 ${saveStatus.className}`}>
              {isSaving && (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {!isSaving && isDirty && <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
              {!isSaving && !isDirty && lastSaved && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {saveStatus.text}
            </span>
          )}

          <button
            onClick={() => setIsFocusMode((prev) => !prev)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              isFocusMode
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
            title="专注模式"
          >
            {isFocusMode ? '退出专注' : '专注模式'}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || (!isDirty && !isTitleDirty)}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

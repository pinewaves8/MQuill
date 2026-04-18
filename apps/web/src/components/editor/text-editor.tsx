'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Chapter, DraftSegment } from '@packages/shared-types';
import { useRevisionStore } from '@/lib/state/revision-store';
import { FormatToolbar } from './format-toolbar';

interface TextEditorProps {
  chapter: Chapter | null;
  segments: DraftSegment[];
  onSegmentsChange: (segments: DraftSegment[]) => void;
  onChapterUpdate?: (chapter: Chapter) => void;
}

export function TextEditor({ chapter, segments, onSegmentsChange, onChapterUpdate }: TextEditorProps) {
  const [content, setContent] = useState(segments.map((s) => s.content).join('\n\n'));
  const [title, setTitle] = useState(chapter?.title || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isTitleDirty, setIsTitleDirty] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isFormatToolbarVisible, setIsFormatToolbarVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { openModal, setSelectedText } = useRevisionStore();

  // Sync content when segments change from outside (e.g., chapter switch)
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

  // Listen for locate-scene-in-editor event
  useEffect(() => {
    const handleLocateScene = (e: CustomEvent) => {
      const { sceneId } = e.detail;
      const segment = segments.find((seg) => seg.sceneId === sceneId);
      if (segment && textareaRef.current) {
        const textBeforeSegment = segments
          .filter((seg) => seg.segmentIndex < segment.segmentIndex)
          .reduce((acc, seg) => acc + seg.content + '\n\n', '');
        const start = textBeforeSegment.length;
        const end = start + segment.content.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, end);
        const lines = textBeforeSegment.split('\n').length;
        const lineHeight = 34;
        textareaRef.current.scrollTop = Math.max(0, (lines - 2) * lineHeight);
      }
    };
    window.addEventListener('locate-scene-in-editor', handleLocateScene as EventListener);
    return () => {
      window.removeEventListener('locate-scene-in-editor', handleLocateScene as EventListener);
    };
  }, [segments]);

  // Auto-save with debounce (2 seconds after last change)
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
      // Save chapter title if changed
      if (isTitleDirty && title !== chapter.title) {
        await fetch(`/api/chapters/${chapter.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        onChapterUpdate?.({ ...chapter, title });
      }

      // Save draft content
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
        const data = await res.json();
        onSegmentsChange(data.segments);
        // Update chapter word count in sidebar
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

  const handleTextSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectedText = textarea.value.substring(
      textarea.selectionStart,
      textarea.selectionEnd
    );

    if (selectedText.trim()) {
      setSelectedText(selectedText);
    }
    // Check if selection should show format toolbar
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start !== end) {
      setIsFormatToolbarVisible(true);
    }
  }, [setSelectedText]);

  const handleFormat = useCallback((wrapper: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    if (!selectedText) return;

    // Wrap selected text with markers
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    const newContent = before + wrapper + selectedText + wrapper + after;
    setContent(newContent);
    setIsDirty(true);

    // Restore selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + wrapper.length, end + wrapper.length);
    }, 0);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        handleFormat('**');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        handleFormat('*');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        handleFormat('## ');
      }
    },
    [handleSave, handleFormat]
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

  return (
    <div className={`flex-1 overflow-y-auto bg-white relative ${isFocusMode ? 'focus-mode' : ''}`}>
      <div className="max-w-3xl mx-auto px-8 py-10 fade-in">
        {/* Chapter Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              第一章
            </span>
            {/* Word count badge */}
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

        {/* Editor */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onSelect={handleTextSelection}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[calc(100vh-280px)] resize-none border-none outline-none text-lg leading-[1.8] text-gray-800 editor-font placeholder-gray-300 bg-transparent"
          placeholder="开始写作，或从左侧选择 AI 场景生成正文..."
        />

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

          {/* Focus mode toggle */}
          <button
            onClick={() => setIsFocusMode((prev) => !prev)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              isFocusMode
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
            title="专注模式 (Ctrl+Shift+B)"
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
      <FormatToolbar
        onFormat={handleFormat}
        textareaRef={textareaRef}
        isVisible={isFormatToolbarVisible}
        onVisibilityChange={setIsFormatToolbarVisible}
      />
    </div>
  );
}

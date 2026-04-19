'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { Chapter, DraftSegment } from '@packages/shared-types';
import { useRevisionStore } from '@/lib/state/revision-store';

const DRAFT_SOURCE = 'manual' as const;

interface RichTextEditorProps {
  chapter: Chapter | null;
  segments: DraftSegment[];
  onSegmentsChange: (segments: DraftSegment[]) => void;
  onChapterUpdate?: (chapter: Chapter) => void;
}

// Convert markdown-like content to Tiptap JSON
function contentToHtml(content: string): string {
  if (!content) return '';
  return content
    .split('\n\n')
    .map((para) => {
      if (para.startsWith('## ')) {
        return `<h2>${para.slice(3)}</h2>`;
      }
      if (para.startsWith('### ')) {
        return `<h3>${para.slice(4)}</h3>`;
      }
      if (para.startsWith('> ')) {
        return `<blockquote><p>${para.slice(2)}</p></blockquote>`;
      }
      if (para.startsWith('- ') || para.startsWith('* ')) {
        const items = para.split('\n').map((item) => `<li>${item.slice(2)}</li>`).join('');
        return `<ul>${items}</ul>`;
      }
      // Convert **bold** and *italic* markers
      let html = para
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      return `<p>${html}</p>`;
    })
    .join('');
}

// Convert Tiptap HTML back to markdown-like content
function htmlToContent(html: string): string {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  const paragraphs: string[] = [];

  body.childNodes.forEach((node) => {
    const element = node as Element;
    if (element.nodeName === 'H2') {
      paragraphs.push(`## ${element.textContent}`);
    } else if (element.nodeName === 'H3') {
      paragraphs.push(`### ${element.textContent}`);
    } else if (element.nodeName === 'BLOCKQUOTE') {
      paragraphs.push(`> ${element.textContent}`);
    } else if (element.nodeName === 'UL') {
      const items = Array.from(element.childNodes)
        .map((li) => `- ${li.textContent}`)
        .join('\n');
      paragraphs.push(items);
    } else if (element.nodeName === 'P') {
      let text = element.innerHTML
        .replace(/<strong>(.+?)<\/strong>/g, '**$1**')
        .replace(/<em>(.+?)<\/em>/g, '*$1*')
        .replace(/<[^>]+>/g, '');
      paragraphs.push(text);
    }
  });

  return paragraphs.join('\n\n');
}

function FloatingToolbar({ editor }: { editor: Editor | null }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const handleBlur = () => setIsVisible(false);

    const updateToolbar = () => {
      const { from, to } = editor.state.selection;

      if (from === to) {
        setIsVisible(false);
        return;
      }

      const selectedText = editor.state.doc.textBetween(from, to, ' ');
      if (!selectedText.trim()) {
        setIsVisible(false);
        return;
      }

      const coords = editor.view.coordsAtPos(from);
      setPosition({
        top: coords.top - 50,
        left: coords.left + (coords.right - coords.left) / 2 - 140,
      });
      setIsVisible(true);
    };

    editor.on('selectionUpdate', updateToolbar);
    editor.on('blur', handleBlur);

    return () => {
      editor.off('selectionUpdate', updateToolbar);
      editor.off('blur', handleBlur);
    };
  }, [editor]);

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleHeading = useCallback((level: 2 | 3) => {
    editor?.chain().focus().toggleHeading({ level }).run();
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  if (!isVisible || !editor) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[60] fade-in"
      style={{ top: position.top, left: position.left }}
    >
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl flex items-center gap-1 px-2 py-1.5 min-w-[280px]">
        <button
          onClick={toggleBold}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold hover:bg-white/10 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-white/20' : ''}`}
          title="加粗 (Ctrl+B)"
        >
          B
        </button>
        <button
          onClick={toggleItalic}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm italic hover:bg-white/10 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-white/20' : ''}`}
          title="斜体 (Ctrl+I)"
        >
          I
        </button>
        <button
          onClick={() => toggleHeading(2)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium hover:bg-white/10 rounded-lg transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-white/20' : ''}`}
          title="二级标题"
        >
          H2
        </button>
        <button
          onClick={() => toggleHeading(3)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium hover:bg-white/10 rounded-lg transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-white/20' : ''}`}
          title="三级标题"
        >
          H3
        </button>
        <button
          onClick={toggleBlockquote}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-white/10 rounded-lg transition-colors ${editor.isActive('blockquote') ? 'bg-white/20' : ''}`}
          title="引用"
        >
          ❝
        </button>
        <button
          onClick={toggleBulletList}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-white/10 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-white/20' : ''}`}
          title="无序列表"
        >
          •
        </button>
      </div>
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

export function RichTextEditor({ chapter, segments, onSegmentsChange, onChapterUpdate }: RichTextEditorProps) {
  const [title, setTitle] = useState(chapter?.title || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isTitleDirty, setIsTitleDirty] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevSelectedTextRef = useRef<string>('');
  const { setSelectedText } = useRevisionStore();

  // Get content from segments
  const initialContent = segments.map((s) => s.content).join('\n\n');
  const initialHtml = contentToHtml(initialContent);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: '开始写作，或从左侧选择 AI 场景生成正文...',
      }),
      Highlight.configure({
        multicolor: false,
      }),
    ],
    content: initialHtml,
    onUpdate: ({ editor }) => {
      setIsDirty(true);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        if (selectedText.trim() && selectedText !== prevSelectedTextRef.current) {
          prevSelectedTextRef.current = selectedText;
          setSelectedText(selectedText);
        }
      }
    },
  });

  // Sync content when segments change from outside (e.g., chapter switch)
  useEffect(() => {
    if (!editor || !chapter) return;

    const newContent = segments.map((s) => s.content).join('\n\n');
    const currentContent = htmlToContent(editor.getHTML());

    if (newContent !== currentContent && !isDirty) {
      const newHtml = contentToHtml(newContent);
      editor.commands.setContent(newHtml);
    }
  }, [segments, editor, isDirty, chapter]);

  // Sync title when chapter changes
  useEffect(() => {
    if (chapter?.title !== title && !isTitleDirty) {
      setTitle(chapter?.title || '');
    }
  }, [chapter?.title]);

  // Auto-save with debounce
  useEffect(() => {
    if (!chapter || !isDirty || !editor) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      // Use refs to get latest values without re-creating the timeout
      const currentTitle = title;
      const currentChapter = chapter;
      const currentEditor = editor;
      const titleDirty = currentTitle !== currentChapter.title;

      if (!currentChapter || !currentEditor) return;

      setIsSaving(true);
      (async () => {
        try {
          if (titleDirty && currentTitle !== currentChapter.title) {
            await fetch(`/api/chapters/${currentChapter.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: currentTitle }),
            });
            onChapterUpdate?.({ ...currentChapter, title: currentTitle });
          }

          const html = currentEditor.getHTML();
          const content = htmlToContent(html);

          // If content is empty, send empty array to clear all segments
          // Otherwise, send all segments with segmentIndex: 0 updated
          const allSegments = content.trim() === ''
            ? []
            : segments.length === 0
              ? [{ segmentIndex: 0, content, source: DRAFT_SOURCE, isLocked: false }]
              : segments.map((seg, idx) =>
                  idx === 0
                    ? { ...seg, content, source: DRAFT_SOURCE, isLocked: false }
                    : seg
                );

          const res = await fetch(`/api/chapters/${currentChapter.id}/draft`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chapterId: currentChapter.id,
              segments: allSegments,
            }),
          });

          if (res.ok) {
            const payload = await res.json();
            const savedSegments = payload.data?.segments || [];
            onSegmentsChange(savedSegments);
            const wordCount = savedSegments.reduce((sum: number, s: { content: string }) => sum + s.content.length, 0);
            onChapterUpdate?.({ ...currentChapter, title: currentTitle, wordCount });
            setLastSaved(new Date());
            setIsDirty(false);
          }
        } catch (error) {
          console.error('Failed to save draft:', error);
        } finally {
          setIsSaving(false);
        }
      })();
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isDirty, chapter, editor, title, onSegmentsChange, onChapterUpdate]);

  const handleSave = useCallback(async () => {
    if (!chapter || !editor) return;

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

      const html = editor.getHTML();
      const content = htmlToContent(html);

      // If content is empty, send empty array to clear all segments
      // Otherwise, send all segments with segmentIndex: 0 updated
      const allSegments = content.trim() === ''
        ? []
        : segments.length === 0
          ? [{ segmentIndex: 0, content, source: DRAFT_SOURCE, isLocked: false }]
          : segments.map((seg, idx) =>
              idx === 0
                ? { ...seg, content, source: DRAFT_SOURCE, isLocked: false }
                : seg
            );

      const res = await fetch(`/api/chapters/${chapter.id}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: chapter.id,
          segments: allSegments,
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        const savedSegments = payload.data?.segments || [];
        onSegmentsChange(savedSegments);
        const wordCount = savedSegments.reduce((sum: number, s: { content: string }) => sum + s.content.length, 0);
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
  }, [chapter, editor, title, isTitleDirty, segments, onSegmentsChange, onChapterUpdate]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setIsTitleDirty(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  const wordCount = editor?.getText().length || 0;
  const charCountText = `${wordCount.toLocaleString()} 字`;

  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    if (diff < 5) return '刚刚保存';
    if (diff < 60) return `${diff}秒前保存`;
    return lastSaved.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const saveStatus = useMemo(() => {
    if (isSaving) return { text: '保存中...', className: 'text-yellow-600' };
    if (isDirty) return { text: '未保存', className: 'text-amber-600' };
    if (lastSaved) return { text: formatLastSaved(), className: 'text-green-600' };
    return null;
  }, [isSaving, isDirty, lastSaved]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`flex-1 overflow-y-auto bg-white relative ${isFocusMode ? 'focus-mode' : ''}`} onKeyDown={handleKeyDown}>
      <div className="max-w-3xl mx-auto px-8 py-10 fade-in">
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

        {/* Editor */}
        <div className="ProseMirror-editor-wrapper">
          <EditorContent
            editor={editor}
            className="prose prose-lg max-w-none focus:outline-none min-h-[calc(100vh-280px)]"
          />
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
      <FloatingToolbar editor={editor} />
      <style jsx global>{`
        .ProseMirror-editor-wrapper .ProseMirror {
          min-height: calc(100vh - 280px);
          outline: none;
        }
        .ProseMirror-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          height: 0;
          float: left;
        }
        .ProseMirror-editor-wrapper .ProseMirror p {
          margin: 0 0 1em 0;
          line-height: 1.8;
        }
        .ProseMirror-editor-wrapper .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 1.5em 0 0.5em 0;
        }
        .ProseMirror-editor-wrapper .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin: 1.25em 0 0.5em 0;
        }
        .ProseMirror-editor-wrapper .ProseMirror blockquote {
          border-left: 3px solid #d1d5db;
          padding-left: 1em;
          margin: 1em 0;
          color: #6b7280;
        }
        .ProseMirror-editor-wrapper .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin: 1em 0;
        }
        .ProseMirror-editor-wrapper .ProseMirror ul li {
          margin: 0.25em 0;
        }
        .ProseMirror-editor-wrapper .ProseMirror strong {
          font-weight: bold;
        }
        .ProseMirror-editor-wrapper .ProseMirror em {
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

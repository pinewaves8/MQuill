'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface FormatToolbarProps {
  onFormat: (format: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  isVisible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

const formats = [
  { id: 'bold', label: '加粗', icon: 'B', shortcut: 'Ctrl+B', wrapper: '**' },
  { id: 'italic', label: '斜体', icon: 'I', shortcut: 'Ctrl+I', wrapper: '*' },
  { id: 'h2', label: '二级标题', icon: 'H2', wrapper: '## ' },
  { id: 'h3', label: '三级标题', icon: 'H3', wrapper: '### ' },
  { id: 'quote', label: '引用', icon: '❝', wrapper: '> ' },
  { id: 'ul', label: '无序列表', icon: '•', wrapper: '- ' },
];

export function FormatToolbar({ onFormat, textareaRef, isVisible, onVisibilityChange }: FormatToolbarProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const mouseDownRef = useRef(false);

  const checkSelection = useCallback(() => {
    if (!textareaRef?.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      const text = textarea.value.substring(start, end);
      if (text.trim().length > 0) {
        const rect = textarea.getBoundingClientRect();
        setPosition({
          top: rect.top - 50 + window.scrollY,
          left: rect.left + rect.width / 2 - 140,
        });
        onVisibilityChange?.(true);
        return;
      }
    }
    onVisibilityChange?.(false);
  }, [textareaRef, onVisibilityChange]);

  useEffect(() => {
    const textarea = textareaRef?.current;
    if (!textarea) return;

    const handleMouseUp = () => {
      if (mouseDownRef.current) {
        mouseDownRef.current = false;
        setTimeout(checkSelection, 10);
      }
    };

    const handleMouseDown = () => {
      mouseDownRef.current = true;
    };

    textarea.addEventListener('mouseup', handleMouseUp);
    textarea.addEventListener('mousedown', handleMouseDown);

    return () => {
      textarea.removeEventListener('mouseup', handleMouseUp);
      textarea.removeEventListener('mousedown', handleMouseDown);
    };
  }, [textareaRef, checkSelection]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!mouseDownRef.current) {
        checkSelection();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [checkSelection]);

  const handleFormat = (wrapper: string) => {
    onFormat(wrapper);
    onVisibilityChange?.(false);
  };

  if (!isVisible) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[60] fade-in"
      style={{ top: position.top, left: position.left }}
    >
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl flex items-center gap-1 px-2 py-1.5 min-w-[280px]">
        {formats.map((format) => (
          <button
            key={format.id}
            onClick={() => handleFormat(format.wrapper)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium hover:bg-white/10 rounded-lg transition-colors flex-1 justify-center"
            title={format.shortcut || format.label}
          >
            <span className={format.id === 'bold' ? 'font-bold' : format.id === 'italic' ? 'italic' : 'text-base'}>
              {format.icon}
            </span>
          </button>
        ))}
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

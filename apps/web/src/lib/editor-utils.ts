/**
 * Get currently selected text from the editor textarea
 */
export function getSelectedTextFromEditor(): { text: string; start: number; end: number } | null {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
  if (!textarea) return null;

  // Use requestAnimationFrame to ensure selection is updated after mouseup
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value.substring(start, end);

  if (!text.trim()) return null;

  return { text, start, end };
}

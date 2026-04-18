'use client';

interface DiffOperation {
  type: 'add' | 'remove' | 'same';
  text: string;
}

interface DiffViewerProps {
  operations: DiffOperation[];
  originalText?: string;
  revisedText?: string;
}

export function DiffViewer({ operations, originalText, revisedText }: DiffViewerProps) {
  return (
    <div className="font-mono text-sm">
      {operations.map((op, index) => (
        <span
          key={index}
          className={`${
            op.type === 'add'
              ? 'bg-emerald-100 text-emerald-800'
              : op.type === 'remove'
              ? 'bg-rose-100 text-rose-800 line-through'
              : 'text-gray-700'
          }`}
        >
          {op.text}
          {op.type !== 'same' && ' '}
        </span>
      ))}
    </div>
  );
}

interface DiffSummaryProps {
  addedCount: number;
  removedCount: number;
}

export function DiffSummary({ addedCount, removedCount }: DiffSummaryProps) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-emerald-600 font-medium">+{addedCount} 字</span>
      <span className="text-rose-600 font-medium">-{removedCount} 字</span>
    </div>
  );
}

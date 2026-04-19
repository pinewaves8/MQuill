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
  const leftLines: string[] = [];
  const rightLines: string[] = [];

  operations.forEach((operation) => {
    if (operation.type === 'same') {
      leftLines.push(operation.text);
      rightLines.push(operation.text);
      return;
    }

    if (operation.type === 'remove') {
      leftLines.push(operation.text);
      rightLines.push('');
      return;
    }

    leftLines.push('');
    rightLines.push(operation.text);
  });

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-gray-200 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col bg-rose-50/35">
        <div className="border-b border-gray-200 px-3 py-2 text-xs font-medium text-gray-500">
          版本 A
        </div>
        <div className="p-3">
          <div className="space-y-1 font-mono text-sm">
          {leftLines.map((line, index) => {
            const operation = operations[index];

            return (
              <div
                key={`left-${index}`}
                className={`min-h-8 whitespace-pre-wrap rounded px-2 py-1 leading-relaxed ${
                  operation?.type === 'remove'
                    ? 'bg-rose-100 text-rose-800 line-through'
                    : 'text-gray-700'
                }`}
              >
                {line || ' '}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      <div className="hidden bg-gray-200 md:block" />

      <div className="flex min-w-0 flex-col bg-emerald-50/35">
        <div className="border-b border-gray-200 px-3 py-2 text-xs font-medium text-gray-500">
          版本 B
        </div>
        <div className="p-3">
          <div className="space-y-1 font-mono text-sm">
          {rightLines.map((line, index) => {
            const operation = operations[index];

            return (
              <div
                key={`right-${index}`}
                className={`min-h-8 whitespace-pre-wrap rounded px-2 py-1 leading-relaxed ${
                  operation?.type === 'add'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-gray-700'
                }`}
              >
                {line || ' '}
              </div>
            );
          })}
          </div>
        </div>
      </div>
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

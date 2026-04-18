'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SceneCard as SceneCardType } from '@packages/shared-types';

interface SceneCardComponentProps {
  scene: SceneCardType;
  isSelected: boolean;
  isDragged?: boolean;
  isGenerating?: boolean;
  isMergeSelected?: boolean;
  scenesConfirmed?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<SceneCardType>) => void;
  onDelete: () => void;
  onGenerate: () => void;
  onEdit: () => void;
  onMergeSelect?: () => void;
  onDiscard?: () => void;
  onRestore?: () => void;
  onRestoreAsBranch?: () => void;
}

const COLOR_CLASSES: Record<string, { text: string; bg: string }> = {
  purple: { text: 'text-purple-600', bg: 'bg-purple-50' },
  blue: { text: 'text-blue-600', bg: 'bg-blue-50' },
  amber: { text: 'text-amber-600', bg: 'bg-amber-50' },
  emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  slate: { text: 'text-slate-600', bg: 'bg-slate-100' },
  rose: { text: 'text-rose-600', bg: 'bg-rose-50' },
};

const statusMeta = {
  draft: { label: '草稿', classes: 'bg-gray-100 text-gray-700 border border-gray-200' },
  confirmed: { label: '已确认', classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  generated: { label: '已生成正文', classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  discarded: { label: '已废弃', classes: 'bg-rose-50 text-rose-700 border border-rose-200' },
};

export function SceneCardComponent({
  scene,
  isSelected,
  isDragged = false,
  isGenerating = false,
  isMergeSelected = false,
  scenesConfirmed = false,
  onSelect,
  onUpdate,
  onDelete,
  onGenerate,
  onEdit,
  onMergeSelect,
  onDiscard,
  onRestore,
  onRestoreAsBranch,
}: SceneCardComponentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : scene.status === 'discarded' ? 0.72 : 1,
  };

  const status = statusMeta[scene.status] || statusMeta.draft;
  const color = scene.color || 'purple';
  const colorMeta = COLOR_CLASSES[color] || COLOR_CLASSES.purple;
  const isDiscarded = scene.status === 'discarded';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`scene-card p-4 bg-white border border-gray-200 rounded-xl cursor-pointer transition-all ${
        isSelected ? 'selected ring-2 ring-purple-500' : ''
      } ${isDragging ? 'shadow-lg z-50 rotate-2' : ''} ${
        isDiscarded ? 'opacity-72 bg-gray-50' : ''
      } ${isMergeSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : ''}`.trim()}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Drag Handle */}
          <button
            type="button"
            className="p-1 text-gray-300 hover:text-gray-500 rounded cursor-grab active:cursor-grabbing flex-shrink-0"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="7" cy="6" r="1.5" />
              <circle cx="13" cy="6" r="1.5" />
              <circle cx="7" cy="12" r="1.5" />
              <circle cx="13" cy="12" r="1.5" />
              <circle cx="7" cy="18" r="1.5" />
              <circle cx="13" cy="18" r="1.5" />
            </svg>
          </button>
          {/* Color + Tag */}
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${colorMeta.text} ${colorMeta.bg}`}>
            {scene.tag || '场景'}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Merge selection */}
          {onMergeSelect && !isDiscarded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMergeSelect();
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium border ${
                isMergeSelected
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {isMergeSelected ? '已选中' : '选中合并'}
            </button>
          )}
          {/* Status badge */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${status.classes}`}>
            {status.label}
          </span>
          {/* Edit button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className={`text-sm font-medium text-gray-900 mb-1 ${isDiscarded ? 'line-through text-gray-400' : ''}`}>
        {scene.title}
      </h4>

      {/* Summary */}
      {scene.summary && (
        <p className={`text-xs text-gray-600 leading-relaxed line-clamp-3 ${isDiscarded ? 'line-through text-gray-400' : ''}`}>
          {scene.summary}
        </p>
      )}

      {/* Evolution notes */}
      {scene.mergedFrom && scene.mergedFrom.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">合并产物</span>
          <span className="text-[11px] text-emerald-700">来自 {scene.mergedFrom.length} 个场景</span>
        </div>
      )}
      {scene.mergedInto && (
        <div className="mt-2 text-[11px] text-rose-600">已并入其他场景</div>
      )}
      {scene.branchFromSceneId && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">恢复分支</span>
          <span className="text-[11px] text-indigo-700">来自废弃场景</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select
          onChange={(e) => {
            e.stopPropagation();
            onUpdate({ status: e.target.value as SceneCardType['status'] });
          }}
          className="w-full py-1.5 px-2 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none"
          value={scene.status}
        >
          <option value="draft">草稿</option>
          <option value="confirmed">已确认</option>
          <option value="generated">已生成正文</option>
          <option value="discarded">已废弃</option>
        </select>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!scenesConfirmed || isDiscarded) return;
            onGenerate();
          }}
          disabled={!scenesConfirmed || isDiscarded || isGenerating}
          className="w-full py-1.5 px-3 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              生成中
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              生成正文
            </>
          )}
        </button>
      </div>

      {/* Discard/Restore actions */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isDiscarded) {
              onRestore?.();
            } else {
              onDiscard?.();
            }
          }}
          className={`w-full py-1.5 px-3 border rounded-lg text-xs font-medium transition-colors ${
            isDiscarded
              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              : 'border-rose-200 text-rose-700 hover:bg-rose-50'
          }`}
        >
          {isDiscarded ? '恢复场景' : '废弃场景'}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isDiscarded) {
              onRestoreAsBranch?.();
            } else if (onMergeSelect) {
              onMergeSelect();
            }
          }}
          disabled={!isDiscarded && !onMergeSelect}
          className={`w-full py-1.5 px-3 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isDiscarded ? '恢复为分支' : '加入合并'}
        </button>
      </div>
    </div>
  );
}

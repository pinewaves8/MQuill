'use client';

import { useState, useEffect } from 'react';
import { Memory, MemoryType, ProjectCharter } from '@packages/shared-types';
import { toast } from '@/components/ui/toast';

interface CharterPanelProps {
  projectId: string;
  isOpen: boolean;
}

const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  world: '🌍 世界设定',
  narrative: '📖 叙事与人物',
  style: '🎨 风格指南',
  canon: '⚡ 时间线与事实',
  user: '👤 用户记忆',
};

export function CharterPanel({ projectId, isOpen }: CharterPanelProps) {
  const [charter, setCharter] = useState<ProjectCharter | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'charter' | 'memories'>('charter');
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [isDeletingMemory, setIsDeletingMemory] = useState<string | null>(null);
  const [showAddMemory, setShowAddMemory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch charter
      const charterRes = await fetch(`/api/projects/${projectId}/charter`);
      if (charterRes.ok) {
        const charterPayload = await charterRes.json();
        setCharter(charterPayload.data?.charter ?? null);
      }

      // Fetch memories
      const memoriesRes = await fetch(`/api/memories?projectId=${projectId}`);
      if (memoriesRes.ok) {
        const memoriesPayload = await memoriesRes.json();
        setMemories(memoriesPayload.data?.memories || []);
      }
    } catch (error) {
      console.error('Failed to fetch charter data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCharter = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/agents/bootstrap/${projectId}`, {
        method: 'POST',
      });

      if (res.ok) {
        const payload = await res.json();
        setCharter(payload.data?.charter ?? null);
        setMemories(payload.data?.memories || []);
        toast.success('项目 Charter 生成成功');
      } else {
        toast.error('生成失败，请重试');
      }
    } catch (error) {
      console.error('Failed to generate charter:', error);
      toast.error('网络错误，请检查连接');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    setIsDeletingMemory(memoryId);
    try {
      const res = await fetch(`/api/memories/${memoryId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
        toast.success('记忆已删除');
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
      toast.error('删除失败');
    } finally {
      setIsDeletingMemory(null);
    }
  };

  const handleUpdateMemory = async (memoryId: string, content: Memory['content']) => {
    try {
      const res = await fetch(`/api/memories/${memoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const payload = await res.json();
        setMemories((prev) =>
          prev.map((m) => (m.id === memoryId ? payload.data?.memory ?? m : m))
        );
        setEditingMemory(null);
        toast.success('记忆已更新');
      }
    } catch (error) {
      console.error('Failed to update memory:', error);
      toast.error('更新失败');
    }
  };

  const handleAddMemory = async (memoryType: MemoryType, key: string, content: Memory['content']) => {
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          memoryType,
          key,
          content,
          priority: 50,
          source: 'user',
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        if (payload.data?.memory) {
          setMemories((prev) => [payload.data.memory, ...prev]);
        }
        setShowAddMemory(false);
        toast.success('记忆已添加');
      }
    } catch (error) {
      console.error('Failed to add memory:', error);
      toast.error('添加失败');
    }
  };

  const memoriesByType = memories.reduce((acc, mem) => {
    if (!acc[mem.memoryType]) {
      acc[mem.memoryType] = [];
    }
    acc[mem.memoryType].push(mem);
    return acc;
  }, {} as Record<MemoryType, Memory[]>);

  if (!isOpen) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">项目 Charter</h2>
          <button
            onClick={handleGenerateCharter}
            disabled={isGenerating}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 inline animate-spin mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                生成中...
              </>
            ) : (
              '重新生成'
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">还没有项目设定</h3>
            <p className="text-sm text-gray-500 mb-4">
              点击下方按钮，AI 将根据你的项目信息生成世界观、人物、风格指南等设定
            </p>
            <button
              onClick={handleGenerateCharter}
              disabled={isGenerating}
              className="px-6 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isGenerating ? '生成中...' : '生成 Charter'}
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('charter')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'charter'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Charter 设定
              </button>
              <button
                onClick={() => setActiveTab('memories')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'memories'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                记忆库 ({memories.length})
              </button>
            </div>

            {activeTab === 'charter' ? (
              <div className="space-y-6">
                {/* Theme */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">核心主题</div>
                  <div className="text-gray-900">
                    {charter?.theme || '暂无设定'}
                  </div>
                </div>

                {/* Core Conflict */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">核心冲突</div>
                  <div className="text-gray-900">
                    {charter?.coreConflict || '暂无设定'}
                  </div>
                </div>

                {/* Target Audience & Viewpoint */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-5">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">目标读者</div>
                    <div className="text-gray-900">
                      {charter?.targetAudience || '暂无设定'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-5">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">叙事视角</div>
                    <div className="text-gray-900">
                      {charter?.viewpoint || '暂无设定'}
                    </div>
                  </div>
                </div>

                {/* Style Keywords */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">风格关键词</div>
                  <div className="flex flex-wrap gap-2">
                    {(charter?.styleKeywords || []).map((keyword, idx) => (
                      <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                        {keyword}
                      </span>
                    ))}
                    {(!charter?.styleKeywords || charter.styleKeywords.length === 0) && '暂无设定'}
                  </div>
                </div>

                {/* Writing Goals */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">写作目标</div>
                  <div className="space-y-2">
                    {(charter?.writingGoals || []).map((goal, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-purple-600 mt-0.5">✓</span>
                        <span className="text-gray-900">{goal}</span>
                      </div>
                    ))}
                    {(!charter?.writingGoals || charter.writingGoals.length === 0) && '暂无设定'}
                  </div>
                </div>

                {/* Forbidden Rules */}
                <div className="bg-red-50 rounded-xl p-5">
                  <div className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-2">禁忌事项</div>
                  <div className="space-y-2">
                    {(charter?.forbiddenRules || []).map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">✗</span>
                        <span className="text-gray-900">{rule}</span>
                      </div>
                    ))}
                    {(!charter?.forbiddenRules || charter.forbiddenRules.length === 0) && '暂无设定'}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Add Memory Button */}
                <button
                  onClick={() => setShowAddMemory(true)}
                  className="mb-6 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  添加记忆
                </button>

                {/* Memories by Type */}
                <div className="space-y-6">
                  {(Object.keys(MEMORY_TYPE_LABELS) as MemoryType[]).map((memType) => {
                    const typeMemories = memoriesByType[memType];
                    if (!typeMemories || typeMemories.length === 0) return null;
                    return (
                      <div key={memType}>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">{MEMORY_TYPE_LABELS[memType]}</h3>
                        <div className="space-y-3">
                          {typeMemories.map((mem) => (
                            <MemoryCard
                              key={mem.id}
                              memory={mem}
                              onEdit={() => setEditingMemory(mem)}
                              onDelete={() => handleDeleteMemory(mem.id)}
                              isDeleting={isDeletingMemory === mem.id}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Edit Memory Modal */}
      {editingMemory && (
        <MemoryEditModal
          memory={editingMemory}
          onClose={() => setEditingMemory(null)}
          onSave={(content) => handleUpdateMemory(editingMemory.id, content)}
        />
      )}

      {/* Add Memory Modal */}
      {showAddMemory && (
        <AddMemoryModal
          onClose={() => setShowAddMemory(false)}
          onSave={handleAddMemory}
        />
      )}
    </div>
  );
}

interface MemoryCardProps {
  memory: Memory;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function MemoryCard({ memory, onEdit, onDelete, isDeleting }: MemoryCardProps) {
  const content = memory.content;

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-gray-900 mb-2">{memory.key}</div>
          <div className="text-sm text-gray-600 space-y-1">
            {content.facts && content.facts.length > 0 && (
              <div>事实：{content.facts.slice(0, 3).join('；')}</div>
            )}
            {content.rules && content.rules.length > 0 && (
              <div>规则：{content.rules.slice(0, 3).join('；')}</div>
            )}
            {content.locations && content.locations.length > 0 && (
              <div>地点：{content.locations.map((l) => l.name).join('、')}</div>
            )}
            {content.characters && content.characters.length > 0 && (
              <div>人物：{content.characters.map((c) => c.name).join('、')}</div>
            )}
            {content.events && content.events.length > 0 && (
              <div>事件：{content.events.map((e) => e.title).join('、')}</div>
            )}
            {content.text && (
              <div className="line-clamp-2">{content.text}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            编辑
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {isDeleting ? '删除中...' : '删除'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MemoryEditModalProps {
  memory: Memory;
  onClose: () => void;
  onSave: (content: Memory['content']) => void;
}

function MemoryEditModal({ memory, onClose, onSave }: MemoryEditModalProps) {
  const [text, setText] = useState(memory.content.text || '');
  const [factsText, setFactsText] = useState(memory.content.facts?.join('\n') || '');
  const [rulesText, setRulesText] = useState(memory.content.rules?.join('\n') || '');

  const handleSave = () => {
    onSave({
      ...memory.content,
      text,
      facts: factsText ? factsText.split('\n').filter(Boolean) : undefined,
      rules: rulesText ? rulesText.split('\n').filter(Boolean) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">编辑 {memory.key}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        {memory.content.text !== undefined && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">文本内容</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all resize-none"
              placeholder="输入内容..."
            />
          </div>
        )}

        {memory.content.facts !== undefined && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">事实（每行一个）</label>
            <textarea
              value={factsText}
              onChange={(e) => setFactsText(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all resize-none"
              placeholder="每行一个事实..."
            />
          </div>
        )}

        {memory.content.rules !== undefined && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">规则（每行一个）</label>
            <textarea
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all resize-none"
              placeholder="每行一个规则..."
            />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddMemoryModalProps {
  onClose: () => void;
  onSave: (memoryType: MemoryType, key: string, content: Memory['content']) => void;
}

function AddMemoryModal({ onClose, onSave }: AddMemoryModalProps) {
  const [memoryType, setMemoryType] = useState<MemoryType>('user');
  const [key, setKey] = useState('');
  const [text, setText] = useState('');

  const handleSave = () => {
    if (!key.trim()) {
      toast.error('请输入记忆标题');
      return;
    }
    onSave(memoryType, key, { text });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">添加记忆</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">记忆类型</label>
            <select
              value={memoryType}
              onChange={(e) => setMemoryType(e.target.value as MemoryType)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all bg-white"
            >
              <option value="world">🌍 世界设定</option>
              <option value="narrative">📖 叙事与人物</option>
              <option value="style">🎨 风格指南</option>
              <option value="canon">⚡ 时间线与事实</option>
              <option value="user">👤 用户记忆</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">记忆标题</label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all"
              placeholder="输入记忆标题..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all resize-none"
              placeholder="输入记忆内容..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { EvaluationIssue, IssueType, IssueSeverity, IssueStatus } from '@packages/shared-types';
import { useRevisionStore } from '@/lib/state/revision-store';

interface EvaluationPanelProps {
  chapterId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

const SEVERITY_META: Record<IssueSeverity, { label: string; classes: string }> = {
  high: { label: '高优先级', classes: 'eval-severity-high' },
  medium: { label: '中优先级', classes: 'eval-severity-medium' },
  low: { label: '低优先级', classes: 'eval-severity-low' },
};

const TYPE_META: Record<string, { label: string }> = {
  style: { label: '风格' },
  pacing: { label: '节奏' },
  character: { label: '人物' },
  lore: { label: '设定' },
  timeline: { label: '时间线' },
  clarity: { label: '清晰度' },
};

const STATUS_META: Record<string, { label: string; classes: string }> = {
  open: { label: '待处理', classes: 'bg-blue-50 text-blue-600 border-blue-200' },
  in_revision: { label: '处理中', classes: 'bg-amber-50 text-amber-600 border-amber-200' },
  fixed: { label: '已处理', classes: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  branch: { label: '已处理（分支）', classes: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  wont_fix: { label: '不修复', classes: 'bg-gray-50 text-gray-500 border-gray-200' },
};

interface EvaluationMetrics {
  readability: number;
  rhythm: number;
  consistency: number;
}

interface EvaluationScoreSummary {
  style: number;
  pacing: number;
  character: number;
  lore: number;
  timeline: number;
  clarity: number;
}

export function EvaluationPanel({ chapterId, projectId, isOpen, onClose }: EvaluationPanelProps) {
  const [issues, setIssues] = useState<EvaluationIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortMode, setSortMode] = useState<string>('priority');
  const [openOnly, setOpenOnly] = useState(false);
  const [traceExpanded, setTraceExpanded] = useState(false);
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const { openModal, setSelectedText } = useRevisionStore();

  useEffect(() => {
    if (isOpen && chapterId) {
      fetchIssues();
    }
  }, [isOpen, chapterId]);

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/issues?chapterId=${chapterId}`);
      if (res.ok) {
        const payload = await res.json();
        setIssues(payload.data?.issues || []);
      }
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const res = await fetch(`/api/agents/evaluate/${chapterId}`, {
        method: 'POST',
      });
      if (res.ok) {
        const payload = await res.json();
        const data = payload.data ?? {};
        setIssues(data.issues || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        } else if (data.scoreSummary) {
          const scoreSummary = data.scoreSummary as EvaluationScoreSummary;
          setMetrics({
            readability: scoreSummary.clarity,
            rhythm: scoreSummary.pacing,
            consistency: Math.round(
              (scoreSummary.character + scoreSummary.lore + scoreSummary.timeline) / 3
            ),
          });
        }
      }
    } catch (error) {
      console.error('Failed to evaluate:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleUpdateStatus = async (issueId: string, status: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const payload = await res.json();
        setIssues((prev) => prev.map((i) => (i.id === issueId ? payload.data?.issue ?? i : i)));
      }
    } catch (error) {
      console.error('Failed to update issue:', error);
    }
  };

  const handleCreateRevision = async (issueId: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/create-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        alert('已为该问题创建修订任务');
        fetchIssues();
      }
    } catch (error) {
      console.error('Failed to create revision:', error);
    }
  };

  const handleDirectRevision = async (issueId: string) => {
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) return;
    setSelectedText(issue.excerpt || '');
    openModal(issue.excerpt || '');
    onClose();
  };

  const getFilteredAndSortedIssues = () => {
    let filtered = [...issues];
    if (filterType !== 'all') {
      filtered = filtered.filter((i) => i.issueType === filterType);
    }
    if (filterSeverity !== 'all') {
      filtered = filtered.filter((i) => i.severity === filterSeverity);
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter((i) => i.status === filterStatus);
    }
    if (openOnly) {
      filtered = filtered.filter((i) => !['fixed', 'branch'].includes(i.status || ''));
    }
    filtered.sort((a, b) => {
      if (sortMode === 'paragraph') {
        return (a.paragraphIndex || 0) - (b.paragraphIndex || 0);
      }
      if (sortMode === 'status') {
        const statusOrder: Record<string, number> = { open: 0, in_revision: 1, branch: 2, fixed: 3, wont_fix: 4 };
        return (statusOrder[a.status || 'open'] || 0) - (statusOrder[b.status || 'open'] || 0);
      }
      const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (severityOrder[a.severity] || 1) - (severityOrder[b.severity] || 1);
    });
    return filtered;
  };

  const getHandledIssues = () => {
    return issues.filter((i) => ['fixed', 'branch'].includes(i.status || ''));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-3xl bg-white shadow-2xl h-full flex flex-col fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">智能评估</h3>
            <p className="text-xs text-gray-500 mt-0.5">将问题定位到具体段落，并可直接送去修订。</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              {isEvaluating ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  评估中...
                </>
              ) : (
                '运行评估'
              )}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="text-2xl font-bold text-blue-900">{metrics.readability}</div>
                <div className="text-xs text-blue-700 mb-2">可读性评分</div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${metrics.readability}%` }} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="text-2xl font-bold text-purple-900">{metrics.rhythm}</div>
                <div className="text-xs text-purple-700 mb-2">节奏健康度</div>
                <div className="w-full bg-purple-200 rounded-full h-1.5">
                  <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${metrics.rhythm}%` }} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                <div className="text-2xl font-bold text-emerald-900">{metrics.consistency}%</div>
                <div className="text-xs text-emerald-700 mb-2">人物一致性</div>
                <div className="w-full bg-emerald-200 rounded-full h-1.5">
                  <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${metrics.consistency}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterType === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
          >
            全部
          </button>
          {Object.entries(TYPE_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterType === key ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
            >
              {meta.label}
            </button>
          ))}
          <button
            onClick={() => setOpenOnly(!openOnly)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${openOnly ? 'bg-amber-600 text-white border-amber-600' : 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100'}`}
          >
            只看未处理
          </button>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700 bg-white outline-none"
          >
            <option value="priority">按优先级</option>
            <option value="paragraph">按段落位置</option>
            <option value="status">按处理状态</option>
          </select>
        </div>

        {/* Issue List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <span className="text-gray-500">加载中...</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {getFilteredAndSortedIssues().map((issue) => (
                <div key={issue.id} className="eval-issue-card p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${SEVERITY_META[issue.severity]?.classes || 'bg-gray-100 text-gray-600'}`}>
                          {SEVERITY_META[issue.severity]?.label || issue.severity}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          {TYPE_META[issue.issueType]?.label || issue.issueType}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_META[issue.status || 'open']?.classes || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {STATUS_META[issue.status || 'open']?.label || '待处理'}
                        </span>
                        {issue.paragraphIndex !== undefined && (
                          <span className="text-xs text-gray-400">定位到第 {issue.paragraphIndex + 1} 段</span>
                        )}
                        {issue.linkedVersionLabel && (
                          <span className="text-xs text-indigo-600">关联版本：{issue.linkedVersionLabel}</span>
                        )}
                      </div>
                      <h4 className="text-base font-semibold text-gray-900">{issue.title}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{issue.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {/* TODO: jump to paragraph */}}
                        className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        定位段落
                      </button>
                      <button
                        onClick={() => handleDirectRevision(issue.id)}
                        className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                      >
                        直接修订
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(issue.id, 'fixed')}
                        className="px-3 py-2 text-sm font-medium rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                      >
                        标记已处理
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(issue.id, 'open')}
                        className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        标记未处理
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="text-xs font-semibold text-gray-400 uppercase mb-2">问题段落</div>
                      <div className="text-sm text-gray-700 leading-relaxed editor-font">
                        {issue.excerpt}
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="text-xs font-semibold text-amber-700 uppercase mb-2">修改理由与建议</div>
                      <div className="text-sm text-gray-700 leading-relaxed mb-2">
                        <span className="font-medium text-gray-900">理由：</span>{issue.reason}
                      </div>
                      <div className="text-sm text-gray-700 leading-relaxed mb-2">
                        <span className="font-medium text-gray-900">建议：</span>{issue.suggestion}
                      </div>
                      {issue.linkedVersionSummary && (
                        <div className="text-xs text-gray-500 leading-relaxed">
                          最近处理记录：{issue.linkedVersionSummary}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {getFilteredAndSortedIssues().length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">{openOnly ? '当前没有未处理问题。' : '当前筛选下暂无问题项。'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Evaluation Trace Panel */}
        <div className="border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => setTraceExpanded(!traceExpanded)}
            className="w-full px-6 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span>评估处理痕迹 {getHandledIssues().length > 0 && `(${getHandledIssues().length})`}</span>
            <svg className={`w-4 h-4 transition-transform ${traceExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {traceExpanded && (
            <div className="px-6 pb-4">
              {getHandledIssues().length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">暂无处理记录</p>
              ) : (
                <div className="space-y-3">
                  {getHandledIssues().map((issue) => (
                    <div key={issue.id} className="rounded-xl border border-emerald-200 bg-white/80 p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {issue.status === 'wont_fix' ? '已处理（分支）' : '已处理'}
                            </span>
                            {issue.paragraphIndex !== undefined && (
                              <span className="text-[11px] text-emerald-700">第 {issue.paragraphIndex + 1} 段</span>
                            )}
                            {issue.linkedVersionLabel && (
                              <span className="text-[11px] text-indigo-600">版本：{issue.linkedVersionLabel}</span>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-gray-900">{issue.title}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {issue.linkedVersionSummary || issue.suggestion || ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {/* TODO: jump to paragraph */}}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                          >
                            定位正文
                          </button>
                          {issue.linkedVersionLabel && (
                            <button
                              onClick={() => {/* TODO: switch to versions tab */}}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              查看版本
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

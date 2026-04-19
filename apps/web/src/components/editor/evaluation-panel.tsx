'use client';

import { useState, useEffect } from 'react';
import {
  EvaluationIssue,
  IssueStatus,
  EvaluationMetrics,
  IssueTag,
  TAG_CATEGORY_META,
  SEVERITY_META,
  ISSUE_STATUS_META,
} from '@packages/shared-types';
import { useRevisionStore } from '@/lib/state/revision-store';

interface EvaluationPanelProps {
  chapterId: string;
  projectId: string;
  chapterTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface EvaluationScoreSummary {
  chapter_goal_completion: number;
  plot_progress_and_causality: number;
  conflict_and_tension: number;
  character_and_voice: number;
  language_and_style: number;
  continuity_and_consistency: number;
  information_and_pacing: number;
  ending_hook: number;
  total: number;
  ai_smell_severity?: 'low' | 'medium' | 'high';
}

interface EvaluationResult {
  gate: {
    text_completeness: { status: string; reason: string };
    readability_format: { status: string; reason: string };
    continuity_hard_conflict: { status: string; reason: string };
    chapter_goal_alignment: { status: string; reason: string };
    ai_template_smell: { status: string; reason: string };
  };
  scores: EvaluationScoreSummary;
  issueTags: IssueTag[];
  strengths: string[];
  majorIssues: string[];
  revision: {
    must_fix: string[];
    should_improve: string[];
    optional_enhancements: string[];
  };
  decision: string;
}

export function EvaluationPanel({ chapterId, projectId, chapterTitle, isOpen, onClose }: EvaluationPanelProps) {
  const [issues, setIssues] = useState<EvaluationIssue[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [openOnly, setOpenOnly] = useState(false);
  const [sortMode, setSortMode] = useState<string>('priority');
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

        // Try to parse evaluation result if returned
        if (data.evaluationResult) {
          setEvaluationResult(data.evaluationResult);
        } else if (data.scoreSummary) {
          // Legacy fallback
          const scoreSummary = data.scoreSummary;
          setMetrics({
            readability: scoreSummary.clarity || 70,
            rhythm: scoreSummary.pacing || 70,
            consistency: Math.round(
              ((scoreSummary.character || 70) + (scoreSummary.lore || 70) + (scoreSummary.timeline || 70)) / 3
            ),
          });
        }

        setIssues(data.issues || []);
        fetchIssues();
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

    try {
      const res = await fetch(`/api/issues/${issueId}/create-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const payload = await res.json();
        const revision = payload.data?.revision;
        const updatedIssue = payload.data?.issue;
        const { setCurrentRevision, setSuggestions, setSuggestionText } = useRevisionStore.getState();

        if (revision) {
          setCurrentRevision(revision);
        }
        if (updatedIssue) {
          setIssues((prev) => prev.map((item) => (item.id === issueId ? updatedIssue : item)));
        }
        if (issue.suggestion) {
          setSuggestions([issue.suggestion]);
          setSuggestionText(issue.suggestion);
        }
      }
    } catch (error) {
      console.error('Failed to create linked revision:', error);
    }

    setSelectedText(issue.excerpt || '');
    openModal(issue.excerpt || '');
    onClose();
  };

  const getFilteredAndSortedIssues = () => {
    let filtered = [...issues];

    if (filterTag !== 'all') {
      filtered = filtered.filter((i) => {
        const issueTags = (i as any).tags || [];
        return issueTags.includes(filterTag) || i.issueType === filterTag;
      });
    }

    if (openOnly) {
      filtered = filtered.filter((i) => !['fixed', 'branch'].includes(i.status || ''));
    }

    filtered.sort((a, b) => {
      if (sortMode === 'paragraph') {
        return (a.paragraphIndex || 0) - (b.paragraphIndex || 0);
      }
      if (sortMode === 'status') {
        const statusOrder: Record<string, number> = {
          open: 0,
          in_revision: 1,
          branch: 2,
          fixed: 3,
          wont_fix: 4,
        };
        return (
          (statusOrder[a.status || 'open'] || 0) -
          (statusOrder[b.status || 'open'] || 0)
        );
      }
      const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (
        (severityOrder[a.severity] || 1) - (severityOrder[b.severity] || 1) ||
        (a.paragraphIndex || 0) - (b.paragraphIndex || 0)
      );
    });

    return filtered;
  };

  const getHandledIssues = () => {
    return issues.filter((i) => ['fixed', 'branch', 'wont_fix'].includes(i.status || ''));
  };

  const getDecisionLabel = (decision: string) => {
    const labels: Record<string, string> = {
      pass: '通过',
      pass_with_notes: '通过（待优化）',
      partial_rewrite: '局部重写',
      full_rewrite: '整章重写',
      human_review: '转人工审阅',
      gate_fail: 'Gate检查未通过',
    };
    return labels[decision] || decision;
  };

  const getDecisionColor = (decision: string) => {
    const colors: Record<string, string> = {
      pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      pass_with_notes: 'bg-blue-50 text-blue-700 border-blue-200',
      partial_rewrite: 'bg-amber-50 text-amber-700 border-amber-200',
      full_rewrite: 'bg-orange-50 text-orange-700 border-orange-200',
      human_review: 'bg-red-50 text-red-700 border-red-200',
      gate_fail: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[decision] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-4xl bg-white shadow-2xl h-full flex flex-col fade-in overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
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

        {/* Chapter Info & Decision */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-gray-600">
              当前章节：<span className="font-semibold text-gray-900">{chapterTitle || `章节 ${chapterId}`}</span>
            </div>
            {evaluationResult && (
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getDecisionColor(evaluationResult.decision)}`}>
                评估结论：{getDecisionLabel(evaluationResult.decision)}
              </div>
            )}
          </div>
        </div>

        {/* Gate Results */}
        {evaluationResult && (
          <div className="px-6 py-3 border-b border-gray-100 bg-red-50/50">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-medium text-gray-700">Gate检查：</span>
              {Object.entries(evaluationResult.gate).map(([key, check]) => {
                const status = check.status;
                const colorClass =
                  status === 'pass'
                    ? 'bg-emerald-100 text-emerald-700'
                    : status === 'warn'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700';
                const label = {
                  text_completeness: '文本完整',
                  readability_format: '格式可读',
                  continuity_hard_conflict: '设定一致',
                  chapter_goal_alignment: '目标对齐',
                  ai_template_smell: 'AI模板化',
                }[key] || key;
                return (
                  <span key={key} className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
                    {label}：{status === 'pass' ? '✓' : status === 'warn' ? '⚠' : '✗'}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Metrics */}
        {evaluationResult && (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="text-2xl font-bold text-blue-900">
                  {evaluationResult.scores.total}
                </div>
                <div className="text-xs text-blue-700 mb-2">综合评分</div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${evaluationResult.scores.total}%` }}
                  />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="text-2xl font-bold text-purple-900">
                  {evaluationResult.scores.conflict_and_tension +
                    evaluationResult.scores.plot_progress_and_causality +
                    evaluationResult.scores.chapter_goal_completion}
                </div>
                <div className="text-xs text-purple-700 mb-2">剧情质量 (满分45)</div>
                <div className="w-full bg-purple-200 rounded-full h-1.5">
                  <div
                    className="bg-purple-600 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${
                        ((evaluationResult.scores.conflict_and_tension +
                          evaluationResult.scores.plot_progress_and_causality +
                          evaluationResult.scores.chapter_goal_completion) /
                          45) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                <div className="text-2xl font-bold text-emerald-900">
                  {evaluationResult.scores.character_and_voice +
                    evaluationResult.scores.language_and_style}
                </div>
                <div className="text-xs text-emerald-700 mb-2">人物语言 (满分25)</div>
                <div className="w-full bg-emerald-200 rounded-full h-1.5">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${
                        ((evaluationResult.scores.character_and_voice +
                          evaluationResult.scores.language_and_style) /
                          25) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Strengths & Issues Summary */}
        {evaluationResult && evaluationResult.strengths.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-xs font-medium text-emerald-700">亮点：</span>
              {evaluationResult.strengths.slice(0, 2).map((s, i) => (
                <span key={i} className="text-xs text-gray-600 bg-emerald-50 px-2 py-1 rounded">
                  {s}
                </span>
              ))}
            </div>
            {evaluationResult.majorIssues.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-medium text-red-700">主要问题：</span>
                {evaluationResult.majorIssues.slice(0, 2).map((s, i) => (
                  <span key={i} className="text-xs text-gray-600 bg-red-50 px-2 py-1 rounded">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterTag('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterTag === 'all'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            全部
          </button>
          {Object.entries(TAG_CATEGORY_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setFilterTag(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterTag === key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              {meta.label}
            </button>
          ))}
          <button
            onClick={() => setOpenOnly(!openOnly)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              openOnly
                ? 'bg-amber-600 text-white border-amber-600'
                : 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100'
            }`}
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
                <div key={issue.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            SEVERITY_META[issue.severity]?.classes || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {SEVERITY_META[issue.severity]?.label || issue.severity}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          {issue.issueType}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                            ISSUE_STATUS_META[issue.status || 'open']?.classes ||
                            'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {ISSUE_STATUS_META[issue.status || 'open']?.label || '待处理'}
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
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
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
                      <button
                        onClick={() => handleDirectRevision(issue.id)}
                        className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                      >
                        直接修订
                      </button>
                    </div>
                  </div>

                  {/* Excerpt & Suggestion */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="text-xs font-semibold text-gray-400 uppercase mb-2">问题段落</div>
                      <div className="text-sm text-gray-700 leading-relaxed editor-font">
                        {issue.excerpt || '(无原文摘录)'}
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="text-xs font-semibold text-amber-700 uppercase mb-2">修改理由与建议</div>
                      <div className="text-sm text-gray-700 leading-relaxed mb-2">
                        <span className="font-medium text-gray-900">理由：</span>
                        {issue.reason}
                      </div>
                      {issue.suggestion && (
                        <div className="text-sm text-gray-700 leading-relaxed mb-2">
                          <span className="font-medium text-gray-900">建议：</span>
                          {issue.suggestion}
                        </div>
                      )}
                      {issue.linkedVersionSummary && (
                        <div className="text-xs text-gray-500 leading-relaxed">
                          最近处理记录：{issue.linkedVersionSummary}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {(issue as any).tags && (issue as any).tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(issue as any).tags.map((tag: IssueTag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded border border-purple-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
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

        {/* Evaluation Trace Panel (Bottom) */}
        <div className="border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            onClick={() => setTraceExpanded(!traceExpanded)}
            className="w-full px-6 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span>
              评估处理痕迹 {getHandledIssues().length > 0 && `(${getHandledIssues().length})`}
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${traceExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {traceExpanded && (
            <div className="px-6 pb-4 max-h-64 overflow-y-auto">
              {getHandledIssues().length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">暂无处理记录</p>
              ) : (
                <div className="space-y-3">
                  {getHandledIssues().map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-xl border border-emerald-200 bg-white/80 p-4"
                    >
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
                          {issue.status === 'wont_fix' && issue.linkedVersionLabel && (
                            <button
                              onClick={() => {
                                /* TODO: switch to versions tab */
                              }}
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

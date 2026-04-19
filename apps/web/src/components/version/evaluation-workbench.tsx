'use client';

import { useState, useEffect } from 'react';
import { Chapter, EvaluationIssue, EvaluationMetrics, IssueTag, RevisionTask } from '@packages/shared-types';
import { useRevisionStore } from '@/lib/state/revision-store';

interface EvaluationWorkbenchProps {
  projectId: string;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  onClose?: () => void;
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

const TAG_CATEGORY_META: Record<string, { label: string }> = {
  all: { label: '全部' },
  剧情: { label: '剧情' },
  冲突: { label: '冲突' },
  人物: { label: '人物' },
  风格: { label: '风格' },
  连贯性: { label: '连贯性' },
  节奏: { label: '节奏' },
  结构: { label: '结构' },
};

const SEVERITY_META: Record<string, { label: string; classes: string }> = {
  high: { label: '高优先级', classes: 'bg-red-100 text-red-700 border-red-200' },
  medium: { label: '中优先级', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  low: { label: '低优先级', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const STATUS_META: Record<string, { label: string; classes: string }> = {
  open: { label: '待处理', classes: 'bg-blue-50 text-blue-600 border-blue-200' },
  in_revision: { label: '处理中', classes: 'bg-amber-50 text-amber-600 border-amber-200' },
  fixed: { label: '已处理', classes: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  wont_fix: { label: '不修复', classes: 'bg-gray-50 text-gray-500 border-gray-200' },
};

export function EvaluationWorkbench({ projectId, chapters, currentChapter, onClose }: EvaluationWorkbenchProps) {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(currentChapter?.id || null);
  const [issues, setIssues] = useState<EvaluationIssue[]>([]);
  const [revisions, setRevisions] = useState<RevisionTask[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [openOnly, setOpenOnly] = useState(false);
  const [sortMode, setSortMode] = useState<string>('priority');
  const [traceExpanded, setTraceExpanded] = useState(false);
  const { openModal, setSelectedText } = useRevisionStore();

  // Sync with currentChapter from sidebar
  useEffect(() => {
    if (currentChapter) {
      setSelectedChapterId(currentChapter.id);
    }
  }, [currentChapter?.id]);

  // Fetch issues when selectedChapterId changes
  useEffect(() => {
    if (!selectedChapterId) {
      setIssues([]);
      setEvaluationResult(null);
      setIsLoading(false);
      return;
    }

    fetchIssues(selectedChapterId);
  }, [selectedChapterId]);

  const fetchIssues = async (chapterId: string) => {
    setIsLoading(true);
    try {
      // Fetch issues
      const issuesRes = await fetch(`/api/issues?chapterId=${chapterId}`);
      if (issuesRes.ok) {
        const issuesPayload = await issuesRes.json();
        setIssues(issuesPayload.data?.issues || []);
      }

      // Fetch revisions for this chapter
      const revisionsRes = await fetch(`/api/revisions?chapterId=${chapterId}`);
      if (revisionsRes.ok) {
        const revisionsPayload = await revisionsRes.json();
        setRevisions(revisionsPayload.data?.revisions || []);
      }
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    if (!selectedChapterId) return;

    setIsEvaluating(true);
    try {
      const res = await fetch(`/api/agents/evaluate/${selectedChapterId}`, {
        method: 'POST',
      });
      if (res.ok) {
        const payload = await res.json();
        const data = payload.data ?? {};

        if (data.evaluationResult) {
          setEvaluationResult(data.evaluationResult);
        }

        if (data.issues) {
          setIssues(data.issues);
        } else {
          fetchIssues(selectedChapterId);
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

  const handleDirectRevision = async (issueId: string) => {
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) return;
    const revision = revisions.find((r) => r.linkedIssueId === issueId);

    // If we have a revision, pre-populate from it
    if (revision) {
      try {
        const res = await fetch(`/api/revisions/${revision.id}`);
        if (res.ok) {
          const payload = await res.json();
          const fullRevision = payload.data?.revision;
          if (fullRevision) {
            const { setCurrentRevision, setGoals, setSuggestions } = useRevisionStore.getState();
            setCurrentRevision(fullRevision);
            if (fullRevision.issueContext?.suggestion) {
              setSuggestions([fullRevision.issueContext.suggestion]);
            }
            if (fullRevision.goals?.length) {
              setGoals(fullRevision.goals);
            }

            // Use issue.excerpt if available, otherwise fetch chapter content
            let originalText = issue.excerpt || '';
            if (!originalText && selectedChapterId) {
              // Fetch chapter content as fallback
              const chapterRes = await fetch(`/api/chapters/${selectedChapterId}/draft`);
              if (chapterRes.ok) {
                const chapterData = await chapterRes.json();
                const segments = chapterData.data?.segments || [];
                originalText = segments.map((s: any) => s.content).join('\n\n') || '';
              }
            }

            openModal(originalText, undefined, fullRevision.targetScope || 'segment');
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch revision:', error);
      }
    }

    // Fallback: open modal with chapter content if no excerpt
    let originalText = issue.excerpt || '';
    if (!originalText && selectedChapterId) {
      try {
        const chapterRes = await fetch(`/api/chapters/${selectedChapterId}/draft`);
        if (chapterRes.ok) {
          const chapterData = await chapterRes.json();
          const segments = chapterData.data?.segments || [];
          originalText = segments.map((s: any) => s.content).join('\n\n') || '';
        }
      } catch (error) {
        console.error('Failed to fetch chapter content:', error);
      }
    }
    openModal(originalText, undefined, 'segment');
  };

  // Helper to get revision status for an issue
  const getRevisionForIssue = (issueId: string): RevisionTask | undefined => {
    return revisions.find((r) => r.linkedIssueId === issueId);
  };

  // Helper to get revision status label
  const getRevisionStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      draft: '待生成',
      running: '生成中',
      reviewed: '待应用',
      applied: '已应用',
      rejected: '已拒绝',
    };
    return labels[status || ''] || status;
  };

  const getRevisionStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600',
      running: 'bg-amber-100 text-amber-700',
      reviewed: 'bg-blue-100 text-blue-700',
      applied: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status || ''] || 'bg-gray-100 text-gray-600';
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
        const statusOrder: Record<string, number> = { open: 0, in_revision: 1, branch: 2, fixed: 3, wont_fix: 4 };
        return (statusOrder[a.status || 'open'] || 0) - (statusOrder[b.status || 'open'] || 0);
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

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId);

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                返回
              </button>
            )}
            <h1 className="text-xl font-bold text-gray-900">智能评估</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Chapter Selector */}
            <select
              value={selectedChapterId || ''}
              onChange={(e) => setSelectedChapterId(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="">选择章节...</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>

            {/* Run Evaluation Button */}
            <button
              onClick={handleRunEvaluation}
              disabled={!selectedChapterId || isEvaluating}
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!selectedChapterId ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-gray-500">请选择要评估的章节</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chapter Info & Decision */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm text-gray-600">
                  当前章节：<span className="font-semibold text-gray-900">{selectedChapter?.title}</span>
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
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Gate 检查</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(evaluationResult.gate).map(([key, check]) => {
                    const status = check.status;
                    const colorClass =
                      status === 'pass'
                        ? 'bg-emerald-100 text-emerald-700'
                        : status === 'warn'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700';
                    const gateLabels: Record<string, string> = {
                      text_completeness: '文本完整',
                      readability_format: '格式可读',
                      continuity_hard_conflict: '设定一致',
                      chapter_goal_alignment: '目标对齐',
                      ai_template_smell: 'AI模板化',
                    };
                    const label = gateLabels[key] || key;
                    return (
                      <span key={key} className={`px-3 py-1.5 rounded text-xs font-medium ${colorClass}`}>
                        {label}：{status === 'pass' ? '✓' : status === 'warn' ? '⚠' : '✗'}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Metrics Cards */}
            {evaluationResult && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                  <div className="text-3xl font-bold text-blue-900">{evaluationResult.scores.total}</div>
                  <div className="text-sm text-blue-700 mb-2">综合评分</div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${evaluationResult.scores.total}%` }} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                  <div className="text-3xl font-bold text-purple-900">
                    {evaluationResult.scores.conflict_and_tension + evaluationResult.scores.plot_progress_and_causality + evaluationResult.scores.chapter_goal_completion}
                  </div>
                  <div className="text-sm text-purple-700 mb-2">剧情质量 (满分45)</div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.round((evaluationResult.scores.conflict_and_tension + evaluationResult.scores.plot_progress_and_causality + evaluationResult.scores.chapter_goal_completion) / 45 * 100)}%` }} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200">
                  <div className="text-3xl font-bold text-emerald-900">
                    {evaluationResult.scores.character_and_voice + evaluationResult.scores.language_and_style}
                  </div>
                  <div className="text-sm text-emerald-700 mb-2">人物语言 (满分25)</div>
                  <div className="w-full bg-emerald-200 rounded-full h-2">
                    <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${Math.round((evaluationResult.scores.character_and_voice + evaluationResult.scores.language_and_style) / 25 * 100)}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* Strengths & Issues */}
            {evaluationResult && evaluationResult.strengths.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-xs font-medium text-emerald-700">亮点：</span>
                  {evaluationResult.strengths.slice(0, 2).map((s, i) => (
                    <span key={i} className="text-xs text-gray-600 bg-emerald-50 px-2 py-1 rounded">{s}</span>
                  ))}
                </div>
                {evaluationResult.majorIssues.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-medium text-red-700">主要问题：</span>
                    {evaluationResult.majorIssues.slice(0, 2).map((s, i) => (
                      <span key={i} className="text-xs text-gray-600 bg-red-50 px-2 py-1 rounded">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Issues List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="font-semibold text-gray-900">可执行问题清单</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Filter Chips */}
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
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <span className="text-gray-500">加载中...</span>
                  </div>
                ) : getFilteredAndSortedIssues().length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">{openOnly ? '当前没有未处理问题。' : '暂无问题项。'}</p>
                  </div>
                ) : (
                  getFilteredAndSortedIssues().map((issue) => (
                    <div key={issue.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${SEVERITY_META[issue.severity]?.classes || 'bg-gray-100 text-gray-600'}`}>
                              {SEVERITY_META[issue.severity]?.label || issue.severity}
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              {issue.issueType}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_META[issue.status || 'open']?.classes || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {STATUS_META[issue.status || 'open']?.label || '待处理'}
                            </span>
                            {/* Show revision status if exists */}
                            {(() => {
                              const rev = getRevisionForIssue(issue.id);
                              if (rev) {
                                return (
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRevisionStatusColor(rev.status)}`}>
                                    修订：{getRevisionStatusLabel(rev.status)}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {issue.paragraphIndex !== undefined && (
                              <span className="text-xs text-gray-400">第 {issue.paragraphIndex + 1} 段</span>
                            )}
                            {issue.linkedVersionLabel && (
                              <span className="text-xs text-indigo-600">关联版本：{issue.linkedVersionLabel}</span>
                            )}
                          </div>
                          <h4 className="text-base font-semibold text-gray-900">{issue.title}</h4>
                          <p className="text-sm text-gray-600 leading-relaxed">{issue.reason}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          {(() => {
                            const rev = getRevisionForIssue(issue.id);
                            if (rev?.status === 'draft') {
                              return (
                                <button
                                  onClick={() => handleDirectRevision(issue.id)}
                                  className="px-3 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                                >
                                  生成修订
                                </button>
                              );
                            }
                            if (rev?.status === 'reviewed') {
                              return (
                                <button
                                  onClick={() => handleDirectRevision(issue.id)}
                                  className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                >
                                  查看修订
                                </button>
                              );
                            }
                            if (rev?.status === 'applied') {
                              return (
                                <span className="px-3 py-2 text-sm font-medium text-emerald-600">
                                  已应用
                                </span>
                              );
                            }
                            return (
                              <button
                                onClick={() => handleDirectRevision(issue.id)}
                                className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                              >
                                直接修订
                              </button>
                            );
                          })()}
                          {issue.status !== 'fixed' && (
                            <button
                              onClick={() => handleUpdateStatus(issue.id, 'fixed')}
                              className="px-3 py-2 text-sm font-medium rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                            >
                              标记已处理
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="text-xs font-semibold text-gray-400 uppercase mb-2">问题段落</div>
                          <div className="text-sm text-gray-700 leading-relaxed">
                            {issue.excerpt || '(无原文摘录)'}
                          </div>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <div className="text-xs font-semibold text-amber-700 uppercase mb-2">修改建议</div>
                          <div className="text-sm text-gray-700 leading-relaxed mb-2">
                            <span className="font-medium text-gray-900">理由：</span>{issue.reason}
                          </div>
                          {issue.suggestion && (
                            <div className="text-sm text-gray-700 leading-relaxed">
                              <span className="font-medium text-gray-900">建议：</span>{issue.suggestion}
                            </div>
                          )}
                        </div>
                      </div>

                      {(issue as any).tags && (issue as any).tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {(issue as any).tags.map((tag: IssueTag) => (
                            <span key={tag} className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded border border-purple-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Evaluation Trace Panel */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setTraceExpanded(!traceExpanded)}
                className="w-full px-5 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>评估处理痕迹 {getHandledIssues().length > 0 && `(${getHandledIssues().length})`}</span>
                <svg className={`w-4 h-4 transition-transform ${traceExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {traceExpanded && (
                <div className="px-5 pb-4 max-h-64 overflow-y-auto">
                  {getHandledIssues().length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">暂无处理记录</p>
                  ) : (
                    <div className="space-y-3">
                      {getHandledIssues().map((issue) => (
                        <div key={issue.id} className="rounded-xl border border-emerald-200 bg-white/80 p-4">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {issue.status === 'wont_fix' ? '已处理（分支）' : '已处理'}
                                </span>
                                {issue.paragraphIndex !== undefined && (
                                  <span className="text-[11px] text-emerald-700">第 {issue.paragraphIndex + 1} 段</span>
                                )}
                              </div>
                              <div className="text-sm font-semibold text-gray-900">{issue.title}</div>
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
        )}
      </div>
    </div>
  );
}

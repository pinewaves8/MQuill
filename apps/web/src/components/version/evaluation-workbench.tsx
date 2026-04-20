'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Chapter,
  EvaluationDetailsData,
  EvaluationHistoryEntry,
  EvaluationIssue,
  EvaluationScoreCard as ScoreCardType,
  EvaluationScoreData,
  EvaluationSummaryData,
  IssueTag,
  ISSUE_STATUS_META,
  RevisionTask,
  SEVERITY_META,
  TAG_CATEGORY_META,
} from '@packages/shared-types';
import { EvaluationScoreCard, buildScoreCard } from '@/components/editor/evaluation-score-card';
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

type WorkbenchTab = 'current' | 'history';
type RawScoreKey =
  | 'chapter_goal_completion'
  | 'plot_progress_and_causality'
  | 'conflict_and_tension'
  | 'character_and_voice'
  | 'language_and_style'
  | 'continuity_and_consistency'
  | 'information_and_pacing'
  | 'ending_hook';

const REVISION_STATUS_META: Record<string, { label: string; classes: string }> = {
  draft: { label: '待生成', classes: 'bg-gray-100 text-gray-600' },
  running: { label: '生成中', classes: 'bg-amber-100 text-amber-700' },
  reviewed: { label: '待应用', classes: 'bg-blue-100 text-blue-700' },
  applied: { label: '已应用', classes: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '已拒绝', classes: 'bg-red-100 text-red-700' },
};

const RAW_SCORE_LABELS: Array<{ key: RawScoreKey; label: string }> = [
  { key: 'chapter_goal_completion', label: '章节目标完成' },
  { key: 'plot_progress_and_causality', label: '剧情推进与因果' },
  { key: 'conflict_and_tension', label: '冲突与张力' },
  { key: 'character_and_voice', label: '人物与声音' },
  { key: 'language_and_style', label: '语言与风格' },
  { key: 'continuity_and_consistency', label: '连续性与一致性' },
  { key: 'information_and_pacing', label: '信息与节奏' },
  { key: 'ending_hook', label: '结尾钩子' },
];

export function EvaluationWorkbench({ projectId, chapters, currentChapter, onClose }: EvaluationWorkbenchProps) {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(currentChapter?.id || null);
  const [issues, setIssues] = useState<EvaluationIssue[]>([]);
  const [revisions, setRevisions] = useState<RevisionTask[]>([]);
  const [evaluationResults, setEvaluationResults] = useState<Record<string, EvaluationResult>>({});
  const [scoreCards, setScoreCards] = useState<Record<string, ScoreCardType>>({});
  const [histories, setHistories] = useState<Record<string, EvaluationHistoryEntry[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [openOnly, setOpenOnly] = useState(true);
  const [sortMode, setSortMode] = useState<string>('priority');
  const [traceExpanded, setTraceExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('current');
  const [leftHistoryId, setLeftHistoryId] = useState<string>('');
  const [rightHistoryId, setRightHistoryId] = useState<string>('');
  const { openModal } = useRevisionStore();

  useEffect(() => {
    if (currentChapter?.id) {
      setSelectedChapterId(currentChapter.id);
    }
  }, [currentChapter?.id]);

  useEffect(() => {
    if (!selectedChapterId) {
      setIssues([]);
      setRevisions([]);
      setIsLoading(false);
      return;
    }

    void fetchChapterState(selectedChapterId);
  }, [selectedChapterId]);

  const selectedChapter = chapters.find((chapter) => chapter.id === selectedChapterId) ?? null;
  const evaluationResult = selectedChapterId ? evaluationResults[selectedChapterId] ?? null : null;
  const scoreCard = selectedChapterId ? scoreCards[selectedChapterId] ?? null : null;
  const historyEntries = selectedChapterId ? histories[selectedChapterId] ?? [] : [];

  useEffect(() => {
    if (historyEntries.length === 0) {
      setLeftHistoryId('');
      setRightHistoryId('');
      return;
    }

    setLeftHistoryId((current) => {
      if (current && historyEntries.some((entry) => entry.id === current)) {
        return current;
      }
      return historyEntries[0]?.id ?? '';
    });

    setRightHistoryId((current) => {
      if (current && historyEntries.some((entry) => entry.id === current)) {
        return current;
      }
      return historyEntries[1]?.id ?? historyEntries[0]?.id ?? '';
    });
  }, [historyEntries]);

  const leftEntry = historyEntries.find((entry) => entry.id === leftHistoryId) ?? historyEntries[0] ?? null;
  const rightEntry = historyEntries.find((entry) => entry.id === rightHistoryId) ?? historyEntries[1] ?? historyEntries[0] ?? null;

  const filteredIssues = useMemo(() => {
    let next = [...issues];

    if (filterTag !== 'all') {
      next = next.filter((issue) => {
        const tags = (issue as EvaluationIssue & { tags?: string[] }).tags || [];
        return tags.includes(filterTag) || issue.issueType === filterTag;
      });
    }

    if (openOnly) {
      next = next.filter((issue) => !['fixed', 'branch'].includes(issue.status || ''));
    }

    next.sort((a, b) => {
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

    return next;
  }, [filterTag, issues, openOnly, sortMode]);

  const handledIssues = issues.filter((issue) => ['fixed', 'branch', 'wont_fix'].includes(issue.status || ''));

  const fetchChapterState = async (chapterId: string) => {
    setIsLoading(true);

    try {
      const [issuesRes, revisionsRes, chapterRes] = await Promise.all([
        fetch(`/api/issues?chapterId=${chapterId}`),
        fetch(`/api/revisions?chapterId=${chapterId}`),
        fetch(`/api/chapters/${chapterId}`),
      ]);

      if (issuesRes.ok) {
        const issuesPayload = await issuesRes.json();
        setIssues(issuesPayload.data?.issues || []);
      } else {
        setIssues([]);
      }

      if (revisionsRes.ok) {
        const revisionsPayload = await revisionsRes.json();
        setRevisions(revisionsPayload.data?.revisions || []);
      } else {
        setRevisions([]);
      }

      if (chapterRes.ok) {
        const chapterPayload = await chapterRes.json();
        const chapter = chapterPayload.data?.chapter as Chapter | undefined;

        const storedDetails = chapter?.evaluationDetails;
        const storedSummary = chapter?.evaluationSummary;
        const storedScoreCard = chapter?.evaluationScores;
        const storedHistory = chapter?.evaluationHistory || [];

        if (storedDetails) {
          setEvaluationResults((prev) => ({
            ...prev,
            [chapterId]: hydrateEvaluationDetails(storedDetails),
          }));
        } else if (storedSummary) {
          setEvaluationResults((prev) => ({
            ...prev,
            [chapterId]: hydrateEvaluationResult(storedSummary, storedScoreCard),
          }));
        } else {
          setEvaluationResults((prev) => {
            const next = { ...prev };
            delete next[chapterId];
            return next;
          });
        }

        if (storedScoreCard) {
          setScoreCards((prev) => ({
            ...prev,
            [chapterId]: hydrateScoreCard(storedScoreCard),
          }));
        } else {
          setScoreCards((prev) => {
            const next = { ...prev };
            delete next[chapterId];
            return next;
          });
        }

        setHistories((prev) => ({
          ...prev,
          [chapterId]: [...storedHistory].sort(
            (a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch chapter evaluation state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    if (!selectedChapterId) return;

    setIsEvaluating(true);
    try {
      const res = await fetch(`/api/agents/evaluate/${selectedChapterId}`, { method: 'POST' });
      if (!res.ok) {
        return;
      }

      const payload = await res.json();
      const data = payload.data ?? {};

      if (data.evaluationResult) {
        setEvaluationResults((prev) => ({ ...prev, [selectedChapterId]: data.evaluationResult as EvaluationResult }));
      }

      if (data.evaluationResult?.scores) {
        setScoreCards((prev) => ({
          ...prev,
          [selectedChapterId]: buildScoreCard(data.evaluationResult.scores as EvaluationScoreSummary),
        }));
      } else if (data.evaluationScores) {
        setScoreCards((prev) => ({
          ...prev,
          [selectedChapterId]: hydrateScoreCard(data.evaluationScores as EvaluationScoreData),
        }));
      }

      if (data.evaluationHistoryEntry) {
        setHistories((prev) => ({
          ...prev,
          [selectedChapterId]: [
            data.evaluationHistoryEntry as EvaluationHistoryEntry,
            ...(prev[selectedChapterId] || []).filter(
              (entry) => entry.id !== (data.evaluationHistoryEntry as EvaluationHistoryEntry).id
            ),
          ].slice(0, 20),
        }));
      }

      if (data.issues) {
        setIssues(data.issues);
      } else {
        await fetchChapterState(selectedChapterId);
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
      if (!res.ok) return;
      const payload = await res.json();
      setIssues((prev) => prev.map((issue) => (issue.id === issueId ? payload.data?.issue ?? issue : issue)));
    } catch (error) {
      console.error('Failed to update issue:', error);
    }
  };

  const handleDirectRevision = async (issueId: string) => {
    const issue = issues.find((item) => item.id === issueId);
    if (!issue) return;

    try {
      const res = await fetch(`/api/issues/${issueId}/create-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const payload = await res.json();
        const updatedIssue = payload.data?.issue;
        if (updatedIssue) {
          setIssues((prev) => prev.map((item) => (item.id === issueId ? updatedIssue : item)));
        }
      }
    } catch (error) {
      console.error('Failed to create linked revision:', error);
    }

    openModal(issue.excerpt || '');
  };

  const getRevisionForIssue = (issueId: string) => revisions.find((revision) => revision.linkedIssueId === issueId);

  if (!selectedChapterId) {
    return (
      <div className="flex min-h-full items-center justify-center bg-gray-50">
        <span className="text-gray-500">请选择要查看评估的章节</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-gray-50">
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onClose ? (
              <button onClick={onClose} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                返回
              </button>
            ) : null}
            <h1 className="text-xl font-bold text-gray-900">章节评估</h1>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedChapterId || ''}
              onChange={(event) => setSelectedChapterId(event.target.value || null)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-gray-900/10"
            >
              <option value="">选择章节...</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>

            <button
              onClick={handleRunEvaluation}
              disabled={!selectedChapterId || isEvaluating}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {isEvaluating ? '评估中...' : '重新评估'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">当前章节</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{selectedChapter?.title}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('current')}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'current' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                当前评估
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'history' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                评估历史
              </button>
              {evaluationResult ? (
                <div className={`rounded-full border px-3 py-1.5 text-xs font-medium ${getDecisionColor(evaluationResult.decision)}`}>
                  {getDecisionLabel(evaluationResult.decision)}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {activeTab === 'history' ? (
          <HistoryComparePanel
            entries={historyEntries}
            leftEntry={leftEntry}
            rightEntry={rightEntry}
            leftHistoryId={leftHistoryId}
            rightHistoryId={rightHistoryId}
            onSelectLeft={setLeftHistoryId}
            onSelectRight={setRightHistoryId}
          />
        ) : (
          <>
            {evaluationResult ? (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Gate 检查</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(evaluationResult.gate).map(([key, check]) => (
                    <span
                      key={key}
                      className={`rounded px-3 py-1.5 text-xs font-medium ${
                        check.status === 'pass'
                          ? 'bg-emerald-100 text-emerald-700'
                          : check.status === 'warn'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {getGateLabel(key)}: {check.status}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {scoreCard ? (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <EvaluationScoreCard scoreCard={scoreCard} />
              </div>
            ) : null}

            {evaluationResult && (evaluationResult.strengths.length > 0 || evaluationResult.majorIssues.length > 0) ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SummaryListCard
                  title="本轮亮点"
                  tone="green"
                  items={evaluationResult.strengths}
                  emptyText="本轮未提取亮点"
                />
                <SummaryListCard
                  title="主要问题"
                  tone="red"
                  items={evaluationResult.majorIssues}
                  emptyText="本轮未提取主要问题"
                />
              </div>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="font-semibold text-gray-900">问题清单</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setFilterTag('all')}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        filterTag === 'all'
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      全部
                    </button>
                    {Object.entries(TAG_CATEGORY_META).map(([key, meta]) => (
                      <button
                        key={key}
                        onClick={() => setFilterTag(key)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          filterTag === key
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {meta.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setOpenOnly((value) => !value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        openOnly
                          ? 'border-amber-600 bg-amber-600 text-white'
                          : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      只看未处理
                    </button>
                    <select
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value)}
                      className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 outline-none"
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
                  <div className="flex h-32 items-center justify-center">
                    <span className="text-gray-500">加载中...</span>
                  </div>
                ) : filteredIssues.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-500">{openOnly ? '当前没有未处理问题。' : '暂无问题。'}</p>
                  </div>
                ) : (
                  filteredIssues.map((issue) => {
                    const revision = getRevisionForIssue(issue.id);
                    return (
                      <div key={issue.id} className="p-5 transition-colors hover:bg-gray-50/50">
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_META[issue.severity]?.classes}`}>
                                {SEVERITY_META[issue.severity]?.label || issue.severity}
                              </span>
                              <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                {issue.issueType}
                              </span>
                              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${ISSUE_STATUS_META[issue.status || 'open']?.classes}`}>
                                {ISSUE_STATUS_META[issue.status || 'open']?.label || '待处理'}
                              </span>
                              {revision ? (
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${REVISION_STATUS_META[revision.status]?.classes || 'bg-gray-100 text-gray-600'}`}>
                                  修订: {REVISION_STATUS_META[revision.status]?.label || revision.status}
                                </span>
                              ) : null}
                              {issue.paragraphIndex !== undefined ? (
                                <span className="text-xs text-gray-400">第 {issue.paragraphIndex + 1} 段</span>
                              ) : null}
                            </div>
                            <h4 className="text-base font-semibold text-gray-900">{issue.title}</h4>
                            <p className="text-sm leading-relaxed text-gray-600">{issue.reason}</p>
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {issue.status !== 'fixed' ? (
                              <button
                                onClick={() => handleUpdateStatus(issue.id, 'fixed')}
                                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                              >
                                标记已处理
                              </button>
                            ) : null}
                            <button
                              onClick={() => handleDirectRevision(issue.id)}
                              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                            >
                              {revision?.status === 'reviewed' ? '查看修订' : revision?.status === 'draft' ? '生成修订' : '直接修订'}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-2 text-xs font-semibold uppercase text-gray-400">问题段落</div>
                            <div className="text-sm leading-relaxed text-gray-700">{issue.excerpt || '(无原文摘录)'}</div>
                          </div>
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <div className="mb-2 text-xs font-semibold uppercase text-amber-700">修订建议</div>
                            <div className="mb-2 text-sm leading-relaxed text-gray-700">
                              <span className="font-medium text-gray-900">原因: </span>
                              {issue.reason}
                            </div>
                            {issue.suggestion ? (
                              <div className="text-sm leading-relaxed text-gray-700">
                                <span className="font-medium text-gray-900">建议: </span>
                                {issue.suggestion}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <button
                onClick={() => setTraceExpanded((value) => !value)}
                className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <span>处理痕迹 {handledIssues.length > 0 ? `(${handledIssues.length})` : ''}</span>
                <svg className={`h-4 w-4 transition-transform ${traceExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {traceExpanded ? (
                <div className="max-h-64 overflow-y-auto px-5 pb-4">
                  {handledIssues.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">暂无处理记录</p>
                  ) : (
                    <div className="space-y-3">
                      {handledIssues.map((issue) => (
                        <div key={issue.id} className="rounded-xl border border-emerald-200 bg-white/80 p-4">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                              {issue.status === 'wont_fix' ? '已处理（分支）' : '已处理'}
                            </span>
                            {issue.paragraphIndex !== undefined ? (
                              <span className="text-[11px] text-emerald-700">第 {issue.paragraphIndex + 1} 段</span>
                            ) : null}
                          </div>
                          <div className="text-sm font-semibold text-gray-900">{issue.title}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HistoryComparePanel({
  entries,
  leftEntry,
  rightEntry,
  leftHistoryId,
  rightHistoryId,
  onSelectLeft,
  onSelectRight,
}: {
  entries: EvaluationHistoryEntry[];
  leftEntry: EvaluationHistoryEntry | null;
  rightEntry: EvaluationHistoryEntry | null;
  leftHistoryId: string;
  rightHistoryId: string;
  onSelectLeft: (value: string) => void;
  onSelectRight: (value: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
        这个章节还没有评估历史。先运行一次评估，再回来查看历史对比。
      </div>
    );
  }

  const scoreDelta =
    leftEntry && rightEntry ? (rightEntry.overallScore || 0) - (leftEntry.overallScore || 0) : 0;
  const issueDelta = leftEntry && rightEntry ? rightEntry.issueCount - leftEntry.issueCount : 0;
  const revisionDelta =
    leftEntry && rightEntry ? rightEntry.createdRevisionCount - leftEntry.createdRevisionCount : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-4 lg:flex-nowrap">
          <div className="flex-1">
            <div className="mb-2 text-sm font-semibold text-gray-700">基线评估</div>
            <select
              value={leftHistoryId}
              onChange={(event) => onSelectLeft(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-gray-900/10"
            >
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {formatHistoryLabel(entry)}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm font-medium text-gray-400">对比</div>
          <div className="flex-1">
            <div className="mb-2 text-sm font-semibold text-gray-700">目标评估</div>
            <select
              value={rightHistoryId}
              onChange={(event) => onSelectRight(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-gray-900/10"
            >
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {formatHistoryLabel(entry)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {leftEntry && rightEntry ? (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <HistoryMetaCard title="总分变化" value={formatDelta(scoreDelta)} tone={scoreDelta >= 0 ? 'green' : 'red'} />
            <HistoryMetaCard title="问题数变化" value={formatDelta(issueDelta)} tone={issueDelta <= 0 ? 'green' : 'red'} />
            <HistoryMetaCard
              title="修订建议变化"
              value={formatDelta(revisionDelta)}
              tone={revisionDelta === 0 ? 'neutral' : revisionDelta > 0 ? 'amber' : 'green'}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <HistoryEntryCard entry={leftEntry} />
            <HistoryEntryCard entry={rightEntry} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">8 维原始评分对比</h3>
              <div className="text-xs text-gray-400">右侧减左侧</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 pr-4 font-medium">维度</th>
                    <th className="pb-3 pr-4 font-medium">基线</th>
                    <th className="pb-3 pr-4 font-medium">目标</th>
                    <th className="pb-3 font-medium">变化</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {RAW_SCORE_LABELS.map(({ key, label }) => {
                    const leftValue = leftEntry.details.scores[key];
                    const rightValue = rightEntry.details.scores[key];
                    const delta = rightValue - leftValue;
                    return (
                      <tr key={String(key)}>
                        <td className="py-3 pr-4 text-gray-700">{label}</td>
                        <td className="py-3 pr-4 font-medium text-gray-900">{leftValue}</td>
                        <td className="py-3 pr-4 font-medium text-gray-900">{rightValue}</td>
                        <td className={`py-3 font-medium ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {formatDelta(delta)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <HistoryListCompareCard title="亮点变化" leftItems={leftEntry.summary.strengths} rightItems={rightEntry.summary.strengths} />
            <HistoryListCompareCard title="主要问题变化" leftItems={leftEntry.summary.majorIssues} rightItems={rightEntry.summary.majorIssues} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <HistoryRevisionCompareCard title="必须修" leftItems={leftEntry.details.revision.must_fix.map((item) => item.text)} rightItems={rightEntry.details.revision.must_fix.map((item) => item.text)} />
            <HistoryRevisionCompareCard title="建议优化" leftItems={leftEntry.details.revision.should_improve.map((item) => item.text)} rightItems={rightEntry.details.revision.should_improve.map((item) => item.text)} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function HistoryEntryCard({ entry }: { entry: EvaluationHistoryEntry }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{formatHistoryLabel(entry)}</div>
          <div className="mt-1 text-xs text-gray-400">
            问题 {entry.issueCount} 个 · 修订建议 {entry.createdRevisionCount} 个
          </div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${getDecisionColor(entry.decision)}`}>
          {getDecisionLabel(entry.decision)}
        </div>
      </div>

      <EvaluationScoreCard scoreCard={hydrateScoreCard(entry.scoreCard)} />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SummaryListCard title="亮点" tone="green" items={entry.summary.strengths} emptyText="未记录亮点" />
        <SummaryListCard title="主要问题" tone="red" items={entry.summary.majorIssues} emptyText="未记录主要问题" />
      </div>
    </div>
  );
}

function HistoryListCompareCard({
  title,
  leftItems,
  rightItems,
}: {
  title: string;
  leftItems: string[];
  rightItems: string[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-base font-semibold text-gray-900">{title}</h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ComparisonList title="基线评估" items={leftItems} emptyText="无" tone="gray" />
        <ComparisonList title="目标评估" items={rightItems} emptyText="无" tone="blue" />
      </div>
    </div>
  );
}

function HistoryRevisionCompareCard({
  title,
  leftItems,
  rightItems,
}: {
  title: string;
  leftItems: string[];
  rightItems: string[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <div className="text-xs text-gray-400">
          {leftItems.length} → {rightItems.length}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ComparisonList title="基线评估" items={leftItems} emptyText="无" tone="amber" />
        <ComparisonList title="目标评估" items={rightItems} emptyText="无" tone="green" />
      </div>
    </div>
  );
}

function SummaryListCard({
  title,
  items,
  emptyText,
  tone,
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone: 'green' | 'red';
}) {
  const styles =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-gray-900">{title}</div>
      {items.length === 0 ? (
        <div className="text-sm text-gray-400">{emptyText}</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span key={`${title}-${index}`} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${styles}`}>
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ComparisonList({
  title,
  items,
  emptyText,
  tone,
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone: 'gray' | 'blue' | 'amber' | 'green';
}) {
  const toneClassMap: Record<string, string> = {
    gray: 'border-gray-200 bg-gray-50 text-gray-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };

  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-gray-700">{title}</div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-400">{emptyText}</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${title}-${index}`} className={`rounded-xl border px-3 py-2 text-sm ${toneClassMap[tone]}`}>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryMetaCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: 'green' | 'red' | 'amber' | 'neutral';
}) {
  const classNameMap: Record<string, string> = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    neutral: 'border-gray-200 bg-gray-50 text-gray-700',
  };

  return (
    <div className={`rounded-xl border p-4 ${classNameMap[tone]}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function hydrateScoreCard(stored: EvaluationScoreData): ScoreCardType {
  return {
    overall: stored.overall,
    overallGrade: stored.overallGrade,
    percentile: stored.percentile,
    dimensions: {
      readability: buildDimension('readability', '可读性', stored.dimensions.readability, 0.1, '句子结构、表达清晰度'),
      rhythm: buildDimension('rhythm', '节奏健康', stored.dimensions.rhythm, 0.15, '段落长短交替、冲突密度'),
      characterConsistency: buildDimension('characterConsistency', '人物一致', stored.dimensions.characterConsistency, 0.25, '对话风格、行为逻辑一致'),
      plotCompleteness: buildDimension('plotCompleteness', '剧情完整', stored.dimensions.plotCompleteness, 0.3, '章节目标完成度、伏笔埋设'),
      foreshadowRecovery: buildDimension('foreshadowRecovery', '伏笔回收', stored.dimensions.foreshadowRecovery || 0, 0.1, '已回收伏笔占比'),
      aiSmell: {
        name: 'aiSmell',
        label: '模板化',
        score: stored.dimensions.aiSmell,
        maxScore: 100,
        weight: 0.1,
        color: stored.dimensions.aiSmell <= 15 ? 'green' : stored.dimensions.aiSmell <= 35 ? 'yellow' : 'red',
        description: 'AI 模板化句式浓度，越低越好',
      },
    },
  };
}

function hydrateEvaluationResult(
  summary: EvaluationSummaryData,
  storedScores?: {
    overall?: number;
  }
): EvaluationResult {
  return {
    gate: summary.gate,
    scores: {
      chapter_goal_completion: 0,
      plot_progress_and_causality: 0,
      conflict_and_tension: 0,
      character_and_voice: 0,
      language_and_style: 0,
      continuity_and_consistency: 0,
      information_and_pacing: 0,
      ending_hook: 0,
      total: storedScores?.overall ?? 0,
    },
    issueTags: summary.issueTags as IssueTag[],
    strengths: summary.strengths,
    majorIssues: summary.majorIssues,
    revision: {
      must_fix: [],
      should_improve: [],
      optional_enhancements: [],
    },
    decision: summary.decision,
  };
}

function hydrateEvaluationDetails(details: EvaluationDetailsData): EvaluationResult {
  return {
    gate: details.gate,
    scores: details.scores,
    issueTags: details.issueTags as IssueTag[],
    strengths: details.strengths,
    majorIssues: details.majorIssues,
    revision: {
      must_fix: details.revision.must_fix.map((item) => item.text),
      should_improve: details.revision.should_improve.map((item) => item.text),
      optional_enhancements: details.revision.optional_enhancements.map((item) => item.text),
    },
    decision: details.decision,
  };
}

function buildDimension(
  name: string,
  label: string,
  score: number,
  weight: number,
  description: string
): ScoreCardType['dimensions']['readability'] {
  return {
    name,
    label,
    score,
    maxScore: 100,
    weight,
    color: score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red',
    description,
  };
}

function getDecisionLabel(decision: string): string {
  const labels: Record<string, string> = {
    pass: '通过',
    pass_with_notes: '通过，建议优化',
    partial_rewrite: '局部重写',
    full_rewrite: '整章重写',
    human_review: '转人工审阅',
    gate_fail: 'Gate 未通过',
  };
  return labels[decision] || decision;
}

function getDecisionColor(decision: string): string {
  const colors: Record<string, string> = {
    pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pass_with_notes: 'bg-blue-50 text-blue-700 border-blue-200',
    partial_rewrite: 'bg-amber-50 text-amber-700 border-amber-200',
    full_rewrite: 'bg-orange-50 text-orange-700 border-orange-200',
    human_review: 'bg-red-50 text-red-700 border-red-200',
    gate_fail: 'bg-red-50 text-red-700 border-red-200',
  };
  return colors[decision] || 'bg-gray-50 text-gray-700 border-gray-200';
}

function getGateLabel(key: string): string {
  const labels: Record<string, string> = {
    text_completeness: '文本完整',
    readability_format: '格式可读',
    continuity_hard_conflict: '设定一致',
    chapter_goal_alignment: '目标对齐',
    ai_template_smell: 'AI 模板化',
  };
  return labels[key] || key;
}

function formatHistoryLabel(entry: EvaluationHistoryEntry): string {
  return `${formatDateTime(entry.evaluatedAt)} · ${entry.overallScore} 分`;
}

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '0';
}

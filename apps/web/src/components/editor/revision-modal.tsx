'use client';

import { useState, useEffect } from 'react';
import { useRevisionStore } from '@/lib/state/revision-store';
import { useEditorStore } from '@/lib/state/editor-store';

const SUGGESTION_CHIPS = ['增强画面感', '对话更克制', '节奏更紧张', '补充心理描写'];
const GOAL_CHIPS = ['压缩冗余', '强化节奏', '增强人物张力', '提升古风感', '加强环境描写'];
const CONSTRAINT_CHIPS = ['不改情节', '不改人物关系', '保留关键台词', '保持叙事视角'];
const MODE_OPTIONS = ['replace', 'append', 'branch'] as const;

interface ParagraphChoice {
  original: string;
  candidate: string;
  choice: 'original' | 'candidate';
  reason: string;
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

function tokenizeForDiff(text: string): string[] {
  return (text || '').split(/(\s+|[，。！？；：、""''（）《》〈〉,.!?;:\n])/).filter((token) => token !== '');
}

function computeDiffSequence(a: string[], b: string[]): Array<{ type: 'same' | 'remove' | 'add'; a: string; b: string }> {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  let i = 0, j = 0;
  const ops = [];
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      ops.push({ type: 'same' as const, a: a[i], b: b[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'remove' as const, a: a[i], b: '' });
      i++;
    } else {
      ops.push({ type: 'add' as const, a: '', b: b[j] });
      j++;
    }
  }
  while (i < m) { ops.push({ type: 'remove' as const, a: a[i], b: '' }); i++; }
  while (j < n) { ops.push({ type: 'add' as const, a: '', b: b[j] }); j++; }
  return ops;
}

function escapeHtml(str: string): string {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildWordDiffHtml(original: string, candidate: string): { originalHtml: string; candidateHtml: string } {
  const a = tokenizeForDiff(original);
  const b = tokenizeForDiff(candidate);
  const ops = computeDiffSequence(a, b);
  let originalHtml = '';
  let candidateHtml = '';
  for (const op of ops) {
    if (op.type === 'same') {
      const token = escapeHtml(op.a);
      originalHtml += token + ' ';
      candidateHtml += token + ' ';
    } else if (op.type === 'remove') {
      originalHtml += `<span class="diff-inline-removed">${escapeHtml(op.a)}</span> `;
    } else {
      candidateHtml += `<span class="diff-inline-added">${escapeHtml(op.b)}</span> `;
    }
  }
  return {
    originalHtml: originalHtml.trim() || '<span class="text-gray-400">（空）</span>',
    candidateHtml: candidateHtml.trim() || '<span class="text-gray-400">（空）</span>',
  };
}

function buildRevisionReason(originalParagraph: string, candidateParagraph: string): string {
  const originalLen = (originalParagraph || '').length;
  const candidateLen = (candidateParagraph || '').length;
  if (candidateLen < originalLen - 12) {
    return '压缩了重复表达，让段落更紧凑';
  } else if (candidateLen > originalLen + 12) {
    return '补充了细节与镜头信息';
  }
  return '主要做了措辞和节奏微调';
}

export function RevisionModal() {
  const {
    selectedText,
    targetScope,
    currentRevision,
    suggestions,
    suggestionText,
    goals,
    constraints,
    applyMode,
    setSuggestions,
    setSuggestionText,
    setGoals,
    setConstraints,
    setApplyMode,
    closeModal,
    reset,
  } = useRevisionStore();

  const { currentChapter, project } = useEditorStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [candidateText, setCandidateText] = useState('');
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paragraphChoices, setParagraphChoices] = useState<ParagraphChoice[]>([]);
  const [versionSummary, setVersionSummary] = useState('');
  const [goalText, setGoalText] = useState('');
  const [constraintText, setConstraintText] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  // When candidate text changes, rebuild paragraph choices
  useEffect(() => {
    if (candidateText && selectedText) {
      const originalParagraphs = splitParagraphs(selectedText);
      const candidateParagraphs = splitParagraphs(candidateText);
      const count = Math.max(originalParagraphs.length, candidateParagraphs.length);
      const newChoices: ParagraphChoice[] = [];
      for (let i = 0; i < count; i++) {
        newChoices.push({
          original: originalParagraphs[i] || '',
          candidate: candidateParagraphs[i] || '',
          choice: 'candidate',
          reason: buildRevisionReason(originalParagraphs[i] || '', candidateParagraphs[i] || ''),
        });
      }
      setParagraphChoices(newChoices);
    }
  }, [candidateText, selectedText]);

  const handleFillSuggestionByAI = async () => {
    if (!selectedText) return;
    setIsSuggesting(true);
    try {
      const response = await fetch('/api/agents/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project?.id,
          text: selectedText,
          suggestions,
          goals,
          constraints,
          applyMode,
        }),
      });
      if (response.ok) {
        const payload = await response.json();
        const data = payload.data ?? {};
        if (data.suggestion) {
          setSuggestionText(data.suggestion);
        }
        if (data.goals && Array.isArray(data.goals)) {
          setGoals([...goals, ...data.goals.filter((g: string) => !goals.includes(g))]);
        }
        if (data.constraints && Array.isArray(data.constraints)) {
          setConstraints([...constraints, ...data.constraints.filter((c: string) => !constraints.includes(c))]);
        }
        if (data.versionSummary) {
          setVersionSummary(data.versionSummary);
        }
      }
    } catch (err) {
      console.error('Failed to generate suggestion:', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleGenerate = async () => {
    if (!currentChapter || !selectedText) return;

    setIsGenerating(true);
    setError(null);

    try {
      let revision = currentRevision;

      if (!revision) {
      const createRes = await fetch('/api/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project?.id,
          chapterId: currentChapter.id,
          targetScope,
          originalText: selectedText,
          suggestion: [...suggestions, suggestionText].filter(Boolean).join('；'),
          goals: [...goals, goalText].filter(Boolean),
          constraints: [...constraints, constraintText].filter(Boolean),
          applyMode,
          createdBy: 'user',
        }),
      });

      if (!createRes.ok) {
        throw new Error('创建修订任务失败');
      }

      const createPayload = await createRes.json();
      revision = createPayload.data?.revision;
      }

      if (!revision) {
        throw new Error('淇浠诲姟杩斿洖鏃犳晥');
      }

      const runRes = await fetch(`/api/revisions/${revision.id}/run`, {
        method: 'POST',
      });

      if (!runRes.ok) {
        throw new Error('运行修订失败');
      }

      const runPayload = await runRes.json();
      const candidate = runPayload.data?.candidate;

      if (!candidate) {
        throw new Error('淇鍊欓€夌杩斿洖鏃犳晥');
      }
      setCandidateText(candidate.candidateText);
      setCandidateId(candidate.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyParagraphChoice = (index: number, choice: 'original' | 'candidate') => {
    setParagraphChoices((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], choice };
      return updated;
    });
  };

  const handleAcceptAllOriginal = () => {
    setParagraphChoices((prev) => prev.map((p) => ({ ...p, choice: 'original' as const })));
  };

  const handleAcceptAllCandidate = () => {
    setParagraphChoices((prev) => prev.map((p) => ({ ...p, choice: 'candidate' as const })));
  };

  const handleCopyRevision = () => {
    const textToCopy = paragraphChoices.length > 0
      ? paragraphChoices.map((p) => p.choice === 'candidate' ? p.candidate : p.original).join('\n\n')
      : candidateText;
    navigator.clipboard.writeText(textToCopy);
  };

  const getAcceptedText = (): string => {
    if (paragraphChoices.length === 0) {
      return candidateText;
    }
    return paragraphChoices
      .map((p) => (p.choice === 'original' ? p.original : p.candidate))
      .filter(Boolean)
      .join('\n\n')
      .trim();
  };

  const handleApply = async () => {
    if (!candidateId) return;

    setIsApplying(true);
    setError(null);

    try {
      const res = await fetch(`/api/revision-candidates/${candidateId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: applyMode }),
      });

      if (!res.ok) {
        throw new Error('应用修订失败');
      }

      closeModal();
      reset();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '应用失败');
    } finally {
      setIsApplying(false);
    }
  };

  const getModeLabel = (mode: string) => {
    if (mode === 'replace') return '替换原文';
    if (mode === 'append') return '追加到文末';
    return '只存为分支';
  };

  const getScopeLabel = () => {
    if (targetScope === 'chapter') return '整章修订';
    return '选中内容修订';
  };

  const hasRevisionContent = paragraphChoices.length > 0 || candidateText;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">正文修订</h3>
            <p className="text-sm text-gray-500 mt-1">先定义修订目标，再生成候选稿，并逐段审阅、采纳。</p>
          </div>
          <button onClick={closeModal} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)_minmax(0,1fr)] min-h-[560px]">
            {/* Left column: Revision task */}
            <div className="p-6 bg-gray-50 border-r border-gray-200 overflow-y-auto space-y-4">
              <div className="info-card-soft">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">修订任务</div>
                <div className="space-y-4">
                  {/* 修改建议 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">修改建议</label>
                      <button
                        onClick={handleFillSuggestionByAI}
                        disabled={!selectedText || isSuggesting}
                        className="px-3 py-2 text-xs font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                      >
                        {isSuggesting ? '生成中...' : 'AI 生成建议'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {SUGGESTION_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => setSuggestions(suggestions.includes(chip) ? suggestions.filter((s) => s !== chip) : [...suggestions, chip])}
                          className={`suggestion-chip ${suggestions.includes(chip) ? 'active' : ''}`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={suggestionText}
                      onChange={(e) => setSuggestionText(e.target.value)}
                      rows={3}
                      placeholder="输入本次修订的自由建议，例如：保留原意，压缩重复句，增强环境压迫感..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all resize-none text-sm"
                    />
                  </div>

                  {/* 修订目标 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">修订目标</label>
                    <div className="flex flex-wrap gap-2">
                      {GOAL_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => setGoals(goals.includes(chip) ? goals.filter((g) => g !== chip) : [...goals, chip])}
                          className={`suggestion-chip ${goals.includes(chip) ? 'active' : ''}`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={goalText}
                      onChange={(e) => setGoalText(e.target.value)}
                      rows={2}
                      placeholder="本次修订的目标会汇总在这里，可继续补充。"
                      className="mt-3 w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all resize-none text-sm"
                    />
                  </div>

                  {/* 保持不变 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">保持不变</label>
                    <div className="flex flex-wrap gap-2">
                      {CONSTRAINT_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => setConstraints(constraints.includes(chip) ? constraints.filter((c) => c !== chip) : [...constraints, chip])}
                          className={`suggestion-chip ${constraints.includes(chip) ? 'active' : ''}`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={constraintText}
                      onChange={(e) => setConstraintText(e.target.value)}
                      rows={2}
                      placeholder="输入本次修订的约束，例如：不要改剧情结论，只润色表达。"
                      className="mt-3 w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all resize-none text-sm"
                    />
                  </div>

                  {/* 应用方式 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">应用方式</label>
                    <div className="flex flex-wrap gap-2">
                      {MODE_OPTIONS.map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setApplyMode(mode)}
                          className={`segment-pill ${applyMode === mode ? 'active' : ''}`}
                        >
                          {getModeLabel(mode)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 版本摘要 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">版本摘要</label>
                    <input
                      type="text"
                      value={versionSummary}
                      onChange={(e) => setVersionSummary(e.target.value)}
                      placeholder="例如：压缩首段铺垫，增强张小敬警觉感"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Middle column: Original text */}
            <div className="p-6 bg-gray-50 border-r border-gray-200 overflow-y-auto">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">原文</div>
                  <div className="text-xs text-gray-500 mt-1">AI 智能优化</div>
                </div>
                <div className="mini-meta-chip">{getScopeLabel()}</div>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap editor-font bg-white border border-gray-200 rounded-2xl p-5 min-h-[360px] overflow-y-auto">
                {selectedText || '请先在正文中选中要修订的内容'}
              </div>
            </div>

            {/* Right column: Candidate + Review */}
            <div className="p-6 bg-white overflow-y-auto space-y-4">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">修订候选稿</div>
                  <div className="text-xs text-gray-500 mt-1">点击"AI 重新生成"后出现，可继续手动编辑</div>
                </div>
                <div className={`mini-meta-chip ${hasRevisionContent ? 'bg-emerald-100 text-emerald-700' : ''}`}>
                  {hasRevisionContent ? '已生成' : '未生成'}
                </div>
              </div>
              <textarea
                value={candidateText}
                onChange={(e) => setCandidateText(e.target.value)}
                rows={14}
                placeholder={isGenerating ? 'AI 正在生成中...' : '点击"AI 重新生成"后，这里会出现修订内容；你也可以继续手动修改。'}
                className="w-full min-h-[320px] px-4 py-4 rounded-2xl border border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 outline-none transition-all resize-none text-sm text-gray-900 leading-relaxed editor-font bg-white"
                disabled={isGenerating}
              />

              {/* Review area */}
              <div className="diff-panel p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">审稿区</div>
                    <div className="text-xs text-gray-500 mt-1">查看候选稿与原文差异、修改理由，并逐段采纳。</div>
                  </div>
                  {hasRevisionContent && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={handleAcceptAllCandidate} className="px-3 py-2 text-xs font-medium rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                        全部采纳候选稿
                      </button>
                      <button onClick={handleAcceptAllOriginal} className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-white transition-colors">
                        全部保留原文
                      </button>
                    </div>
                  )}
                </div>

                {!hasRevisionContent ? (
                  <div className="text-sm text-gray-500 bg-white border border-dashed border-gray-300 rounded-2xl p-6">
                    候选稿生成后，这里会按段展示：原文 vs 候选稿差异高亮、修改理由，以及逐段采纳按钮。
                  </div>
                ) : (
                  <div id="revision-review-list" className="space-y-4">
                    {paragraphChoices.map((pc, idx) => {
                      const diff = buildWordDiffHtml(pc.original, pc.candidate);
                      return (
                        <div key={idx} className={`review-card ${pc.choice === 'candidate' ? 'accepted-candidate' : 'accepted-original'}`}>
                          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap bg-gray-50">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">第 {idx + 1} 段</span>
                              <span className={`review-badge ${pc.choice === 'candidate' ? 'candidate' : 'original'}`}>
                                {pc.choice === 'candidate' ? '当前采用候选稿' : '当前保留原文'}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApplyParagraphChoice(idx, 'original')}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-white transition-colors"
                              >
                                保留原文
                              </button>
                              <button
                                onClick={() => handleApplyParagraphChoice(idx, 'candidate')}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                              >
                                采纳候选稿
                              </button>
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="reason-tag text-xs">修改理由：{pc.reason}</div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                                <div className="text-xs font-semibold text-gray-400 uppercase mb-2">原文</div>
                                <div className="text-sm text-gray-700 leading-relaxed editor-font">
                                  <span dangerouslySetInnerHTML={{ __html: diff.originalHtml }} />
                                </div>
                              </div>
                              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3">
                                <div className="text-xs font-semibold text-emerald-700 uppercase mb-2">候选稿</div>
                                <div className="text-sm text-gray-800 leading-relaxed editor-font">
                                  <span dangerouslySetInnerHTML={{ __html: diff.candidateHtml }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-xs text-gray-500">生成逻辑：原文 + 修改建议 + 修订目标 + 保持不变约束；保存时优先采用逐段采纳结果。</div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleCopyRevision}
              disabled={!hasRevisionContent}
              className="px-4 py-2 text-gray-700 font-medium hover:bg-white rounded-lg transition-colors flex items-center gap-2 border border-gray-300 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制候选稿
            </button>
            <button
              onClick={handleGenerate}
              disabled={!selectedText || isGenerating}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isGenerating ? '生成中...' : 'AI 重新生成'}
            </button>
            <button
              onClick={handleApply}
              disabled={!candidateText || isApplying}
              className="px-6 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {isApplying ? '应用中...' : '应用修订'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

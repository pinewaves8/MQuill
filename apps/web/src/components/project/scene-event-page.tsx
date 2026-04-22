'use client';

import { useState, useEffect } from 'react';
import { Chapter, ChapterOutline, BookOutline } from '@packages/shared-types';
import type {
  SceneEventCard,
  SceneEventComposerSkillOutput,
  NarrativeFunction,
} from '@/lib/skills/skill-interface';

interface SceneEventPageProps {
  projectId: string;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  onSelectChapter: (chapter: Chapter) => void;
  onGenerateDraft: (chapterId: string, sceneEventCard: SceneEventCard) => void;
  onBackToChapter: () => void;
}

export function SceneEventPage({
  projectId,
  chapters,
  currentChapter,
  onSelectChapter,
  onGenerateDraft,
  onBackToChapter,
}: SceneEventPageProps) {
  const [sceneEventCards, setSceneEventCards] = useState<SceneEventCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<SceneEventCard | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<'conservative' | 'dramatic' | 'literary' | 'anti-cliché'>('conservative');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [generationReasoning, setGenerationReasoning] = useState('');
  const [bookOutline, setBookOutline] = useState<BookOutline | null>(null);
  const [currentChapterOutline, setCurrentChapterOutline] = useState<ChapterOutline | null>(null);

  // Fetch outline when projectId changes
  useEffect(() => {
    if (!projectId) return;

    const fetchOutline = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/outline`);
        const payload = await res.json();
        if (payload.data?.outline) {
          setBookOutline(payload.data.outline);
        }
      } catch (error) {
        console.error('Failed to fetch outline:', error);
      }
    };

    fetchOutline();
  }, [projectId]);

  // Match chapter outline when currentChapter changes
  useEffect(() => {
    if (!currentChapter || !bookOutline) {
      setCurrentChapterOutline(null);
      return;
    }

    let matched: ChapterOutline | null = null;
    for (const volume of bookOutline.volumes || []) {
      matched = volume.chapters.find(c => c.title === currentChapter.title) || null;
      if (matched) break;
    }
    setCurrentChapterOutline(matched);
  }, [currentChapter, bookOutline]);

  const handleGenerateSceneEvents = async () => {
    if (!currentChapter) return;

    setIsGenerating(true);
    try {
      // Build skill input from chapter outline
      const chapterGoal = currentChapterOutline?.chapterGoal || currentChapter.title || '章节目标';
      const sceneGoal = currentChapterOutline?.mainEvents || '完成本章核心叙事';

      const res = await fetch('/api/skills/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId: 'scene-event-composer-skill',
          input: {
            projectId,
            chapter_goal: chapterGoal,
            scene_goal: sceneGoal,
            required_functions: ['introduce_character', 'escalate_conflict', 'build_climax'] as NarrativeFunction[],
            character_states: {},
            tone_style: 'neutral',
            intensity_target: 5,
            candidate_count: 3,
            // 额外传入大纲信息供参考
            mainEvents: currentChapterOutline?.mainEvents,
            characterProgress: currentChapterOutline?.characterProgress,
            hook: currentChapterOutline?.hook,
          },
        }),
      });

      const payload = await res.json();
      if (payload.data?.deliverable) {
        const output = payload.data.deliverable as SceneEventComposerSkillOutput['deliverable'];
        setSceneEventCards(output.candidates);
        setSelectedVariant(output.selected_variant);
        setGenerationReasoning(output.combination_reasoning);
        if (output.candidates.length > 0) {
          setSelectedCard(output.candidates[0]);
        }
      } else {
        console.error('Failed to generate scene events:', payload.error);
      }
    } catch (error) {
      console.error('Error generating scene events:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!currentChapter || !selectedCard) return;

    setIsGeneratingDraft(true);
    try {
      onGenerateDraft(currentChapter.id, selectedCard);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handlePolishCard = async (polishGoal: 'reduce_cliché' | 'enhance_originality' | 'adjust_tone' | 'strengthen_hook' | 'improve_pacing') => {
    if (!selectedCard) return;

    try {
      const res = await fetch('/api/skills/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId: 'scene-event-polish-skill',
          input: {
            projectId,
            scene_event_card: selectedCard,
            polish_goals: [{ goal: polishGoal, priority: 'high' }],
          },
        }),
      });

      const payload = await res.json();
      if (payload.data?.deliverable) {
        const output = payload.data.deliverable as { polished_card: SceneEventCard };
        setSelectedCard(output.polished_card);
        setSceneEventCards(cards =>
          cards.map(c => c.id === output.polished_card.id ? output.polished_card : c)
        );
      }
    } catch (error) {
      console.error('Error polishing card:', error);
    }
  };

  const variantLabels: Record<string, string> = {
    conservative: '保守',
    dramatic: '戏剧',
    literary: '文学',
    'anti-cliché': '反套路',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">场景事件生成</h2>
          <button
            onClick={onBackToChapter}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            返回章节
          </button>
        </div>

        {/* Chapter selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">选择章节：</label>
          <select
            value={currentChapter?.id || ''}
            onChange={(e) => {
              const chapter = chapters.find(c => c.id === e.target.value);
              if (chapter) onSelectChapter(chapter);
            }}
            className="flex-1 max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <option value="">请选择章节</option>
            {chapters.map((chapter, index) => (
              <option key={chapter.id} value={chapter.id}>
                第{index + 1}章 - {chapter.title || '未命名章节'}
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerateSceneEvents}
            disabled={!currentChapter || isGenerating}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                生成中...
              </>
            ) : (
              '生成场景事件'
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel - Scene event card list */}
        <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-3 border-b border-gray-200 bg-white">
            <h3 className="text-sm font-medium text-gray-700">候选方案</h3>
            <p className="text-xs text-gray-400 mt-1">{sceneEventCards.length} 个方案</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {sceneEventCards.map((card, index) => (
              <div
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedCard?.id === card.id
                    ? 'border-gray-900 bg-white shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-600">
                    {card.title.split('：')[0]}
                  </span>
                  <span className="text-xs text-gray-400">张力 {card.tension_level}/10</span>
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{card.title}</h4>
                <p className="text-xs text-gray-500 line-clamp-2">{card.objective}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">
                    {card.narrative_function.slice(0, 2).join(', ')}
                  </span>
                </div>
              </div>
            ))}

            {sceneEventCards.length === 0 && !isGenerating && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm text-gray-500">请选择章节并点击生成</p>
                <p className="text-xs text-gray-400 mt-1">系统将为您生成多个场景事件候选方案</p>
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Detail view */}
        <div className="flex-1 overflow-y-auto bg-white">
          {selectedCard ? (
            <div className="p-6">
              {/* Card header */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{selectedCard.title}</h3>
                  <span className="text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {variantLabels[selectedVariant] || selectedVariant}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">{selectedCard.objective}</p>

                {/* Narrative functions */}
                <div className="flex flex-wrap gap-2">
                  {selectedCard.narrative_function.map(fn => (
                    <span key={fn} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                      {fn}
                    </span>
                  ))}
                </div>
              </div>

              {/* Generation reasoning */}
              {generationReasoning && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">生成逻辑</h4>
                  <p className="text-sm text-gray-600">{generationReasoning}</p>
                </div>
              )}

              {/* Location */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  场景
                </h4>
                <div className="pl-6 space-y-1 text-sm text-gray-600">
                  <p><span className="text-gray-400">类型：</span>{selectedCard.location.type}</p>
                  <p><span className="text-gray-400">氛围：</span>{selectedCard.location.atmosphere}</p>
                  <p><span className="text-gray-400">时间：</span>{selectedCard.location.time}</p>
                  {selectedCard.location.weather && (
                    <p><span className="text-gray-400">天气：</span>{selectedCard.location.weather}</p>
                  )}
                  <p><span className="text-gray-400">感官：</span>{selectedCard.location.sensory_details.join(', ')}</p>
                </div>
              </div>

              {/* Characters */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  角色 ({selectedCard.participating_characters.length})
                </h4>
                <div className="pl-6 space-y-2">
                  {selectedCard.participating_characters.map((char, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        char.role === 'protagonist' ? 'bg-blue-100 text-blue-600' :
                        char.role === 'antagonist' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {char.role}
                      </span>
                      <span className="text-gray-900">{char.character_id}</span>
                      <span className="text-gray-400">({char.emotional_state})</span>
                      {char.viewpoint && <span className="text-xs text-blue-500">视角</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Conflicts */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">冲突</h4>
                <div className="pl-6 space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">外部冲突：</span>
                    <span className="text-gray-700">{selectedCard.external_conflict}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">内部冲突：</span>
                    <span className="text-gray-700">{selectedCard.internal_conflict}</span>
                  </div>
                </div>
              </div>

              {/* Event progression */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">事件发展</h4>
                <div className="space-y-2">
                  {selectedCard.event_progression.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <span className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-500 text-xs rounded-full shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-gray-700">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Information */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">信息揭示</h4>
                <div className="pl-6 space-y-2">
                  <div>
                    <span className="text-gray-400">揭露：</span>
                    <span className="text-gray-700">{selectedCard.information_revealed.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">隐藏：</span>
                    <span className="text-gray-700">{selectedCard.information_hidden.join(', ')}</span>
                  </div>
                </div>
              </div>

              {/* Emotional arc */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">情感曲线</h4>
                <div className="flex items-center gap-2">
                  {selectedCard.emotional_arc.map((emotion, idx) => (
                    <div key={idx} className="flex items-center">
                      <span className="text-sm text-gray-600">{emotion}</span>
                      {idx < selectedCard.emotional_arc.length - 1 && (
                        <svg className="w-4 h-4 text-gray-300 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Ending hook */}
              <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-100">
                <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  结尾钩子
                </h4>
                <p className="text-sm text-amber-700">{selectedCard.ending_hook}</p>
              </div>

              {/* Pacing and tension */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">节奏与张力</h4>
                <div className="pl-6 space-y-2 text-sm">
                  <p><span className="text-gray-400">节奏笔记：</span>{selectedCard.pacing_notes}</p>
                  <p><span className="text-gray-400">张力等级：</span>{selectedCard.tension_level}/10</p>
                </div>
              </div>

              {/* Originality */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">原创性评估</h4>
                <div className="pl-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">套路风险：</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                        <div
                          key={level}
                          className={`w-3 h-3 rounded-sm ${
                            level <= selectedCard.cliché_risk_assessment
                              ? 'bg-red-400'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">{selectedCard.cliché_risk_assessment}/10</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCard.originality_elements.map((el, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded">
                        {el}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Polish buttons */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">优化操作</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handlePolishCard('reduce_cliché')}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    降低套路
                  </button>
                  <button
                    onClick={() => handlePolishCard('enhance_originality')}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    增强原创
                  </button>
                  <button
                    onClick={() => handlePolishCard('strengthen_hook')}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    强化钩子
                  </button>
                  <button
                    onClick={() => handlePolishCard('improve_pacing')}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    优化节奏
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500">请从左侧选择一个场景事件方案</p>
                <p className="text-sm text-gray-400 mt-1">或生成新的场景事件</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {selectedCard ? (
              <>已选择方案 | {selectedCard.title}</>
            ) : (
              <>请先生成场景事件</>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateSceneEvents}
              disabled={!currentChapter || isGenerating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              重新生成
            </button>
            <button
              onClick={handleGenerateDraft}
              disabled={!currentChapter || !selectedCard || isGeneratingDraft}
              className="px-6 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGeneratingDraft ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  生成正文中...
                </>
              ) : (
                '生成正文'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

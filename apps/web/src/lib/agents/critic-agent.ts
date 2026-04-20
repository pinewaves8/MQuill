import {
  EvaluationResult,
  EvaluationScoreSummary,
} from '@packages/shared-types';
import { callLLM, LLMMessage, parseJSONResponse } from '@/lib/llm';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';

export interface EvaluateInput {
  projectId: string;
  chapterId: string;
  chapterTitle: string;
  content: string;
  chapterGoal?: string;
  keyEvents?: string[];
  mainCharacters?: string[];
  volumeGoal?: string;
  previousSummaries?: string[];
}

export async function criticAgent(input: EvaluateInput): Promise<EvaluationResult> {
  const grounding = await buildGroundingPack(input.projectId);
  const messages: LLMMessage[] = [
    { role: 'system', content: buildCriticSystemPrompt(grounding) },
    { role: 'user', content: buildCriticUserPrompt(input) },
  ];

  const response = await callLLM(messages, {
    temperature: 0.2,
    maxTokens: 4096,
  });

  const result = parseJSONResponse<EvaluationResult>(response);
  result.scores = normalizeScores(result.scores);
  result.scores.total = calculateTotalScore(result.scores);

  return result;
}

function normalizeScores(scores: EvaluationScoreSummary): EvaluationScoreSummary {
  return {
    ...scores,
    chapter_goal_completion: clampScore(scores.chapter_goal_completion, 15),
    plot_progress_and_causality: clampScore(scores.plot_progress_and_causality, 15),
    conflict_and_tension: clampScore(scores.conflict_and_tension, 15),
    character_and_voice: clampScore(scores.character_and_voice, 15),
    language_and_style: clampScore(scores.language_and_style, 10),
    continuity_and_consistency: clampScore(scores.continuity_and_consistency, 10),
    information_and_pacing: clampScore(scores.information_and_pacing, 10),
    ending_hook: clampScore(scores.ending_hook, 10),
    ai_smell_severity: normalizeAiSeverity(scores.ai_smell_severity),
    total: 0,
  };
}

function clampScore(value: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(max, Math.round(value)));
}

function normalizeAiSeverity(severity?: 'low' | 'medium' | 'high'): 'low' | 'medium' | 'high' {
  if (severity === 'low' || severity === 'high') {
    return severity;
  }

  return 'medium';
}

function calculateTotalScore(scores: Omit<EvaluationScoreSummary, 'total'>): number {
  return (
    scores.chapter_goal_completion +
    scores.plot_progress_and_causality +
    scores.conflict_and_tension +
    scores.character_and_voice +
    scores.language_and_style +
    scores.continuity_and_consistency +
    scores.information_and_pacing +
    scores.ending_hook
  );
}

function buildCriticSystemPrompt(
  grounding: Awaited<ReturnType<typeof buildGroundingPack>>
): string {
  const sections: string[] = [];

  sections.push(
    [
      '你是 Quill 小说评估 Agent。',
      '你的任务是给当前章节做结构化质量评估，而不是泛泛文学评论。',
      '评分语义必须统一：高分表示质量更高，低分表示质量更差。',
      '请严格区分“慢热铺垫”与“推进不足”。如果章节目标本来就是铺垫、立人、埋设氛围，就不能仅因冲突不激烈或结尾不炸裂而机械扣分。',
      '请按该章节“应该完成的任务”来评估，而不是按通用爽文模板评估。',
      '对于成熟出版文本、经典文学文本、风格化文本，不得仅因语言更从容、叙事更舒展就误判为节奏差。',
      '只有当文本与本章目标明显不匹配，或确有信息堆砌、空转、重复、设定冲突时，才应扣分。',
    ].join('\n')
  );

  if (grounding.lore.worldFacts.length > 0) {
    sections.push(`【世界设定】\n${grounding.lore.worldFacts.slice(0, 8).join('\n')}`);
  }

  if (grounding.lore.rules.length > 0) {
    sections.push(`【规则约束】\n${grounding.lore.rules.slice(0, 5).join('\n')}`);
  }

  if (grounding.narrative.characters.length > 0) {
    sections.push(
      `【已有角色】\n${grounding.narrative.characters
        .slice(0, 10)
        .map((character) => character.name)
        .join('、')}`
    );
  }

  if (grounding.style.keywords.length > 0) {
    sections.push(`【风格关键词】\n${grounding.style.keywords.slice(0, 10).join('、')}`);
  }

  if (grounding.style.forbiddenRules.length > 0) {
    sections.push(`【禁忌事项】\n${grounding.style.forbiddenRules.slice(0, 8).join('\n')}`);
  }

  if (grounding.narrative.events.length > 0) {
    sections.push(
      `【近期事件】\n${grounding.narrative.events
        .slice(0, 6)
        .map((event) => `- ${event.title}`)
        .join('\n')}`
    );
  }

  sections.push(
    [
      '【八维评分标准】',
      '1. chapter_goal_completion：章节是否完成应完成的任务，0-15。',
      '2. plot_progress_and_causality：剧情是否真实推进，因果是否成立，0-15。',
      '3. conflict_and_tension：是否存在有效压力、风险、悬念或对抗，0-15。',
      '4. character_and_voice：人物是否鲜明、言行是否自洽，0-15。',
      '5. language_and_style：语言是否稳定、准确、有风格，0-10。',
      '6. continuity_and_consistency：与既有设定、上下文是否一致，0-10。',
      '7. information_and_pacing：信息投放与叙事节奏是否匹配本章任务，0-10。',
      '8. ending_hook：结尾是否形成续读驱动力，0-10。',
      '',
      '【Gate 检查】',
      '- text_completeness：是否存在中断、残缺、占位文本、大段明显重复。',
      '- readability_format：是否乱码、格式混乱、不可读。',
      '- continuity_hard_conflict：是否有硬性设定冲突、时间线冲突、身份冲突。',
      '- chapter_goal_alignment：是否明显偏离本章目标。',
      '- ai_template_smell：是否存在强烈模板腔、总结腔、套话堆叠。',
      '',
      '【决策阈值】',
      '- 90-100：pass',
      '- 80-89：pass_with_notes',
      '- 70-79：partial_rewrite',
      '- 60-69：full_rewrite',
      '- 0-59：human_review',
      '- 若 Gate 出现严重 fail，不得给 pass 或 pass_with_notes。',
      '',
      '【输出要求】',
      '- strengths 必须写具体优点，不能空泛。',
      '- majorIssues 必须写具体问题，不能套话。',
      '- revision 每项都必须尽量绑定正文原句 excerpt 和 paragraphIndex。',
      '- excerpt 必须从正文精确复制，不得改写。',
      '- 输出严格 JSON，不要输出任何解释性文字。',
    ].join('\n')
  );

  return sections.join('\n\n---\n\n');
}

function buildCriticUserPrompt(input: EvaluateInput): string {
  const lines: string[] = [];

  lines.push('请评估以下章节内容。');

  if (input.chapterTitle) {
    lines.push(`【章节标题】${input.chapterTitle}`);
  }

  if (input.chapterGoal) {
    lines.push(`【本章目标】${input.chapterGoal}`);
  }

  if (input.keyEvents && input.keyEvents.length > 0) {
    lines.push(`【关键事件】${input.keyEvents.join('；')}`);
  }

  if (input.mainCharacters && input.mainCharacters.length > 0) {
    lines.push(`【主要人物】${input.mainCharacters.join('、')}`);
  }

  if (input.volumeGoal) {
    lines.push(`【分卷目标】${input.volumeGoal}`);
  }

  if (input.previousSummaries && input.previousSummaries.length > 0) {
    lines.push(`【前章摘要】\n${input.previousSummaries.map((summary, index) => `第${index + 1}条：${summary}`).join('\n')}`);
  }

  lines.push(
    [
      '【特别校准要求】',
      '1. 若章节以铺垫、立人、建氛围、开局设局为主，不得因为没有高密度冲突就机械打低分。',
      '2. 若文本语言成熟、细节具体、人物鲜明，即使节奏舒缓，也不应误判为“AI 总结腔”。',
      '3. 对经典风格文本，优先判断是否“完成了这一回应完成的事”，而不是是否符合当代爽文模板。',
      '4. 只有存在明确证据时，才给出较重问题和低分。',
    ].join('\n')
  );

  lines.push(
    `【章节正文】（段落之间用空行分隔，即连续两个换行符 \\n\\n。单行换行不是段落分隔符）\n${input.content}`
  );

  lines.push(
    [
      '请按以下 JSON 结构返回：',
      '{',
      '  "gate": {',
      '    "text_completeness": { "status": "pass|warn|fail", "reason": "" },',
      '    "readability_format": { "status": "pass|warn|fail", "reason": "" },',
      '    "continuity_hard_conflict": { "status": "pass|warn|fail", "reason": "" },',
      '    "chapter_goal_alignment": { "status": "pass|warn|fail", "reason": "" },',
      '    "ai_template_smell": { "status": "pass|warn|fail", "reason": "" }',
      '  },',
      '  "scores": {',
      '    "chapter_goal_completion": 0-15,',
      '    "plot_progress_and_causality": 0-15,',
      '    "conflict_and_tension": 0-15,',
      '    "character_and_voice": 0-15,',
      '    "language_and_style": 0-10,',
      '    "continuity_and_consistency": 0-10,',
      '    "information_and_pacing": 0-10,',
      '    "ending_hook": 0-10,',
      '    "ai_smell_severity": "low|medium|high"',
      '  },',
      '  "issueTags": ["tag1", "tag2"],',
      '  "strengths": ["优点1", "优点2"],',
      '  "majorIssues": ["问题1", "问题2"],',
      '  "revision": {',
      '    "must_fix": [{ "text": "", "excerpt": "", "paragraphIndex": 0 }],',
      '    "should_improve": [{ "text": "", "excerpt": "", "paragraphIndex": 0 }],',
      '    "optional_enhancements": [{ "text": "", "excerpt": "", "paragraphIndex": 0 }]',
      '  },',
      '  "decision": "pass|pass_with_notes|partial_rewrite|full_rewrite|human_review|gate_fail"',
      '}',
      '如果某类 revision 没有内容，返回空数组。',
      '再次强调：excerpt 必须精确复制正文原句。',
    ].join('\n')
  );

  return lines.join('\n\n');
}

export function convertToLegacyScores(
  scores: EvaluationScoreSummary
): { style: number; pacing: number; character: number; lore: number; timeline: number; clarity: number } {
  return {
    style: Math.round((scores.language_and_style / 10) * 100),
    pacing: Math.round(((scores.information_and_pacing / 10) * 100 + (scores.plot_progress_and_causality / 15) * 100) / 2),
    character: Math.round((scores.character_and_voice / 15) * 100),
    lore: Math.round((scores.continuity_and_consistency / 10) * 100),
    timeline: Math.round((scores.continuity_and_consistency / 10) * 100),
    clarity: Math.round(((scores.language_and_style / 10) * 100 + (scores.information_and_pacing / 10) * 100) / 2),
  };
}

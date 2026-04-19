import {
  EvaluationScoreSummary,
  GateResults,
  GateCheckResult,
  IssueTag,
  EvaluationDecision,
  EvaluationResult,
  EvaluationDimension,
} from '@packages/shared-types';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';
import { callLLM, parseJSONResponse, LLMMessage } from '@/lib/llm';

export interface EvaluateInput {
  projectId: string;
  chapterId: string;
  chapterTitle: string;
  content: string;
  chapterGoal?: string;       // 本章目标
  keyEvents?: string[];       // 关键事件
  mainCharacters?: string[];  // 主要人物
  volumeGoal?: string;        // 分卷目标
  previousSummaries?: string[]; // 前文章节摘要
}

/**
 * Critic Agent v2 - 8-Dimension Evaluation System
 *
 * Evaluates chapter content across 8 dimensions with Gate layer checks,
 * issue tagging, and actionable revision suggestions.
 */
export async function criticAgent(input: EvaluateInput): Promise<EvaluationResult> {
  // Build grounding context for consistency checks
  const grounding = await buildGroundingPack(input.projectId);

  // Build system prompt with grounding context
  const systemPrompt = buildCriticSystemPrompt(grounding);

  // Build user prompt with content
  const userPrompt = buildCriticUserPrompt(input);

  // Call LLM
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callLLM(messages, {
    temperature: 0.3,
    maxTokens: 4096,
  });

  // Parse JSON response
  const result = parseJSONResponse<EvaluationResult>(response);

  // Calculate total score
  const scores = result.scores;
  scores.total = calculateTotalScore(scores);

  return result;
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
  let prompt = `你是 Quill 小说评价 Agent。

你的任务不是做泛泛文学评论，而是对当前章节进行结构化质量评审，并给出可执行的修订建议。

评估体系采用八维评分 + 硬性检查（Gate Layer）的双重机制。
`;

  // Add world facts if available
  if (grounding.lore.worldFacts.length > 0) {
    prompt += `\n【世界设定】\n${grounding.lore.worldFacts.slice(0, 5).join('；')}。\n`;
  }

  // Add rules if available
  if (grounding.lore.rules.length > 0) {
    prompt += `\n【规则约束】\n${grounding.lore.rules.slice(0, 3).join('；')}。\n`;
  }

  // Add characters if available
  if (grounding.narrative.characters.length > 0) {
    prompt += `\n【已有角色】\n${grounding.narrative.characters.map((c) => `${c.name}`).join('、')}。\n`;
  }

  // Add style keywords if available
  if (grounding.style.keywords.length > 0) {
    prompt += `\n【风格关键词】\n${grounding.style.keywords.join('、')}。\n`;
  }

  // Add forbidden rules if any
  if (grounding.style.forbiddenRules.length > 0) {
    prompt += `\n【禁忌事项】\n${grounding.style.forbiddenRules.join('、')}。\n`;
  }

  // Add recent events for narrative continuity
  if (grounding.narrative.events.length > 0) {
    const recentEvents = grounding.narrative.events.slice(0, 5);
    prompt += `\n【近期事件】\n${recentEvents.map((e) => `- ${e.title}`).join('\n')}\n`;
  }

  prompt += `
---

## 评分维度说明

### 八维评分体系（满分100分）

| 维度 | 分值 | 说明 |
|------|------|------|
| 章节功能完成度 | 15分 | 本章是否完成了"它应该完成的任务" |
| 剧情推进与因果性 | 15分 | 故事是否真实向前发展，并具有合理因果链 |
| 冲突与张力 | 15分 | 本章是否有足够的压力、阻碍、风险与戏剧性 |
| 人物塑造与角色声音 | 15分 | 人物是否立得住，不同角色是否有辨识度 |
| 语言与文风质量 | 10分 | 文本语言是否顺畅，稳定、适配项目风格 |
| 连贯性与一致性 | 10分 | 当前文本与既有上下文之间是否一致 |
| 信息控制与节奏 | 10分 | 信息投放是否适量，节奏是否匹配章节任务 |
| 结尾钩子与续读意愿 | 10分 | 章节结尾是否形成下一章驱动力 |

### 硬性检查（Gate Layer）

优先级高于普通评分。严重失败项应直接打回或转人工审阅。

| 检查项 | 说明 |
|--------|------|
| 文本完整性 | 输出中断/未完成句子/占位文本/明显残缺/大量重复段落 |
| 格式与可读性 | 乱码/异常符号污染/段落混乱/不可读输出 |
| 设定硬冲突 | 人名错乱/身份错乱/能力设定冲突/世界规则冲突/时间线矛盾 |
| 章节目标对齐度 | 章节未完成应有任务/关键事件缺失/情节重心偏移 |
| AI模板化检测 | 套话堆叠/强烈总结腔/反复同义表达/全章像梗概 |

Gate层决策规则：
- 若"文本完整性"fail，默认不能直接通过
- 若"设定硬冲突"fail，默认不能直接通过
- 若"章节目标对齐度"fail，默认不能直接通过
- 若"格式与可读性"fail，默认不能直接通过

### 问题标签体系

请从以下标签中选择3-8个最核心的：

**剧情类**: weak_plot_progress, causality_gap, convenient_plot_device, missing_key_event
**冲突类**: low_tension, weak_conflict, stakes_too_low
**人物类**: flat_character_voice, character_out_of_role, weak_protagonist_agency, tool_like_supporting_cast
**语言风格类**: ai_smell, repetitive_expression, expository_tone, over_abstract_emotion, weak_style_alignment
**连贯性类**: continuity_error, worldbuilding_conflict, timeline_conflict, abrupt_transition
**节奏类**: pace_too_slow, pace_too_fast, info_dump, underdeveloped_scene
**章节结构类**: missing_hook, chapter_goal_not_met, chapter_flat_arc

### AI味检测规则

检测点：
1. 套话密度：仿佛/似乎/不由得/某种说不清的/空气仿佛凝固/心头一震/久久不语
2. 句式重复：多句连续使用相似结构
3. 抽象情绪堆叠：只讲"复杂""压抑""悲伤"，不落到动作与细节
4. 总结腔/解释腔：不像小说在发生，而像旁白在概括
5. 功能性对白：人物只交换信息，不展现性格
6. 无效修辞：修辞很多，但不服务于场景或人物

严重度：low / medium / high

### 决策阈值

| 总分 | 决策 |
|------|------|
| 90-100 | pass |
| 80-89 | pass_with_notes |
| 70-79 | partial_rewrite |
| 60-69 | full_rewrite |
| 0-59 | human_review |

**注意**：若Gate出现严重fail，总分不得直接触发"通过"。优先级：Gate fail > 总分高低

---

请输出严格 JSON 格式的评审结果。
`;

  return prompt;
}

function buildCriticUserPrompt(input: EvaluateInput): string {
  let prompt = `请评估以下章节内容：\n\n`;

  if (input.chapterTitle) {
    prompt += `【章节标题】${input.chapterTitle}\n\n`;
  }

  if (input.chapterGoal) {
    prompt += `【本章目标】${input.chapterGoal}\n\n`;
  }

  if (input.keyEvents && input.keyEvents.length > 0) {
    prompt += `【关键事件】${input.keyEvents.join('；')}\n\n`;
  }

  if (input.mainCharacters && input.mainCharacters.length > 0) {
    prompt += `【主要人物】${input.mainCharacters.join('、')}\n\n`;
  }

  if (input.volumeGoal) {
    prompt += `【分卷目标】${input.volumeGoal}\n\n`;
  }

  if (input.previousSummaries && input.previousSummaries.length > 0) {
    prompt += `【前章摘要】\n${input.previousSummaries.map((s, i) => `第${i + 1}章：${s}`).join('\n')}\n\n`;
  }

  prompt += `【章节正文】\n${input.content}\n\n`;

  prompt += `请以 JSON 格式返回评估结果。重要：revision 各项必须包含具体的问题段落位置信息：\n`;
  prompt += `{
  "gate": {
    "text_completeness": { "status": "pass|warn|fail", "reason": "" },
    "readability_format": { "status": "pass|warn|fail", "reason": "" },
    "continuity_hard_conflict": { "status": "pass|warn|fail", "reason": "" },
    "chapter_goal_alignment": { "status": "pass|warn|fail", "reason": "" },
    "ai_template_smell": { "status": "pass|warn|fail", "reason": "" }
  },
  "scores": {
    "chapter_goal_completion": 评分(0-15),
    "plot_progress_and_causality": 评分(0-15),
    "conflict_and_tension": 评分(0-15),
    "character_and_voice": 评分(0-15),
    "language_and_style": 评分(0-10),
    "continuity_and_consistency": 评分(0-10),
    "information_and_pacing": 评分(0-10),
    "ending_hook": 评分(0-10),
    "ai_smell_severity": "low|medium|high" (可选)
  },
  "issueTags": ["tag1", "tag2", ...],
  "strengths": ["亮点1", "亮点2", ...],
  "majorIssues": ["主要问题1", "主要问题2", ...],
  "revision": {
    "must_fix": [
      {
        "text": "必须修改项描述",
        "excerpt": "引用问题所在的具体段落原文（30-100字）",
        "paragraphIndex": 段落序号(从0开始)
      },
      ...
    ],
    "should_improve": [
      {
        "text": "建议修改项描述",
        "excerpt": "引用问题所在的具体段落原文",
        "paragraphIndex": 段落序号
      },
      ...
    ],
    "optional_enhancements": [
      {
        "text": "可选增强描述",
        "excerpt": "引用相关段落原文",
        "paragraphIndex": 段落序号
      },
      ...
    ]
  },
  "decision": "pass|pass_with_notes|partial_rewrite|full_rewrite|human_review|gate_fail"
}
`;

  prompt += `\n【重要】每个 revision 项的 excerpt 必须精确引用正文中的原句/段落，作为问题位置的凭据。`;

  prompt += `\n请仔细阅读内容，提供客观公正的评估。输出必须严格遵循JSON格式，不要包含任何其他文字。`;

  return prompt;
}

// Backward compatibility - export legacy score summary converter
export function convertToLegacyScores(
  scores: EvaluationScoreSummary
): { style: number; pacing: number; character: number; lore: number; timeline: number; clarity: number } {
  return {
    style: scores.language_and_style * 10,        // 语言风格 -> style
    pacing: (scores.information_and_pacing + scores.plot_progress_and_causality) / 2 * 10 / 15 * 10, // 简化
    character: scores.character_and_voice * 10 / 15, // 人物 -> character
    lore: scores.continuity_and_consistency,        // 连贯性 -> lore (简化)
    timeline: scores.continuity_and_consistency,     // 连贯性 -> timeline (简化)
    clarity: (scores.language_and_style + scores.information_and_pacing) / 2, // 清晰度
  };
}

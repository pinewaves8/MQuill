import { EvaluationIssue, IssueType, IssueSeverity } from '@packages/shared-types';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';
import { callLLM, parseJSONResponse, LLMMessage } from '@/lib/llm';

export interface EvaluateInput {
  projectId: string;
  chapterId: string;
  chapterTitle: string;
  content: string;
  dimensions?: IssueType[];
}

export interface ScoreSummary {
  style: number;
  pacing: number;
  character: number;
  lore: number;
  timeline: number;
  clarity: number;
}

/**
 * Critic Agent
 *
 * Evaluates chapter content across multiple dimensions, using grounding
 * context to check consistency with established facts, lore, and narrative.
 */
export async function criticAgent(input: EvaluateInput): Promise<{
  scoreSummary: ScoreSummary;
  issues: Partial<EvaluationIssue>[];
}> {
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
  const result = parseJSONResponse<{
    scores: ScoreSummary;
    issues: Partial<EvaluationIssue>[];
  }>(response);

  return {
    scoreSummary: result.scores,
    issues: result.issues.map((issue) => ({
      ...issue,
      issueType: issue.issueType || 'style',
      severity: issue.severity || 'medium',
    })),
  };
}

function buildCriticSystemPrompt(
  grounding: Awaited<ReturnType<typeof buildGroundingPack>>
): string {
  let prompt = `You are a professional fiction critic specializing in Chinese literary novels.
Your task is to evaluate chapter content across multiple dimensions and provide actionable feedback.

评估维度：
1. style（风格）：语言风格是否统一、优美
2. pacing（节奏）：叙事节奏是否紧凑合理
3. character（人物）：人物塑造是否立体一致
4. lore（设定）：是否遵守世界设定和规则
5. timeline（时间线）：时间顺序是否合理
6. clarity（清晰度）：表达是否清晰流畅

评分标准：每项 0-100 分，80 分以上为良好，60-80 分为一般，60 分以下需要改进。

问题输出格式：
- high（严重）：立即需要修正的问题
- medium（中等）：建议修正的问题
- low（轻微）：可选的优化建议

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

  return prompt;
}

function buildCriticUserPrompt(input: EvaluateInput): string {
  let prompt = `请评估以下章节内容：\n\n`;

  prompt += `【章节标题】${input.chapterTitle}\n\n`;

  prompt += `【章节正文】\n${input.content}\n\n`;

  prompt += `请以 JSON 格式返回评估结果：\n`;
  prompt += `{
  "scores": {
    "style": 评分(0-100),
    "pacing": 评分(0-100),
    "character": 评分(0-100),
    "lore": 评分(0-100),
    "timeline": 评分(0-100),
    "clarity": 评分(0-100)
  },
  "issues": [
    {
      "issueType": "问题类型(style/pacing/character/lore/timeline/clarity)",
      "severity": "严重程度(high/medium/low)",
      "title": "问题标题",
      "reason": "问题原因说明",
      "suggestion": "修改建议"
    }
  ]
}\n`;

  prompt += `\n请仔细阅读内容，提供客观公正的评估。`;

  return prompt;
}

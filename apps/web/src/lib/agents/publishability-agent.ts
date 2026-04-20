/**
 * Publishability Agent
 *
 * Evaluates whether a complete novel is ready for publication.
 * This runs independently from chapter evaluation and provides
 * an overall quality gate that doesn't block the revision flow.
 *
 * Assessment dimensions:
 * - Language maturity
 * - Character distinctiveness
 * - Conflict progression
 * - Structural completeness
 * - Repetition and template artifacts
 * - Ending resonance
 */

import { callLLM, parseJSONResponse, LLMMessage } from '@/lib/llm';

export interface PublishabilityInput {
  projectId: string;
  title: string;
  chapters: Array<{
    id: string;
    title: string;
    content: string;
  }>;
}

export interface PublishabilityResult {
  publishable: boolean;
  scores: PublishabilityScores;
  summary: string;
  issues: PublishabilityIssue[];
}

export interface PublishabilityScores {
  languageMaturity: number;      // 语言成熟度 (0-100)
  characterDistinctiveness: number; // 人物辨识度 (0-100)
  conflictProgression: number;  // 冲突推进质量 (0-100)
  structuralCompleteness: number; // 结构完整度 (0-100)
  repetitionCleanliness: number; // 重复与模板痕迹 (0-100)
  endingResonance: number;      // 结尾余韵 (0-100)
  overall: number;              // 综合得分 (0-100)
}

export interface PublishabilityIssue {
  dimension: keyof PublishabilityScores;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  suggestion: string;
}

const PUBLISHABILITY_THRESHOLD = 70; // Minimum overall score for publishability

export async function evaluatePublishability(
  input: PublishabilityInput
): Promise<PublishabilityResult> {
  const systemPrompt = buildPublishabilitySystemPrompt();
  const userPrompt = buildPublishabilityUserPrompt(input);

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callLLM(messages, {
    temperature: 0.3,
    maxTokens: 4096,
  });

  const result = parseJSONResponse<PublishabilityResult>(response);

  // Calculate overall score
  const scores = result.scores;
  scores.overall = calculateOverallScore(scores);

  // Determine publishability
  result.publishable = scores.overall >= PUBLISHABILITY_THRESHOLD &&
    scores.repetitionCleanliness >= 60 &&
    scores.structuralCompleteness >= 60;

  return result;
}

function calculateOverallScore(scores: Omit<PublishabilityScores, 'overall'>): number {
  return Math.round(
    scores.languageMaturity * 0.2 +
    scores.characterDistinctiveness * 0.2 +
    scores.conflictProgression * 0.2 +
    scores.structuralCompleteness * 0.15 +
    scores.repetitionCleanliness * 0.15 +
    scores.endingResonance * 0.1
  );
}

function buildPublishabilitySystemPrompt(): string {
  return `你是 Quill 小说发表准备度评估 Agent。

你的任务是对完整小说进行发表前质量评估，输出客观公正的评估报告。

这不是章节评审，而是全局性的发表准备度评估。
`;
}

function buildPublishabilityUserPrompt(input: PublishabilityInput): string {
  let prompt = `请评估以下小说的发表准备度：\n\n`;
  prompt += `【作品标题】${input.title}\n\n`;
  prompt += `【总章数】${input.chapters.length}\n\n`;

  for (const chapter of input.chapters) {
    prompt += `【${chapter.title}】\n${chapter.content}\n\n`;
    prompt += `---\n\n`;
  }

  prompt += `请输出严格 JSON 格式的发表准备度评估结果：

{
  "scores": {
    "languageMaturity": 评分(0-100),    // 语言成熟度
    "characterDistinctiveness": 评分(0-100), // 人物辨识度
    "conflictProgression": 评分(0-100), // 冲突推进质量
    "structuralCompleteness": 评分(0-100), // 结构完整度
    "repetitionCleanliness": 评分(0-100), // 重复与模板痕迹（越高越好）
    "endingResonance": 评分(0-100)     // 结尾余韵
  },
  "summary": "总体评估摘要（100-200字）",
  "issues": [
    {
      "dimension": "对应维度",
      "severity": "critical|major|minor",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ]
}

评分标准说明：
- languageMaturity：语言是否凝练、有文学性，避免口水话、重复句式
- characterDistinctiveness：每个角色是否有独特的声音、性格、行为模式
- conflictProgression：冲突是否逐层递进，不是原地踏步
- structuralCompleteness：开头、发展、高潮、结尾是否完整
- repetitionCleanliness：是否有段落重复、意象重复、换句式说同样内容
- endingResonance：结尾是否有余韵，能引发读者思考或情感共鸣

注意：评估应基于全文综合判断，而不是逐章打分。`;
  return prompt;
}

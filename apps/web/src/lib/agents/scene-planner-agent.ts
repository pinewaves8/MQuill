import { SceneCard } from '@packages/shared-types';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';
import { callLLM, parseJSONResponse, LLMMessage } from '@/lib/llm';

export interface ScenePlanInput {
  projectId: string;
  chapterId: string;
  chapterTitle: string;
  chapterSummary?: string;
  previousChapterSummary?: string;
}

export interface ScenePlanOutput {
  scenes: Partial<SceneCard>[];
}

/**
 * Scene Planner Agent
 *
 * Generates a list of scenes for a chapter, using grounding context
 * to ensure consistency with the overall narrative arc.
 */
export async function scenePlannerAgent(input: ScenePlanInput): Promise<ScenePlanOutput> {
  // Build grounding context
  const grounding = await buildGroundingPack(input.projectId);

  // Build system prompt with grounding context
  const systemPrompt = buildScenePlannerSystemPrompt(grounding, input.previousChapterSummary);

  // Build user prompt with chapter details
  const userPrompt = buildScenePlannerUserPrompt(input);

  // Call LLM
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callLLM(messages, {
    temperature: 0.7,
    maxTokens: 4096,
  });

  // Parse JSON response
  const result = parseJSONResponse<{ scenes: Partial<SceneCard>[] }>(response);

  return {
    scenes: result.scenes.map((s) => ({
      ...s,
      status: 'draft',
      source: 'ai',
    })),
  };
}

function buildScenePlannerSystemPrompt(
  grounding: Awaited<ReturnType<typeof buildGroundingPack>>,
  previousChapterSummary?: string
): string {
  let prompt = `You are a professional fiction outline planner specializing in Chinese literary novels.
Your task is to create a well-structured scene outline for a chapter.

场景规划原则：
1. 每个场景应该有明确的目标和冲突
2. 场景之间应该有自然的过渡和因果关系
3. 场景数量根据章节长度而定（通常3-6个场景）
4. 每个场景应该有独特的氛围和节奏

`;

  // Add previous chapter summary if available
  if (previousChapterSummary) {
    prompt += `\n【上一章概要】\n${previousChapterSummary}\n`;
  }

  // Add narrative context
  if (grounding.narrative.events.length > 0) {
    const recentEvents = grounding.narrative.events.slice(0, 5);
    prompt += `\n【已有情节】\n${recentEvents.map((e) => `- ${e.title}: ${e.description}`).join('\n')}\n`;
  }

  // Add characters
  if (grounding.narrative.characters.length > 0) {
    prompt += `\n【登场人物】\n${grounding.narrative.characters.map((c) => c.name).join('、')}。\n`;
  }

  // Add style keywords
  if (grounding.style.keywords.length > 0) {
    prompt += `\n【风格关键词】\n${grounding.style.keywords.join('、')}。\n`;
  }

  // Add world rules
  if (grounding.lore.rules.length > 0) {
    prompt += `\n【世界规则】\n${grounding.lore.rules.slice(0, 2).join('；')}。\n`;
  }

  return prompt;
}

function buildScenePlannerUserPrompt(input: ScenePlanInput): string {
  let prompt = `请为以下章节创建场景规划：\n\n`;

  prompt += `【章节标题】${input.chapterTitle}\n`;

  if (input.chapterSummary) {
    prompt += `\n【章节概要】\n${input.chapterSummary}\n`;
  }

  prompt += `\n请以 JSON 格式返回场景列表，格式如下：\n`;
  prompt += `{
  "scenes": [
    {
      "title": "场景标题",
      "summary": "场景摘要（100-200字）",
      "objectives": ["目标1", "目标2"],
      "location": "场景地点（可选）",
      "timeSlot": "时间（可选）"
    }
  ]
}\n`;

  prompt += `\n请生成 3-6 个场景，确保场景之间有清晰的逻辑推进。`;

  return prompt;
}

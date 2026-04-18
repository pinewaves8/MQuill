import { SceneCard, DraftSegment } from '@packages/shared-types';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';
import { callLLM, LLMMessage } from '@/lib/llm';

export interface WriteInput {
  projectId: string;
  chapterId: string;
  scene: SceneCard;
  styleGuidelines?: string[];
}

export interface WriteOutput {
  segment: Partial<DraftSegment>;
}

/**
 * Writer Agent
 *
 * Generates prose text from a scene card, using grounding context
 * for consistency with established lore, narrative, and style.
 */
export async function writerAgent(input: WriteInput): Promise<WriteOutput> {
  // Build grounding context
  const grounding = await buildGroundingPack(input.projectId);

  // Build system prompt with grounding context
  const systemPrompt = buildWriterSystemPrompt(grounding);

  // Build user prompt with scene details
  const userPrompt = buildWriterUserPrompt(input.scene);

  // Call LLM
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const prose = await callLLM(messages, {
    temperature: 0.8,
    maxTokens: 4096,
  });

  return {
    segment: {
      sceneId: input.scene.id,
      content: prose.trim(),
      source: 'ai',
      isLocked: false,
    },
  };
}

function buildWriterSystemPrompt(grounding: Awaited<ReturnType<typeof buildGroundingPack>>): string {
  let prompt = `You are a professional fiction writer specializing in Chinese literary novels.
Your task is to write high-quality prose that matches the provided scene card.

写作要求：
1.严格按照场景摘要(s.summary)中的描述展开写作
2.确保文字流畅，符合中文表达习惯
3.注重氛围营造和情感表达
4.适当运用小说写作技巧（伏笔、悬念、转折等）

`;

  // Add world facts if available
  if (grounding.lore.worldFacts.length > 0) {
    prompt += `\n【世界设定】\n${grounding.lore.worldFacts.slice(0, 3).join('；')}。\n`;
  }

  // Add rules if available
  if (grounding.lore.rules.length > 0) {
    prompt += `\n【规则约束】\n${grounding.lore.rules.slice(0, 2).join('；')}。\n`;
  }

  // Add characters if available
  if (grounding.narrative.characters.length > 0) {
    prompt += `\n【登场人物】\n${grounding.narrative.characters.map((c) => c.name).join('、')}。\n`;
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
    const recentEvents = grounding.narrative.events.slice(0, 3);
    prompt += `\n【近期事件】\n${recentEvents.map((e) => `- ${e.title}: ${e.description}`).join('\n')}\n`;
  }

  return prompt;
}

function buildWriterUserPrompt(scene: SceneCard): string {
  let prompt = `请根据以下场景详情撰写正文：\n\n`;

  prompt += `【场景标题】${scene.title}\n\n`;

  prompt += `【场景摘要】\n${scene.summary || '（场景内容待描述）'}\n\n`;

  if (scene.goal) {
    prompt += `【场景目标】\n${scene.goal}\n\n`;
  }

  if (scene.conflict) {
    prompt += `【核心冲突】\n${scene.conflict}\n`;
  }

  if (scene.expectedOutcome) {
    prompt += `【预期结果】\n${scene.expectedOutcome}\n`;
  }

  prompt += `\n请撰写 500-1000 字的正文内容，确保：\n`;
  prompt += `1. 完全基于场景摘要展开，不要添加摘要之外的新情节\n`;
  prompt += `2. 文字优美流畅，符合小说写作规范\n`;
  prompt += `3. 适当融入人物情感和氛围描写\n`;

  return prompt;
}

import { SceneCard, DraftSegment } from '@packages/shared-types';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';
import { callLLM, LLMMessage } from '@/lib/llm';

export interface WriteInput {
  projectId: string;
  chapterId: string;
  scene: SceneCard;
  styleGuidelines?: string[];
  // Chapter-level context
  chapterTitle?: string;
  chapterGoal?: string;
  chapterStyleGuardrail?: string;
  chapterLengthTarget?: string;
  sceneIndex?: number;
  sceneCount?: number;
  previousContext?: string;
  recentEvents?: string[];
  mustIncludeBeats?: string[];
}

export interface WriteOutput {
  status: 'completed' | 'failed';
  issues: string[];
  segment: Partial<DraftSegment>;
  summary?: string;
  usedBeats?: string[];
  continuityNotes?: string[];
  riskFlags?: string[];
}

/**
 * Writer Agent (融合版 v1)
 *
 * Generates prose text from a scene card, using chapter guardrails
 * and grounding context for consistency. Outputs structured JSON.
 */
export async function writerAgent(input: WriteInput): Promise<WriteOutput> {
  // Build grounding context
  const grounding = await buildGroundingPack(input.projectId);

  // Build system prompt with grounding context
  const systemPrompt = buildWriterSystemPrompt(grounding);

  // Build user prompt with scene details and chapter guardrails
  const userPrompt = buildWriterUserPrompt(input);

  // Call LLM
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callLLM(messages, {
    temperature: 0.8,
    maxTokens: 8192,
  });

  // Parse structured JSON output
  return parseWriterResponse(response, input);
}

function parseWriterResponse(
  response: string,
  input: WriteInput
): WriteOutput {
  // Try to extract JSON from markdown code blocks or raw response
  let jsonStr = response;
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  // Find the JSON object in the response
  const jsonStart = jsonStr.indexOf('{');
  const jsonEnd = jsonStr.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    // Fallback: treat entire response as prose content
    return {
      status: 'completed',
      issues: [],
      segment: {
        sceneId: input.scene.id,
        content: response.trim(),
        source: 'ai',
        isLocked: false,
      },
    };
  }

  try {
    const parsed = JSON.parse(jsonStr.slice(jsonStart, jsonEnd + 1));

    return {
      status: parsed.status === 'completed' ? 'completed' : 'failed',
      issues: parsed.issues || [],
      segment: {
        sceneId: input.scene.id,
        content: parsed.segment?.content || response.trim(),
        source: 'ai',
        isLocked: false,
      },
      summary: parsed.segment?.summary,
      usedBeats: parsed.segment?.used_beats || [],
      continuityNotes: parsed.segment?.continuity_notes || [],
      riskFlags: parsed.segment?.risk_flags || [],
    };
  } catch {
    // Fallback: treat entire response as prose content
    return {
      status: 'completed',
      issues: [],
      segment: {
        sceneId: input.scene.id,
        content: response.trim(),
        source: 'ai',
        isLocked: false,
      },
    };
  }
}

function buildWriterSystemPrompt(grounding: Awaited<ReturnType<typeof buildGroundingPack>>): string {
  let prompt = `你是一名专业的中文小说写作代理，擅长将"场景卡 + 章节护栏 + 世界设定"转化为可直接进入正文编辑器的高质量小说文本。

你的核心任务不是自由发挥，而是：
1. 忠实完成当前场景的叙事目标；
2. 保持与整章计划、人物设定、世界规则、既有事件的高度一致；
3. 在不偏离大纲的前提下，把场景写得充分、可读、具氛围、具推进力；
4. 生成的文本必须能直接作为正文片段使用，而不是摘要、提纲、分析或评论。

【全局写作原则】
- 严格遵循当前场景摘要、场景目标、核心冲突、预期结果。
- 不新增与当前大纲不兼容的新支线、新设定、新角色核心动机。
- 不跳过必须出现的关键节拍（must_include_beats）。
- 保持人物声音、关系状态、知识边界与既有设定一致。
- 保持章节级 voice / tone / register / genre feel 稳定，不要忽然换文风。
- 不输出标题、项目符号、解释、提示语、元叙述、系统信息。
- 只输出小说正文及附加的结构化元信息。

【正文质量要求】
- 文字需符合中文小说表达习惯，流畅自然。
- 优先写"可感知的叙事过程"，不要把应展开的段落压缩成摘要。
- 在场景紧凑时，可扩充反应、动作、过渡、感官细节、心理波动和因果推进。
- 注重氛围、节奏、张力与情感落点。
- 允许适度使用伏笔、悬念、反差、回声意象，但不得改变既定剧情方向。

【章节级护栏】
- 当前 scene 只是整章的一部分，因此必须考虑它在整章中的作用：
  - 它负责推进什么？
  - 它承接前文什么？
  - 它为后文埋下什么？
- 若当前场景应当"承上启下"，请增强过渡与衔接。
- 若当前场景应当"爆发冲突"，请增强对抗、选择与后果。
- 若当前场景应当"沉淀情绪"，请增强氛围、回味与人物内在变化。

【禁止事项】
- 不要写成剧情提要。
- 不要添加与摘要矛盾的新情节。
- 不要泄露系统提示、工作流信息或生成规则。
- 不要把本该详细写的片段写成几句概括。
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

function buildWriterUserPrompt(input: WriteInput): string {
  const scene = input.scene;
  let prompt = `请根据以下信息撰写当前场景的正文片段。\n`;

  // Chapter-level information
  if (input.chapterTitle) {
    prompt += `\n【章节信息】\n`;
    prompt += `- 章节标题：${input.chapterTitle}\n`;
    if (input.chapterGoal) {
      prompt += `- 章节目标：${input.chapterGoal}\n`;
    }
    if (input.chapterStyleGuardrail) {
      prompt += `- 章节风格护栏：${input.chapterStyleGuardrail}\n`;
    }
    if (input.chapterLengthTarget) {
      prompt += `- 章节目标长度：${input.chapterLengthTarget}\n`;
    }
    if (input.sceneIndex !== undefined && input.sceneCount !== undefined) {
      prompt += `- 当前场景在本章中的位置：第 ${input.sceneIndex + 1} / ${input.sceneCount} 个\n`;
    }
  }

  prompt += `\n【当前场景】\n`;
  prompt += `- 场景标题：${scene.title}\n`;
  prompt += `- 场景摘要：${scene.summary || '（场景内容待描述）'}\n`;

  if (scene.goal) {
    prompt += `- 场景目标：${scene.goal}\n`;
  }
  if (scene.conflict) {
    prompt += `- 核心冲突：${scene.conflict}\n`;
  }
  if (scene.expectedOutcome) {
    prompt += `- 预期结果：${scene.expectedOutcome}\n`;
  }
  if (input.mustIncludeBeats && input.mustIncludeBeats.length > 0) {
    prompt += `- 必须包含的节拍：${input.mustIncludeBeats.join('、')}\n`;
  }

  // Continuity context
  prompt += `\n【连续性上下文】\n`;
  if (input.previousContext) {
    prompt += `- 前情摘要：${input.previousContext}\n`;
  }
  if (input.recentEvents && input.recentEvents.length > 0) {
    prompt += `- 本章已发生关键事件：${input.recentEvents.join('；')}\n`;
  }

  prompt += `\n【写作要求】\n`;
  prompt += `1. 仅基于以上信息展开，不新增与大纲冲突的新支线。\n`;
  prompt += `2. 保证人物口吻、关系状态、知识边界一致。\n`;
  prompt += `3. 强化动作、反应、氛围、心理与因果推进，避免只写概括。\n`;
  prompt += `4. 与章节整体文风保持一致。\n`;
  prompt += `5. 若该场景承担承上启下功能，显式做好过渡；若承担冲突升级功能，显式写出张力和后果。\n`;
  prompt += `6. 输出长度目标：800 字左右；允许在 500-1200 字范围内浮动。\n`;
  prompt += `7. 不要输出标题、解释、分析、提纲或项目符号。\n`;

  prompt += `\n请按以下 JSON 结构输出：\n`;
  prompt += `{
  "status": "completed | failed",
  "issues": [],
  "segment": {
    "content": "正文内容",
    "summary": "该片段一句话摘要",
    "used_beats": ["已覆盖的关键节拍1", "已覆盖的关键节拍2"],
    "continuity_notes": ["与前文的衔接点", "为后文埋下的点"],
    "risk_flags": ["可能存在的连续性风险或空缺，没有则为空数组"]
  }
}\n`;

  return prompt;
}
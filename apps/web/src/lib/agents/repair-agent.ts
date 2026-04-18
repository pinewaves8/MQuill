import { RevisionTask } from '@packages/shared-types';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';
import { callLLM, LLMMessage } from '@/lib/llm';

export interface RepairInput {
  revision: RevisionTask;
  originalText: string;
  projectId: string;
}

export interface RepairOutput {
  candidateText: string;
  styleNotes: string[];
}

/**
 * Repair Agent
 *
 * Takes a revision task and original text, generates an improved version
 * based on suggestions, goals, and constraints while respecting the
 * project's established style and lore.
 */
export async function repairAgent(input: RepairInput): Promise<RepairOutput> {
  const grounding = await buildGroundingPack(input.projectId);

  const systemPrompt = buildRepairSystemPrompt(grounding, input.revision);
  const userPrompt = buildRepairUserPrompt(input.revision, input.originalText);

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const candidateText = await callLLM(messages, {
    temperature: 0.6,
    maxTokens: 4096,
  });

  const styleNotes = extractStyleNotes(input.revision.goals);

  return {
    candidateText: candidateText.trim(),
    styleNotes,
  };
}

function buildRepairSystemPrompt(
  grounding: Awaited<ReturnType<typeof buildGroundingPack>>,
  revision: RevisionTask
): string {
  const { applyMode } = revision;
  let modeInstruction = '';
  if (applyMode === 'replace') {
    modeInstruction = '对原文进行改写，保持同等长度或适度调整。';
  } else if (applyMode === 'append') {
    modeInstruction = '在原文基础上追加新内容，不是改写原文。';
  } else if (applyMode === 'branch') {
    modeInstruction = '生成一个独立的分支版本，作为平行宇宙的替代方案。';
  }

  let prompt = `你是一位资深小说编辑，擅长根据修订建议对正文进行精细打磨。
你的任务是生成一个高质量的修订版本，严格遵守给定的约束条件。

【基本要求】
${modeInstruction}

`;

  if (grounding.style.keywords.length > 0) {
    prompt += `\n【风格关键词】\n${grounding.style.keywords.join('、')}。\n`;
  }

  if (grounding.style.forbiddenRules.length > 0) {
    prompt += `\n【禁忌事项】\n${grounding.style.forbiddenRules.join('、')}。\n`;
  }

  if (grounding.style.tone) {
    prompt += `\n【语调】\n${grounding.style.tone}\n`;
  }

  if (grounding.lore.worldFacts.length > 0) {
    prompt += `\n【世界设定】\n${grounding.lore.worldFacts.slice(0, 3).join('；')}。\n`;
  }

  if (grounding.narrative.characters.length > 0) {
    prompt += `\n【登场人物】\n${grounding.narrative.characters.map((c) => c.name).join('、')}。\n`;
  }

  if (grounding.constraints.length > 0) {
    prompt += `\n【项目级约束】\n${grounding.constraints.join('；')}。\n`;
  }

  return prompt;
}

function buildRepairUserPrompt(revision: RevisionTask, originalText: string): string {
  let prompt = `【原文】\n${originalText}\n\n`;

  if (revision.suggestion) {
    prompt += `【修改建议】\n${revision.suggestion}\n\n`;
  }

  if (revision.goals && revision.goals.length > 0) {
    prompt += `【修订目标】\n${revision.goals.map((g) => `- ${g}`).join('\n')}\n\n`;
  }

  if (revision.constraints && revision.constraints.length > 0) {
    prompt += `【必须保持不变】\n${revision.constraints.map((c) => `- ${c}`).join('\n')}\n\n`;
  }

  prompt += `请根据以上信息，生成修订后的正文。只输出修订后的内容，不要添加解释说明。`;

  return prompt;
}

function extractStyleNotes(goals: string[]): string[] {
  const notes: string[] = [];
  if (goals.includes('压缩冗余')) notes.push('精简了重复表达');
  if (goals.includes('强化节奏')) notes.push('提升了叙事节奏');
  if (goals.includes('增强人物张力')) notes.push('强化了人物之间的冲突和张力');
  if (goals.includes('提升古风感')) notes.push('增强了古风语言韵味');
  if (goals.includes('加强环境描写')) notes.push('补充了环境氛围描写');
  return notes;
}

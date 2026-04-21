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
  const modeInstruction = getModeInstruction(revision.applyMode);

  let prompt = `你是一位资深小说编辑，擅长在不破坏结构的前提下精修正文。

基本要求：
1. ${modeInstruction}
2. 禁止无故删减关键剧情、人物关系、信息量与情绪层次。
3. 禁止把局部修订扩写成整章重写，除非原任务明确是整章修订。
4. 禁止输出重复段落、重复意象堆叠或语义回灌。
5. 若原文已成立，请优先做精修而不是重写。
`;

  if (grounding.style.keywords.length > 0) {
    prompt += `\n【风格关键词】\n${grounding.style.keywords.join('、')}\n`;
  }

  if (grounding.style.forbiddenRules.length > 0) {
    prompt += `\n【禁忌事项】\n${grounding.style.forbiddenRules.join('；')}\n`;
  }

  if (grounding.style.tone) {
    prompt += `\n【语调】\n${grounding.style.tone}\n`;
  }

  if (grounding.lore.worldFacts.length > 0) {
    prompt += `\n【世界设定】\n${grounding.lore.worldFacts.slice(0, 3).join('；')}\n`;
  }

  if (grounding.narrative.characters.length > 0) {
    prompt += `\n【登场人物】\n${grounding.narrative.characters.map((c) => c.name).join('、')}\n`;
  }

  if (grounding.constraints.length > 0) {
    prompt += `\n【项目级约束】\n${grounding.constraints.join('；')}\n`;
  }

  return prompt;
}

function buildRepairUserPrompt(revision: RevisionTask, originalText: string): string {
  const originalLength = countChars(originalText);
  const minRatio = getMinRetentionRatio(revision);
  const maxRatio = getMaxExpansionRatio(revision);
  const minLength = Math.max(Math.floor(originalLength * minRatio), Math.min(originalLength, 120));
  const maxLength = Math.max(Math.ceil(originalLength * maxRatio), minLength);

  let prompt = `【原文】\n${originalText}\n\n`;

  if (revision.suggestion) {
    prompt += `【修改建议】\n${revision.suggestion}\n\n`;
  }

  if (revision.goals && revision.goals.length > 0) {
    prompt += `【修订目标】\n${revision.goals.map((goal) => `- ${goal}`).join('\n')}\n\n`;
  }

  if (revision.constraints && revision.constraints.length > 0) {
    prompt += `【必须保持不变】\n${revision.constraints.map((constraint) => `- ${constraint}`).join('\n')}\n\n`;
  }

  prompt += `【长度约束】\n`;
  prompt += `- 原文字数约 ${originalLength} 字\n`;
  prompt += `- 修订后至少保留 ${Math.round(minRatio * 100)}% 的篇幅，不得低于 ${minLength} 字\n`;
  prompt += `- 修订后尽量控制在 ${maxLength} 字以内，避免无意义膨胀\n`;
  prompt += `- 不要通过删除段落来“完成修订”\n\n`;

  prompt += `请根据以上信息输出修订后的正文。只输出正文本身，不要解释，不要列表，不要附注。`;

  return prompt;
}

function getModeInstruction(applyMode: RevisionTask['applyMode']): string {
  if (applyMode === 'append') {
    return '在原文基础上补足内容，但新增内容必须服务于原问题，不得重复原文。';
  }

  if (applyMode === 'branch') {
    return '生成一版平行分支方案，但仍需保持原文信息密度与叙事完整度。';
  }

  return '对原文进行精修替换，默认保持原有信息密度、段落规模与剧情覆盖。';
}

function getMinRetentionRatio(revision: RevisionTask): number {
  if (revision.applyMode === 'append') {
    return 1;
  }

  if (revision.targetScope === 'chapter') {
    return 0.9;
  }

  return 0.85;
}

function getMaxExpansionRatio(revision: RevisionTask): number {
  if (revision.applyMode === 'append') {
    return 1.6;
  }

  if (revision.targetScope === 'chapter') {
    return 1.2;
  }

  return 1.35;
}

function countChars(text: string): number {
  return text.replace(/\s+/g, '').length;
}

function extractStyleNotes(goals: string[]): string[] {
  const notes: string[] = [];
  if (goals.includes('压缩冗余')) notes.push('精简了重复表达');
  if (goals.includes('强化节奏')) notes.push('提升了叙事节奏');
  if (goals.includes('增强人物张力')) notes.push('强化了人物之间的冲突和张力');
  if (goals.includes('提升古风感')) notes.push('增强了语言的古风质感');
  if (goals.includes('加强环境描写')) notes.push('补充了环境氛围描写');
  return notes;
}

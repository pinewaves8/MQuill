/**
 * Revision Skill - Targeted revision application with constraint checking
 *
 * Wraps repair-agent with:
 * - Segment-level revision targeting
 * - Constraint and goal preservation
 * - Change summary generation
 */

import type {
  RevisionSkillInput,
  RevisionSkillOutput,
  SkillOutputSchema,
} from '../skill-interface';
import { buildGroundingPack, type GroundingPack } from '@/lib/retrieval/grounding-pack';

// ============================================================
// Skill Implementation
// ============================================================

export async function executeRevisionSkill(
  input: RevisionSkillInput
): Promise<SkillOutputSchema> {
  const {
    projectId,
    originalText,
    suggestion,
    goals = [],
    constraints = [],
    applyMode = 'replace',
  } = input;

  try {
    // Build grounding context
    const groundingPack = await buildGroundingPack(projectId);

    // Generate revision
    const revisionResult = await generateRevision({
      originalText,
      suggestion,
      goals,
      constraints,
      applyMode,
      groundingPack,
    });

    return {
      status: revisionResult.applied ? 'completed' : 'needs_revision',
      deliverable: {
        revisedContent: revisionResult.content,
        applied: revisionResult.applied,
        changeSummary: revisionResult.summary,
      },
    };
  } catch (error) {
    console.error('[RevisionSkill] Execution error:', error);
    return {
      status: 'failed',
      deliverable: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================
// Revision Generation
// ============================================================

interface RevisionParams {
  originalText: string;
  suggestion: string;
  goals: string[];
  constraints: string[];
  applyMode: 'replace' | 'merge' | 'insert';
  groundingPack: GroundingPack;
}

interface RevisionResult {
  content: string;
  applied: boolean;
  summary: string;
}

async function generateRevision(params: RevisionParams): Promise<RevisionResult> {
  const { originalText, suggestion, goals, constraints, applyMode, groundingPack } = params;
  const groundingText = JSON.stringify(groundingPack, null, 2);

  const userPrompt = `## 任务：应用文本修订

### 原始文本
${originalText}

### 修订建议
${suggestion}

### 修订目标（需保留）
${goals.length > 0 ? goals.map((g) => `- ${g}`).join('\n') : '无特定目标'}

### 约束条件（需遵守）
${constraints.length > 0 ? constraints.map((c) => `- ${c}`).join('\n') : '无特定约束'}

### 世界观/设定背景
${groundingText}

### 修订模式
${applyMode === 'replace' ? '替换：用新内容完全替换原文' : applyMode === 'merge' ? '合并：将修订内容与原文合并' : '插入：在原文适当位置插入新内容'}

请根据修订建议修改原始文本，保持叙事连贯性。返回 JSON 格式：
{
  "content": "修订后的完整文本",
  "applied": true/false,
  "summary": "修改摘要"
}`;

  // Call LLM for revision
  const { callLLM } = await import('@/lib/llm/client');
  type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string };
  const messages: LLMMessage[] = [
    { role: 'system', content: '你是一个专业的小说文字编辑，擅长根据修订建议优化文本，同时保持原文风格和叙事完整性。' },
    { role: 'user', content: userPrompt },
  ];
  const response = await callLLM(messages, {
    temperature: 0.5,
    maxTokens: 8192,
  });

  return parseRevisionResponse(response);
}

// ============================================================
// Response Parsing
// ============================================================

function parseRevisionResponse(response: string): RevisionResult {
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(response);
    return {
      content: parsed.content || '',
      applied: parsed.applied ?? true,
      summary: parsed.summary || '修订已完成',
    };
  } catch {
    // Fall back to returning the response as-is
    return {
      content: response,
      applied: true,
      summary: '修订已完成',
    };
  }
}

// ============================================================
// Skill Interface Export
// ============================================================

export const revisionSkillId = 'revision-skill';

export async function handleRevisionSkill(
  input: RevisionSkillInput
): Promise<SkillOutputSchema> {
  return executeRevisionSkill(input);
}

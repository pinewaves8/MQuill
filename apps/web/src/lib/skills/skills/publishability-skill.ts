/**
 * Publishability Skill - Final manuscript assessment for publication readiness
 *
 * Wraps publishability-agent with:
 * - Complete manuscript evaluation
 * - Dimension-specific scoring
 * - Publication readiness classification
 * - Recommendations generation
 */

import type {
  PublishabilitySkillInput,
  PublishabilitySkillOutput,
  SkillOutputSchema,
  ReferenceExample,
} from '../skill-interface';
import { buildGroundingPack, type GroundingPack } from '@/lib/retrieval/grounding-pack';
import { projectStore, chapterStore, draftSegmentStore } from '@/lib/db/projects-store';
import { retrieveReferenceExamples } from '../reference-library-store';

// ============================================================
// Skill Implementation
// ============================================================

export async function executePublishabilitySkill(
  input: PublishabilitySkillInput,
  referenceExamples?: ReferenceExample[]
): Promise<SkillOutputSchema> {
  const { projectId, title } = input;

  try {
    // Build grounding context
    const groundingPack = await buildGroundingPack(projectId);

    // Gather all chapter content
    const chapters = await chapterStore.getByProject(projectId);
    const sortedChapters = [...chapters].sort((a, b) => a.sortOrder - b.sortOrder);

    const fullManuscript: string[] = [];
    for (const chapter of sortedChapters) {
      const segments = await draftSegmentStore.getByChapter(chapter.id);
      const sortedSegments = [...segments].sort((a, b) => a.segmentIndex - b.segmentIndex);
      const chapterContent = sortedSegments.map((s) => s.content).join('\n\n');
      if (chapterContent.trim()) {
        fullManuscript.push(`【${chapter.title}】\n${chapterContent}`);
      }
    }

    const manuscriptText = fullManuscript.join('\n\n---\n\n');

    // Retrieve reference examples
    const examples = referenceExamples ?? retrieveReferenceExamples({
      libraryId: 'writing-technique',
      mode: 'hybrid',
      maxExamples: 10,
      minQualityScore: 85,
    });

    // Evaluate publishability
    const evaluation = await evaluatePublishability({
      title,
      manuscript: manuscriptText,
      groundingPack,
      referenceExamples: examples,
    });

    const output: PublishabilitySkillOutput = {
      status: evaluation.readiness_level === 'ready' ? 'completed' : 'needs_revision',
      deliverable: evaluation,
    };

    return output;
  } catch (error) {
    console.error('[PublishabilitySkill] Execution error:', error);
    return {
      status: 'failed',
      deliverable: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================
// Publishability Evaluation
// ============================================================

interface PublishabilityParams {
  title: string;
  manuscript: string;
  groundingPack: GroundingPack;
  referenceExamples: ReferenceExample[];
}

interface PublishabilityEvaluation {
  overall_score: number;
  dimension_scores: {
    plot_coherence: number;
    character_consistency: number;
    language_quality: number;
    thematic_depth: number;
    narrative_drive: number;
  };
  readiness_level: 'ready' | 'needs_revision' | 'not_ready';
  summary: string;
  recommendations: string[];
}

async function evaluatePublishability(params: PublishabilityParams): Promise<PublishabilityEvaluation> {
  const { title, manuscript, groundingPack, referenceExamples } = params;
  const groundingText = JSON.stringify(groundingPack, null, 2);

  // Build quality reference from examples
  const qualityReference = referenceExamples
    .slice(0, 5)
    .map((ex) => `【${ex.title}】\n技法: ${ex.technique_tags?.join(', ') || '未标注'}\n${ex.content.slice(0, 200)}...`)
    .join('\n\n');

  const userPrompt = `## 任务：终稿发表评估

### 书名
《${title}》

### 全文稿（约${(manuscript.length / 1000).toFixed(0)}千字）
${manuscript.slice(0, 15000)}${manuscript.length > 15000 ? '\n\n[...省略后续内容...]' : ''}

### 质量标准参考
${qualityReference || '无参考样本'}

### 世界观/设定背景
${groundingText}

请对全文进行综合发表评估，评估以下五个维度：
1. 情节连贯性 - 故事是否逻辑清晰、前后呼应
2. 人物一致性 - 人物性格、行为是否前后统一
3. 语言质量 - 文笔水平、修辞运用
4. 主题深度 - 思想内涵、情感共鸣
5. 叙事张力 - 是否吸引读者持续阅读

返回 JSON 格式：
{
  "overall_score": 0-100,
  "dimension_scores": {
    "plot_coherence": 0-100,
    "character_consistency": 0-100,
    "language_quality": 0-100,
    "thematic_depth": 0-100,
    "narrative_drive": 0-100
  },
  "readiness_level": "ready"/"needs_revision"/"not_ready",
  "summary": "总体评价摘要",
  "recommendations": ["建议1", "建议2", ...]
}`;

  // Call LLM for evaluation
  const { callLLM } = await import('@/lib/llm/client');
  type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string };
  const messages: LLMMessage[] = [
    { role: 'system', content: '你是一个专业的小说编辑，擅长从出版角度评估小说质量，能够准确识别需要修改的问题并提出建设性建议。' },
    { role: 'user', content: userPrompt },
  ];
  const response = await callLLM(messages, {
    temperature: 0.4,
    maxTokens: 8192,
  });

  return parsePublishabilityResponse(response);
}

// ============================================================
// Response Parsing
// ============================================================

function parsePublishabilityResponse(response: string): PublishabilityEvaluation {
  const defaultResult: PublishabilityEvaluation = {
    overall_score: 0,
    dimension_scores: {
      plot_coherence: 0,
      character_consistency: 0,
      language_quality: 0,
      thematic_depth: 0,
      narrative_drive: 0,
    },
    readiness_level: 'not_ready',
    summary: '评估失败',
    recommendations: ['无法完成评估'],
  };

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(response);
    return {
      overall_score: parsed.overall_score ?? 0,
      dimension_scores: {
        plot_coherence: parsed.dimension_scores?.plot_coherence ?? 0,
        character_consistency: parsed.dimension_scores?.character_consistency ?? 0,
        language_quality: parsed.dimension_scores?.language_quality ?? 0,
        thematic_depth: parsed.dimension_scores?.thematic_depth ?? 0,
        narrative_drive: parsed.dimension_scores?.narrative_drive ?? 0,
      },
      readiness_level: parsed.readiness_level || 'not_ready',
      summary: parsed.summary || '评估完成',
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    };
  } catch {
    return defaultResult;
  }
}

// ============================================================
// Skill Interface Export
// ============================================================

export const publishabilitySkillId = 'publishability-skill';

export async function handlePublishabilitySkill(
  input: PublishabilitySkillInput,
  referenceExamples?: ReferenceExample[]
): Promise<SkillOutputSchema> {
  return executePublishabilitySkill(input, referenceExamples);
}

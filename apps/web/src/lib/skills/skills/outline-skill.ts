/**
 * Outline Skill - Book outline generation with narrative framework references
 *
 * Wraps outline-agent with:
 * - Reference example injection from narrative-framework library
 * - Narrative structure guidance
 */

import type {
  OutlineSkillInput,
  OutlineSkillOutput,
  SkillOutputSchema,
  ReferenceExample,
} from '../skill-interface';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';
import { projectStore } from '@/lib/db/projects-store';
import { loadCollection, saveCollection } from '@/lib/db/file-storage';
import { retrieveReferenceExamples } from '../reference-library-store';
import type { BookOutline } from '@packages/shared-types';

// ============================================================
// Skill Implementation
// ============================================================

export async function executeOutlineSkill(
  input: OutlineSkillInput,
  referenceExamples?: ReferenceExample[]
): Promise<SkillOutputSchema> {
  const { projectId, targetLength = 'mid', volumeCount = 3 } = input;

  try {
    // Build grounding context
    const groundingPack = await buildGroundingPack(projectId, {
      includeLore: true,
      includeNarrative: true,
      includeStyle: true,
      includeConstraints: true,
    });

    // Get project charter
    const charter = await projectStore.getCharter(projectId);
    const project = await projectStore.getById(projectId);

    // Retrieve reference examples if not provided
    const examples = referenceExamples ?? retrieveReferenceExamples({
      libraryId: 'narrative-framework',
      mode: 'hybrid',
      maxExamples: 5,
      minQualityScore: 80,
    });

    // Generate outline using existing outline-agent logic
    const outline = await generateOutline({
      projectId,
      title: project?.name ?? 'Untitled',
      charter,
      targetLength,
      volumeCount,
      groundingPack,
      referenceExamples: examples,
    });

    // Persist outline
    const existingOutlines = loadCollection<BookOutline>('outlines');
    const outlineIndex = existingOutlines.findIndex((o) => o.projectId === projectId);
    if (outlineIndex >= 0) {
      existingOutlines[outlineIndex] = outline;
    } else {
      existingOutlines.push(outline);
    }
    saveCollection('outlines', existingOutlines);

    // Map to output schema
    const output: OutlineSkillOutput = {
      status: 'completed',
      deliverable: {
        volumes: outline.volumes.map((v) => ({
          id: v.id,
          title: v.title,
          goal: v.goal,
          chapters: v.chapters.map((c) => ({
            id: c.id,
            title: c.title,
            chapterGoal: c.chapterGoal ?? '',
          })),
        })),
      },
    };

    return output;
  } catch (error) {
    console.error('[OutlineSkill] Execution error:', error);
    return {
      status: 'failed',
      deliverable: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================
// Outline Generation
// ============================================================

interface GenerateOutlineParams {
  projectId: string;
  title: string;
  charter?: Record<string, unknown>;
  targetLength: 'short' | 'mid' | 'long';
  volumeCount: number;
  groundingPack: string;
  referenceExamples: ReferenceExample[];
}

async function generateOutline(params: GenerateOutlineParams): Promise<BookOutline> {
  const { projectId, title, charter, targetLength, volumeCount, groundingPack, referenceExamples } = params;

  // Build narrative structure guidance from reference examples
  const narrativeGuidance = referenceExamples
    .map((ex) => `【${ex.title}】\n${ex.content}\n`)
    .join('\n---\n');

  // Map target length to approximate word count
  const lengthMap = {
    short: { min: 50000, max: 80000, volumes: Math.min(2, volumeCount) },
    mid: { min: 80000, max: 150000, volumes: volumeCount },
    long: { min: 150000, max: 300000, volumes: volumeCount + 1 },
  };
  const config = lengthMap[targetLength];

  // Build prompt for outline generation
  const userPrompt = `## 任务：生成小说大纲

### 基本信息
- 书名：《${title}》
- 类型：${targetLength === 'short' ? '短篇' : targetLength === 'mid' ? '中篇' : '长篇'}
- 目标字数：${config.min.toLocaleString()}-${config.max.toLocaleString()}字
- 卷数：${config.volumes}

### 主题与冲突
${charter ? JSON.stringify(charter, null, 2) : '未提供 charter，请根据书名和类型自行推断'}

### 叙事结构参考
${narrativeGuidance || '无参考样本，请运用经典叙事结构'}

### 世界观/设定背景
${groundingPack}

请生成包含 ${config.volumes} 卷的完整大纲，每卷包含章节标题和章节目标。`;

  // Call LLM for outline generation
  const { callLLM } = await import('@/lib/llm/client');
  type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string };
  const messages: LLMMessage[] = [
    { role: 'system', content: '你是一个专业的小说大纲设计师，擅长构建叙事骨架、伏笔系统和人物成长弧线。' },
    { role: 'user', content: userPrompt },
  ];
  const response = await callLLM(messages, {
    temperature: 0.7,
    maxTokens: 8192,
  });

  // Parse response into BookOutline structure
  return parseOutlineResponse(response, projectId, config.volumes);
}

// ============================================================
// Response Parsing
// ============================================================

function parseOutlineResponse(
  response: string,
  projectId: string,
  targetVolumeCount: number
): BookOutline {
  const volumes = [];

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed.volumes)) {
      return {
        projectId,
        volumes: parsed.volumes.map((v: { title: string; goal?: string; chapters?: Array<{ title: string; chapterGoal?: string }> }) => ({
          id: crypto.randomUUID(),
          title: v.title || `卷${volumes.length + 1}`,
          goal: v.goal || '',
          chapters: (v.chapters || []).map((c) => ({
            id: crypto.randomUUID(),
            title: c.title || `第${volumes.length + 1}章`,
            chapterGoal: c.chapterGoal || '',
          })),
        })),
      };
    }
  } catch {
    // Fall through to text parsing
  }

  // Text-based parsing fallback
  const volumeSections = response.split(/(?:^|\n)(?=第[一二三四五六七八九十]+卷|第[0-9]+卷|卷[一二三四五六七八九十]+)/m);

  for (let i = 0; i < Math.min(volumeSections.length, targetVolumeCount); i++) {
    const section = volumeSections[i].trim();
    if (!section) continue;

    const lines = section.split('\n').filter(Boolean);
    const titleMatch = section.match(/(?:第[一二三四五六七八九十]+卷|第[0-9]+卷|卷[一二三四五六七八九十]+)[：:]\s*(.+)/);
    const volumeTitle = titleMatch?.[1] ?? `卷${i + 1}`;

    const chapters = [];
    const chapterMatches = section.matchAll(/(?:第[零一二三四五六七八九十百千0-9]+章)[：:]\s*(.+)/g);
    for (const match of chapterMatches) {
      chapters.push({
        id: crypto.randomUUID(),
        title: match[1].trim(),
        chapterGoal: '',
      });
    }

    volumes.push({
      id: crypto.randomUUID(),
      title: volumeTitle,
      goal: '',
      chapters: chapters.length > 0 ? chapters : [{ id: crypto.randomUUID(), title: `第${i + 1}章`, chapterGoal: '' }],
    });
  }

  // Ensure we have at least one volume
  if (volumes.length === 0) {
    volumes.push({
      id: crypto.randomUUID(),
      title: '第一卷',
      goal: '',
      chapters: [{ id: crypto.randomUUID(), title: '第一章', chapterGoal: '' }],
    });
  }

  return {
    projectId,
    volumes,
  };
}

// ============================================================
// Skill Interface Export
// ============================================================

export const outlineSkillId = 'outline-skill';

export async function handleOutlineSkill(
  input: OutlineSkillInput,
  referenceExamples?: ReferenceExample[]
): Promise<SkillOutputSchema> {
  return executeOutlineSkill(input, referenceExamples);
}

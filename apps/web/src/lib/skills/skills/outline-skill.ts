/**
 * Outline Skill - Book outline generation with reference guidance.
 *
 * Skill files should only generate artifacts. Persistence is handled by the
 * unified workflow layer.
 */

import type {
  OutlineSkillInput,
  OutlineSkillOutput,
  SkillOutputSchema,
  ReferenceExample,
} from '../skill-interface';
import { buildGroundingPack, type GroundingPack } from '@/lib/retrieval/grounding-pack';
import { projectStore } from '@/lib/db/projects-store';
import { retrieveReferenceExamples } from '../reference-library-store';
import type { BookOutline, ProjectCharter } from '@packages/shared-types';

interface GenerateOutlineParams {
  projectId: string;
  title: string;
  charter?: ProjectCharter;
  targetLength: 'short' | 'mid' | 'long';
  volumeCount: number;
  groundingPack: GroundingPack;
  referenceExamples: ReferenceExample[];
}

export async function executeOutlineSkill(
  input: OutlineSkillInput,
  referenceExamples?: ReferenceExample[]
): Promise<SkillOutputSchema> {
  try {
    const outline = await generateOutlineSkillOutline(input, referenceExamples);
    const output: OutlineSkillOutput = {
      status: 'completed',
      deliverable: {
        volumes: outline.volumes.map((volume) => ({
          id: volume.id,
          title: volume.title,
          goal: volume.goal,
          chapters: volume.chapters.map((chapter) => ({
            id: chapter.id,
            title: chapter.title,
            chapterGoal: chapter.chapterGoal ?? '',
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

export async function generateOutlineSkillOutline(
  input: OutlineSkillInput,
  referenceExamples?: ReferenceExample[]
): Promise<BookOutline> {
  const { projectId, targetLength = 'mid', volumeCount = 3, reference_examples: inputExamples } = input;

  const groundingPack = await buildGroundingPack(projectId);

  const charter = await projectStore.getCharter(projectId);
  const project = await projectStore.getById(projectId);
  const examples =
    referenceExamples ??
    inputExamples ??
    retrieveReferenceExamples({
      libraryId: 'narrative-framework',
      mode: 'hybrid',
      maxExamples: 5,
      minQualityScore: 80,
    });

  return generateOutline({
    projectId,
    title: project?.title ?? 'Untitled',
    charter: charter ?? undefined,
    targetLength,
    volumeCount,
    groundingPack,
    referenceExamples: examples,
  });
}

async function generateOutline(params: GenerateOutlineParams): Promise<BookOutline> {
  const { projectId, title, charter, targetLength, volumeCount, groundingPack, referenceExamples } = params;

  const narrativeGuidance = referenceExamples
    .map((example) => `${example.title}\n${example.content}`)
    .join('\n---\n');

  const lengthMap = {
    short: { min: 50000, max: 80000, volumes: Math.min(2, volumeCount) },
    mid: { min: 80000, max: 150000, volumes: volumeCount },
    long: { min: 150000, max: 300000, volumes: volumeCount + 1 },
  };
  const config = lengthMap[targetLength];

  const groundingText = JSON.stringify(groundingPack, null, 2);

  const userPrompt = `## 任务：生成小说大纲
### 基本信息
- 书名：${title}
- 类型：${targetLength === 'short' ? '短篇' : targetLength === 'mid' ? '中篇' : '长篇'}
- 目标字数：${config.min.toLocaleString()}-${config.max.toLocaleString()}
- 卷数：${config.volumes}

### 主题与冲突
${charter ? JSON.stringify(charter, null, 2) : '未提供 charter，请根据书名和类型推断'}

### 叙事结构参考
${narrativeGuidance || '无额外参考样本'}

### 世界观与设定背景
${groundingText}

请生成包含完整分卷与章节规划的大纲，章节至少提供：
- 标题
- chapterGoal
- mainEvents
- characterProgress
- hook

返回 JSON。`;

  const { callLLM } = await import('@/lib/llm/client');
  type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string };
  const messages: LLMMessage[] = [
    {
      role: 'system',
      content:
        '你是专业的大纲设计师，输出必须是结构化 JSON，包含完整分卷目标、章节目标、主要事件与结尾钩子。',
    },
    { role: 'user', content: userPrompt },
  ];
  const response = await callLLM(messages, {
    temperature: 0.7,
    maxTokens: 8192,
  });

  return parseOutlineResponse(response, projectId, config.volumes);
}

function parseOutlineResponse(
  response: string,
  projectId: string,
  targetVolumeCount: number
): BookOutline {
  try {
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed.volumes)) {
      return {
        projectId,
        volumes: parsed.volumes.map(
          (
            volume: {
              title?: string;
              goal?: string;
              conflict?: string;
              result?: string;
              color?: string;
              chapters?: Array<{
                title?: string;
                chapterGoal?: string;
                mainEvents?: string;
                characterProgress?: string;
                hook?: string;
              }>;
            },
            index: number
          ) => ({
            id: crypto.randomUUID(),
            title: volume.title || `第${index + 1}卷`,
            goal: volume.goal || '',
            conflict: volume.conflict || '',
            result: volume.result || '',
            color: volume.color || 'bg-slate-500',
            chapters: (volume.chapters || []).map((chapter, chapterIndex) => ({
              id: crypto.randomUUID(),
              title: chapter.title || `第${chapterIndex + 1}章`,
              chapterGoal: chapter.chapterGoal || '',
              mainEvents: chapter.mainEvents || '',
              characterProgress: chapter.characterProgress || '',
              hook: chapter.hook || '',
            })),
          })
        ),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  } catch {
    // Fall through to minimal fallback.
  }

  return {
    projectId,
    volumes: Array.from({ length: Math.max(targetVolumeCount, 1) }, (_, index) => ({
      id: crypto.randomUUID(),
      title: `第${index + 1}卷`,
      goal: '',
      conflict: '',
      result: '',
      color: 'bg-slate-500',
      chapters: [
        {
          id: crypto.randomUUID(),
          title: `第${index + 1}章`,
          chapterGoal: '',
          mainEvents: response.slice(0, 120),
          characterProgress: '',
          hook: '',
        },
      ],
    })),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export const outlineSkillId = 'outline-skill';

export async function handleOutlineSkill(
  input: OutlineSkillInput,
  referenceExamples?: ReferenceExample[]
): Promise<SkillOutputSchema> {
  return executeOutlineSkill(input, referenceExamples);
}

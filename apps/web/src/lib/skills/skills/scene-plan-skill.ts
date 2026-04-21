/**
 * Scene Plan Skill - Scene card generation with visual lens references
 *
 * Wraps scene-planner-agent with:
 * - Reference example injection from visual-lens library
 * - Scene structure guidance
 */

import type {
  ScenePlanSkillInput,
  ScenePlanSkillOutput,
  SkillOutputSchema,
  ReferenceExample,
} from '../skill-interface';
import { buildGroundingPack, type GroundingPack } from '@/lib/retrieval/grounding-pack';
import { chapterStore } from '@/lib/db/projects-store';
import { retrieveReferenceExamples } from '../reference-library-store';
import type { BookOutline } from '@packages/shared-types';
import { loadCollection } from '@/lib/db/file-storage';

// ============================================================
// Skill Implementation
// ============================================================

export async function executeScenePlanSkill(
  input: ScenePlanSkillInput,
  referenceExamples?: ReferenceExample[]
): Promise<SkillOutputSchema> {
  const { projectId, chapterId, chapterTitle, chapterGoal, reference_examples: inputExamples } = input;

  try {
    // Build grounding context
    const groundingPack = await buildGroundingPack(projectId);

    // Get chapter info
    const chapter = await chapterStore.getById(chapterId);
    const outline = loadCollection<BookOutline>('outlines').find((o) => o.projectId === projectId);
    const volume = outline?.volumes.find((v) => v.id === chapter?.parentVolumeId);
    const outlineChapter = volume?.chapters.find((c) => c.title === chapterTitle);

    // Retrieve reference examples from visual-lens library
    const examples = referenceExamples ?? inputExamples ?? retrieveReferenceExamples({
      libraryId: 'visual-lens',
      mode: 'hybrid',
      maxExamples: 5,
    });

    // Generate scene plan
    const scenes = await generateScenePlan({
      projectId,
      chapterId,
      chapterTitle,
      chapterGoal: chapterGoal || outlineChapter?.chapterGoal || '',
      volumeGoal: volume?.goal || '',
      groundingPack,
      referenceExamples: examples,
    });

    // Map to output schema
    const output: ScenePlanSkillOutput = {
      status: 'completed',
      deliverable: {
        scenes: scenes.map((s) => ({
          id: s.id,
          title: s.title,
          summary: s.summary,
          viewpointCharacterId: s.viewpointCharacterId,
          goal: s.goal,
          conflict: s.conflict,
          expectedOutcome: s.expectedOutcome,
        })),
      },
    };

    return output;
  } catch (error) {
    console.error('[ScenePlanSkill] Execution error:', error);
    return {
      status: 'failed',
      deliverable: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================
// Scene Plan Generation
// ============================================================

interface ScenePlanParams {
  projectId: string;
  chapterId: string;
  chapterTitle: string;
  chapterGoal: string;
  volumeGoal: string;
  groundingPack: GroundingPack;
  referenceExamples: ReferenceExample[];
}

interface GeneratedScene {
  id: string;
  title: string;
  summary: string;
  viewpointCharacterId?: string;
  goal?: string;
  conflict?: string;
  expectedOutcome?: string;
}

async function generateScenePlan(params: ScenePlanParams): Promise<GeneratedScene[]> {
  const { chapterTitle, chapterGoal, volumeGoal, groundingPack, referenceExamples } = params;
  const groundingText = JSON.stringify(groundingPack, null, 2);

  // Build visual guidance from reference examples
  const visualGuidance = referenceExamples
    .map((ex) => `【${ex.title}】\n${ex.content}\n`)
    .join('\n---\n');

  const userPrompt = `## 任务：生成章节场景规划

### 章节信息
- 章节标题：${chapterTitle}
- 章节目标：${chapterGoal || '请根据标题推断'}
- 分卷目标：${volumeGoal || '请根据章节目标推断'}

### 场景描写参考
${visualGuidance || '无参考样本，请运用经典场景描写技法'}

### 世界观/设定背景
${groundingText}

请为此章节生成 3-5 个场景规划，每个场景包含：标题、摘要、视角人物、目标、冲突、预期结果。`;

  // Call LLM for scene plan generation
  const { callLLM } = await import('@/lib/llm/client');
  type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string };
  const messages: LLMMessage[] = [
    { role: 'system', content: '你是一个专业的小说场景设计师，擅长构建场景的视觉画面、节奏感和情感冲击力。' },
    { role: 'user', content: userPrompt },
  ];
  const response = await callLLM(messages, {
    temperature: 0.7,
    maxTokens: 8192,
  });

  return parseScenePlanResponse(response);
}

// ============================================================
// Response Parsing
// ============================================================

function parseScenePlanResponse(response: string): GeneratedScene[] {
  const scenes: GeneratedScene[] = [];

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed.scenes)) {
      return parsed.scenes.map((s: Partial<GeneratedScene>) => ({
        id: s.id || crypto.randomUUID(),
        title: s.title || '未命名场景',
        summary: s.summary || '',
        viewpointCharacterId: s.viewpointCharacterId,
        goal: s.goal,
        conflict: s.conflict,
        expectedOutcome: s.expectedOutcome,
      }));
    }
    if (Array.isArray(parsed)) {
      return parsed.map((s: Partial<GeneratedScene>) => ({
        id: s.id || crypto.randomUUID(),
        title: s.title || '未命名场景',
        summary: s.summary || '',
        viewpointCharacterId: s.viewpointCharacterId,
        goal: s.goal,
        conflict: s.conflict,
        expectedOutcome: s.expectedOutcome,
      }));
    }
  } catch {
    // Fall through to text parsing
  }

  // Text-based parsing fallback
  const sceneBlocks = response.split(/(?:^|\n)(?=场景[0-9一二三四五六七八九十]+|第[0-9]+场)/m);

  for (const block of sceneBlocks) {
    if (!block.trim()) continue;

    const titleMatch = block.match(/标题[：:]\s*(.+)/) || block.match(/^【?(.+?)】?\s*$/);
    const summaryMatch =
      block.match(/摘要[：:]\s*([\s\S]+)/) || block.match(/内容[：:]\s*([\s\S]+)/);
    const viewpointMatch = block.match(/视角[人物]*[：:]\s*(.+)/);
    const goalMatch = block.match(/目标[：:]\s*(.+)/);
    const conflictMatch = block.match(/冲突[：:]\s*(.+)/);
    const outcomeMatch = block.match(/预期[结果]*[：:]\s*(.+)/);

    const title = titleMatch?.[1]?.trim() || '未命名场景';
    const summary = summaryMatch?.[1]?.trim() || block.slice(0, 100).trim();

    scenes.push({
      id: crypto.randomUUID(),
      title,
      summary,
      viewpointCharacterId: viewpointMatch?.[1]?.trim(),
      goal: goalMatch?.[1]?.trim(),
      conflict: conflictMatch?.[1]?.trim(),
      expectedOutcome: outcomeMatch?.[1]?.trim(),
    });
  }

  // Ensure we have at least one scene
  if (scenes.length === 0) {
    scenes.push({
      id: crypto.randomUUID(),
      title: '场景1',
      summary: response.slice(0, 200).trim(),
    });
  }

  return scenes;
}

// ============================================================
// Skill Interface Export
// ============================================================

export const scenePlanSkillId = 'scene-plan-skill';

export async function handleScenePlanSkill(
  input: ScenePlanSkillInput,
  referenceExamples?: ReferenceExample[]
): Promise<SkillOutputSchema> {
  return executeScenePlanSkill(input, referenceExamples);
}

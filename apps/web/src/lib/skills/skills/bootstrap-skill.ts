/**
 * Bootstrap Skill - Project initialization with charter and memory generation
 *
 * Wraps bootstrap-agent with:
 * - Charter generation (theme, conflict, target audience, style keywords)
 * - Memory system initialization (world, narrative, style, canon)
 * - Project metadata setup
 */

import type {
  BootstrapSkillInput,
  BootstrapSkillOutput,
  SkillOutputSchema,
} from '../skill-interface';
import { projectStore } from '@/lib/db/projects-store';
import { loadCollection } from '@/lib/db/file-storage';

// ============================================================
// Skill Implementation
// ============================================================

export async function executeBootstrapSkill(
  input: BootstrapSkillInput
): Promise<SkillOutputSchema> {
  const {
    projectId,
    title,
    bookType,
    targetLength,
    language = '中文',
    tags = [],
    description,
  } = input;

  try {
    // Generate charter and memories
    const bootstrapResult = await generateBootstrap({
      projectId,
      title,
      bookType,
      targetLength,
      language,
      tags,
      description,
    });

    // Persist charter
    await projectStore.saveCharter(projectId, bootstrapResult.charter);

    // Persist memories
    for (const memory of bootstrapResult.memories) {
      await projectStore.addMemory(projectId, memory.memoryType, memory.key, memory.content);
    }

    // Update project status
    const project = await projectStore.getById(projectId);
    if (project) {
      await projectStore.update(projectId, {
        status: 'active',
        name: title,
        description: description || bootstrapResult.charter.coreConflict,
      });
    }

    // Map to output schema
    const output: BootstrapSkillOutput = {
      status: 'completed',
      deliverable: {
        charter: bootstrapResult.charter,
        memories: bootstrapResult.memories,
      },
    };

    return output;
  } catch (error) {
    console.error('[BootstrapSkill] Execution error:', error);
    return {
      status: 'failed',
      deliverable: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================
// Bootstrap Generation
// ============================================================

interface BootstrapParams {
  projectId: string;
  title: string;
  bookType: string;
  targetLength: string;
  language: string;
  tags: string[];
  description?: string;
}

interface BootstrapResult {
  charter: {
    theme: string;
    coreConflict: string;
    targetAudience: string;
    viewpoint?: string;
    styleKeywords: string[];
    forbiddenRules: string[];
    writingGoals: string[];
  };
  memories: Array<{
    memoryType: 'world' | 'narrative' | 'style' | 'canon';
    key: string;
    content: Record<string, unknown>;
  }>;
}

async function generateBootstrap(params: BootstrapParams): Promise<BootstrapResult> {
  const { title, bookType, targetLength, language, tags, description } = params;

  const userPrompt = `## 任务：项目初始化 - 生成创作宪章与记忆系统

### 基本信息
- 书名：《${title}》
- 类型：${bookType}
- 目标篇幅：${targetLength}
- 语言：${language}
- 标签：${tags.join(', ') || '无'}
- 简介：${description || '未提供，请根据书名和类型推断'}

请根据以上信息，生成完整的创作宪章和记忆系统。

### 创作宪章 (Charter)
必须包含：
- theme: 核心主题（一句话概括本书要表达的核心思想）
- coreConflict: 核心冲突（本书最主要的矛盾是什么）
- targetAudience: 目标读者（本书面向哪类读者）
- viewpoint: 叙事视角（如有）
- styleKeywords: 风格关键词（5-10个词概括本书风格）
- forbiddenRules: 禁忌规则（本书避免出现什么）
- writingGoals: 写作目标（本书要达成什么）

### 记忆系统 (Memory System)
必须包含四类记忆，每类至少2-3条：
- world: 世界观记忆（背景设定、规则）
- narrative: 叙事记忆（故事线、伏笔）
- style: 风格记忆（语言风格、叙事偏好）
- canon: 典实记忆（重要事件、人物关系）

返回 JSON 格式：
{
  "charter": {
    "theme": "...",
    "coreConflict": "...",
    "targetAudience": "...",
    "viewpoint": "...",
    "styleKeywords": [...],
    "forbiddenRules": [...],
    "writingGoals": [...]
  },
  "memories": [
    {"memoryType": "world", "key": "...", "content": {...}},
    {"memoryType": "narrative", "key": "...", "content": {...}},
    {"memoryType": "style", "key": "...", "content": {...}},
    {"memoryType": "canon", "key": "...", "content": {...}}
  ]
}`;

  // Call LLM for bootstrap generation
  const { callLLM } = await import('@/lib/llm/client');
  type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string };
  const messages: LLMMessage[] = [
    { role: 'system', content: '你是一个专业的小说策划专家，擅长从零开始构建小说的世界观、主题和叙事框架。你有深厚的文学素养，能够为不同类型的小说设计独特的创作宪章。' },
    { role: 'user', content: userPrompt },
  ];
  const response = await callLLM(messages, {
    temperature: 0.8,
    maxTokens: 16384,
  });

  return parseBootstrapResponse(response);
}

// ============================================================
// Response Parsing
// ============================================================

function parseBootstrapResponse(response: string): BootstrapResult {
  const defaultResult: BootstrapResult = {
    charter: {
      theme: '待定义',
      coreConflict: '待定义',
      targetAudience: '待定义',
      styleKeywords: [],
      forbiddenRules: [],
      writingGoals: [],
    },
    memories: [],
  };

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(response);
    return {
      charter: {
        theme: parsed.charter?.theme || defaultResult.charter.theme,
        coreConflict: parsed.charter?.coreConflict || defaultResult.charter.coreConflict,
        targetAudience: parsed.charter?.targetAudience || defaultResult.charter.targetAudience,
        viewpoint: parsed.charter?.viewpoint,
        styleKeywords: Array.isArray(parsed.charter?.styleKeywords) ? parsed.charter.styleKeywords : defaultResult.charter.styleKeywords,
        forbiddenRules: Array.isArray(parsed.charter?.forbiddenRules) ? parsed.charter.forbiddenRules : defaultResult.charter.forbiddenRules,
        writingGoals: Array.isArray(parsed.charter?.writingGoals) ? parsed.charter.writingGoals : defaultResult.charter.writingGoals,
      },
      memories: Array.isArray(parsed.memories) ? parsed.memories : defaultResult.memories,
    };
  } catch {
    return defaultResult;
  }
}

// ============================================================
// Skill Interface Export
// ============================================================

export const bootstrapSkillId = 'bootstrap-skill';

export async function handleBootstrapSkill(
  input: BootstrapSkillInput
): Promise<SkillOutputSchema> {
  return executeBootstrapSkill(input);
}

/**
 * Bootstrap Skill - Project initialization with charter and memory generation
 *
 * Skill files should focus on generation only. Workflow persistence is handled
 * by the unified workflow layer.
 */

import type {
  BootstrapSkillInput,
  BootstrapSkillOutput,
  SkillOutputSchema,
} from '../skill-interface';

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

export async function executeBootstrapSkill(
  input: BootstrapSkillInput
): Promise<SkillOutputSchema> {
  try {
    const deliverable = await generateBootstrapSkillDeliverable(input);
    const output: BootstrapSkillOutput = {
      status: 'completed',
      deliverable,
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

export async function generateBootstrapSkillDeliverable(
  input: BootstrapSkillInput
): Promise<BootstrapSkillOutput['deliverable']> {
  const {
    projectId,
    title,
    bookType,
    targetLength,
    language = '中文',
    tags = [],
    description,
  } = input;

  const bootstrapResult = await generateBootstrap({
    projectId,
    title,
    bookType,
    targetLength,
    language,
    tags,
    description,
  });

  return {
    charter: bootstrapResult.charter,
    memories: bootstrapResult.memories,
  };
}

async function generateBootstrap(params: BootstrapParams): Promise<BootstrapResult> {
  const { title, bookType, targetLength, language, tags, description } = params;

  const userPrompt = `## 任务：项目初始化 - 生成创作宪章与记忆系统
### 基本信息
- 书名：${title}
- 类型：${bookType}
- 目标篇幅：${targetLength}
- 语言：${language}
- 标签：${tags.join(', ') || '无'}
- 简介：${description || '未提供，请根据书名和类型推断'}

请根据以上信息，生成完整的创作宪章和记忆系统。
### 创作宪章 (Charter)
必须包含：
- theme: 核心主题
- coreConflict: 核心冲突
- targetAudience: 目标读者
- viewpoint: 叙事视角（如有）
- styleKeywords: 风格关键词
- forbiddenRules: 禁忌规则
- writingGoals: 写作目标

### 记忆系统 (Memory System)
必须包含四类记忆：
- world
- narrative
- style
- canon

返回 JSON 格式。`;

  const { callLLM } = await import('@/lib/llm/client');
  type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string };
  const messages: LLMMessage[] = [
    {
      role: 'system',
      content:
        '你是专业的小说策划顾问，负责生成项目 charter 与初始记忆，输出必须是结构化 JSON。',
    },
    { role: 'user', content: userPrompt },
  ];
  const response = await callLLM(messages, {
    temperature: 0.8,
    maxTokens: 16384,
  });

  return parseBootstrapResponse(response);
}

function parseBootstrapResponse(response: string): BootstrapResult {
  try {
    const parsed = JSON.parse(response);

    if (!parsed.charter) {
      throw new Error('Bootstrap response missing charter object');
    }

    return {
      charter: {
        theme: parsed.charter?.theme || '待定义',
        coreConflict: parsed.charter?.coreConflict || '待定义',
        targetAudience: parsed.charter?.targetAudience || '待定义',
        viewpoint: parsed.charter?.viewpoint,
        styleKeywords: Array.isArray(parsed.charter?.styleKeywords) ? parsed.charter.styleKeywords : [],
        forbiddenRules: Array.isArray(parsed.charter?.forbiddenRules) ? parsed.charter.forbiddenRules : [],
        writingGoals: Array.isArray(parsed.charter?.writingGoals) ? parsed.charter.writingGoals : [],
      },
      memories: Array.isArray(parsed.memories) ? parsed.memories : [],
    };
  } catch (error) {
    throw new Error(
      `Failed to parse bootstrap response: ${
        error instanceof Error ? error.message : String(error)
      }. Response: ${response.slice(0, 200)}`
    );
  }
}

export const bootstrapSkillId = 'bootstrap-skill';

export async function handleBootstrapSkill(
  input: BootstrapSkillInput
): Promise<SkillOutputSchema> {
  return executeBootstrapSkill(input);
}

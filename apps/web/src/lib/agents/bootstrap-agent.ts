/**
 * Bootstrap Agent
 *
 * Generates project charter and initial context for a new project.
 * Creates memories for world settings, narrative, characters, and style guidelines.
 */

import { CreateProjectInput } from '@packages/shared-types';
import { callLLM, parseJSONResponse, LLMMessage } from '@/lib/llm';

export interface BootstrapInput extends CreateProjectInput {
  projectId: string;
}

export interface BootstrapOutput {
  charter: {
    theme?: string;
    coreConflict?: string;
    targetAudience?: string;
    viewpoint?: string;
    styleKeywords: string[];
    forbiddenRules: string[];
    writingGoals: string[];
  };
  memories: {
    memoryType: 'world' | 'narrative' | 'style' | 'canon';
    key: string;
    content: {
      text?: string;
      facts?: string[];
      rules?: string[];
      locations?: { id: string; name: string; description: string }[];
      characters?: { id: string; name: string; description: string; role: string }[];
      events?: { id: string; title: string; description: string; importance: 'minor' | 'major' | 'critical' }[];
      metadata?: Record<string, unknown>;
    };
  }[];
}

/**
 * Generate project charter and initial memories
 */
export async function bootstrapAgent(input: BootstrapInput): Promise<BootstrapOutput> {
  const systemPrompt = buildBootstrapSystemPrompt();
  const userPrompt = buildBootstrapUserPrompt(input);

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callLLM(messages, {
    temperature: 0.7,
    maxTokens: 16384,
  });

  const result = parseJSONResponse<BootstrapOutput>(response);

  return result;
}

function buildBootstrapSystemPrompt(): string {
  return `You are an expert fiction consultant specializing in Chinese literary novels.
Your task is to help establish a new fiction project's foundational context.

When creating a new project, you need to generate:

1. **Charter Information**:
   - Theme and core conflict
   - Target audience
   - Suggested viewpoint
   - Style keywords (3-5 distinctive features)
   - Writing goals (2-3 achievable objectives)
   - Forbidden rules (things to avoid)

2. **World Setting Memories** (memoryType: 'world'):
   - World facts and background
   - Rules that govern the world
   - Key locations with descriptions

3. **Narrative Memories** (memoryType: 'narrative'):
   - Major characters (name, description, role)
   - Important events and plot points

4. **Style Guidelines** (memoryType: 'style'):
   - Writing style keywords
   - Forbidden rules (what to avoid)
   - Example passages (if provided)

5. **Canon Facts** (memoryType: 'canon'):
   - Verified timeline facts
   - Important canon information

Please provide comprehensive but concise information that will help maintain consistency throughout the writing process.`;
}

function buildBootstrapUserPrompt(input: BootstrapInput): string {
  let prompt = `请为以下小说项目生成 Charter 和初始设定：\n\n`;

  prompt += `【项目标题】${input.title}\n`;
  prompt += `【书籍类型】${input.bookType}\n`;
  prompt += `【目标篇幅】${input.targetLength}\n`;
  prompt += `【语言】${input.language}\n`;

  if (input.tags && input.tags.length > 0) {
    prompt += `【标签】${input.tags.join('、')}\n`;
  }

  if (input.description) {
    prompt += `【内容描述】\n${input.description}\n`;
  }

  if (input.viewpoint) {
    prompt += `【叙事视角】${input.viewpoint}\n`;
  }

  if (input.targetAudience) {
    prompt += `【目标读者】${input.targetAudience}\n`;
  }

  if (input.styleKeywords && input.styleKeywords.length > 0) {
    prompt += `【风格关键词】${input.styleKeywords.join('、')}\n`;
  }

  prompt += `\n请以 JSON 格式返回：\n`;
  prompt += `{
  "charter": {
    "theme": "核心主题（1-2句话）",
    "coreConflict": "核心冲突（1-2句话）",
    "targetAudience": "目标读者",
    "viewpoint": "推荐叙事视角",
    "styleKeywords": ["关键词1", "关键词2", ...],
    "forbiddenRules": ["禁忌1", "禁忌2", ...],
    "writingGoals": ["目标1", "目标2", ...]
  },
  "memories": [
    {
      "memoryType": "world",
      "key": "世界设定",
      "content": {
        "facts": ["事实1", "事实2", ...],
        "rules": ["规则1", "规则2", ...],
        "locations": [
          {"id": "uuid1", "name": "地点名称", "description": "地点描述"}
        ]
      }
    },
    {
      "memoryType": "narrative",
      "key": "人物设定",
      "content": {
        "characters": [
          {"id": "uuid1", "name": "人物名", "description": "人物描述", "role": "角色类型"}
        ],
        "events": [
          {"id": "uuid2", "title": "事件名", "description": "事件描述", "importance": "major"}
        ]
      }
    },
    {
      "memoryType": "style",
      "key": "风格指南",
      "content": {
        "metadata": {
          "keywords": ["风格词1", "风格词2"],
          "tone": "整体基调"
        }
      }
    },
    {
      "memoryType": "canon",
      "key": "时间线",
      "content": {
        "facts": ["事实1", "事实2"]
      }
    }
  ]
}\n`;

  return prompt;
}

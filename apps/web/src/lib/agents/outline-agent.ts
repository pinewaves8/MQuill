import { Project, ProjectCharter } from '@packages/shared-types';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';
import { callLLM, LLMMessage } from '@/lib/llm';

export interface VolumeOutline {
  id: string;
  title: string;
  goal: string;
  conflict: string;
  result: string;
  color: string;
  chapters: ChapterOutline[];
}

export interface ChapterOutline {
  id: string;
  title: string;
  chapterGoal: string;
  mainEvents: string;
  characterProgress: string;
  hook: string;
}

export interface BookOutline {
  volumes: VolumeOutline[];
}

const DEFAULT_COLORS = [
  'bg-blue-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-purple-500',
  'bg-emerald-500',
];

export async function outlineAgent(
  project: Project,
  charter?: ProjectCharter | null
): Promise<BookOutline> {
  const grounding = await buildGroundingPack(project.id);

  let styleContext = '';
  if (grounding?.style.tone) {
    styleContext += `\n风格基调：${grounding.style.tone}`;
  }
  if (grounding?.style.keywords && grounding.style.keywords.length > 0) {
    styleContext += `\n风格关键词：${grounding.style.keywords.join('、')}`;
  }
  if (charter?.coreConflict) {
    styleContext += `\n核心冲突：${charter.coreConflict}`;
  }
  if (charter?.viewpoint) {
    styleContext += `\n叙事视角：${charter.viewpoint}`;
  }

  const systemPrompt = `你是一个专业的小说大纲规划师，擅长构建多卷长篇小说的结构。
你遵循"全书主线 → 分卷任务 → 章节功能 → 场景执行"的层次来组织故事。

【核心原则】
- 卷不是标题，而是阶段目标
- 每卷回答三个问题：本卷目标、本卷冲突、本卷结果
- 章节按功能分类：开卷引子章、调查/推进章、冲突章、关系章、反转章、卷末钩子章
- 一章至少承担1个核心功能${styleContext}`;

  const targetWordCount = project.targetLength === 'short' ? '3-5万字' : project.targetLength === 'mid' ? '8-15万字' : '20万字以上';
  const volumeCount = project.targetLength === 'short' ? 2 : project.targetLength === 'mid' ? 3 : 5;

  const userPrompt = `请为以下小说项目生成完整的分卷大纲：

【项目信息】
标题：${project.title}
类型：${project.bookType === 'novel' ? '长篇小说' : project.bookType === 'short' ? '短篇小说' : '系列作品'}
目标篇幅：${targetWordCount}
描述：${project.description || '暂无描述'}

${charter ? `【Charter设定】
主题：${charter.theme || '暂无'}
核心冲突：${charter.coreConflict || '暂无'}
叙事视角：${charter.viewpoint || '暂无'}
风格关键词：${charter.styleKeywords?.join('、') || '暂无'}
禁忌事项：${charter.forbiddenRules?.join('、') || '暂无'}` : ''}

请生成一个${volumeCount}卷的大纲，每个分卷包含：
- 卷标题（带副标题）
- 卷目标（这一卷结束时故事推进到哪里）
- 卷冲突（主要围绕什么矛盾展开）
- 卷结果（这一卷结尾发生什么变化）
- 章节规划（${volumeCount === 2 ? '6-8' : volumeCount === 3 ? '8-10' : '10-12'}章/卷）

章节格式：
### 第N章
- 章节目标：
- 主要事件：
- 人物推进：
- 结尾钩子：

请以JSON格式输出，结构如下：
{
  "volumes": [
    {
      "id": "vol1",
      "title": "第一卷：卷名",
      "goal": "卷目标",
      "conflict": "卷冲突",
      "result": "卷结果",
      "color": "bg-blue-500",
      "chapters": [
        {
          "id": "ch1",
          "title": "第一章：章名",
          "chapterGoal": "章节目标",
          "mainEvents": "主要事件",
          "characterProgress": "人物推进",
          "hook": "结尾钩子"
        }
      ]
    }
  ]
}

注意：
- 只需要输出JSON，不要有其他文字
- 章节数控制在建议范围内
- 颜色在以下选择：${DEFAULT_COLORS.join(', ')}`;

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callLLM(messages, {
    temperature: 0.6,
    maxTokens: 4096,
  });

  // Parse JSON from response
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      // Assign colors if not provided
      result.volumes.forEach((vol: VolumeOutline, idx: number) => {
        if (!vol.color) {
          vol.color = DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
        }
      });
      return result;
    }
  } catch (error) {
    console.error('Failed to parse outline JSON:', error);
  }

  // Fallback: return a basic structure
  return {
    volumes: Array.from({ length: volumeCount }, (_, i) => ({
      id: `vol${i + 1}`,
      title: `第${i + 1}卷：待命名`,
      goal: '待填充',
      conflict: '待填充',
      result: '待填充',
      color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      chapters: [],
    })),
  };
}

import { NextResponse } from 'next/server';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';
import { callLLM, LLMMessage } from '@/lib/llm';

interface SuggestInput {
  projectId?: string;
  text: string;
  suggestions?: string[];
  goals?: string[];
  constraints?: string[];
  applyMode?: string;
}

export async function POST(request: Request) {
  try {
    const body: SuggestInput = await request.json();
    const { projectId, text, suggestions = [], goals = [], constraints = [], applyMode = 'replace' } = body;

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const grounding = projectId ? await buildGroundingPack(projectId) : null;

    let styleContext = '';
    if (grounding?.style.tone) {
      styleContext += `\n风格基调：${grounding.style.tone}`;
    }
    if (grounding?.style?.keywords && grounding.style.keywords.length > 0) {
      styleContext += `\n风格关键词：${grounding.style.keywords.join('、')}`;
    }

    const systemPrompt = `你是一位资深小说编辑，擅长为小说文本制定全面的修订方案。${styleContext}`;

    const selectedSuggestions = suggestions.length > 0 ? `【已选修改建议】\n${suggestions.join('、')}\n\n` : '';
    const selectedGoals = goals.length > 0 ? `【已选修订目标】\n${goals.join('、')}\n\n` : '';
    const selectedConstraints = constraints.length > 0 ? `【已选保持不变】\n${constraints.join('、')}\n\n` : '';

    const userPrompt = `你是一个修订规划助手。根据原文和已选标签，为本次修订生成完整的参数方案。

${selectedSuggestions}${selectedGoals}${selectedConstraints}【应用方式】\n${applyMode === 'replace' ? '替换原文' : applyMode === 'append' ? '追加到文末' : '只存为分支'}

【原文】（选取部分）
${text.slice(0, 300)}

请生成以下内容（JSON格式输出）：
{
  "suggestion": "针对这段文本的主要修改建议，用一句话概括",
  "goals": ["建议1", "建议2"],
  "constraints": ["约束1", "约束2"],
  "versionSummary": "版本摘要，如：压缩首段铺垫，增强主角警觉感"
}

要求：
- goals 和 constraints 各返回1-2条
- suggestion 控制在20字以内
- versionSummary 控制在20字以内
- 只返回JSON，不要有其他文字"`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await callLLM(messages, {
      temperature: 0.5,
      maxTokens: 300,
    });

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      // Fallback if JSON parsing fails
      result = {
        suggestion: response.trim().slice(0, 50),
        goals: [],
        constraints: [],
        versionSummary: '',
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating suggestion:', error);
    return NextResponse.json({ error: 'Failed to generate suggestion' }, { status: 500 });
  }
}

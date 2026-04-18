/**
 * LLM Client - Simple OpenAI-compatible API client
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_MODEL = 'qwen-turbo';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Call an OpenAI-compatible LLM API
 */
export async function callLLM(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<string> {
  const {
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS,
  } = options;

  const apiKey = process.env.LLM_API_KEY;
  const apiBase = process.env.LLM_API_BASE;

  if (!apiKey) {
    throw new Error('LLM_API_KEY environment variable is not set');
  }

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Parse JSON from LLM response, with fallback handling
 */
export function parseJSONResponse<T>(content: string): T {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content;

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    throw new Error(`Failed to parse JSON: ${content.slice(0, 200)}`);
  }
}

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
 * Parse JSON from LLM response, with fallback handling for incomplete responses
 */
export function parseJSONResponse<T>(content: string): T {
  // Try to extract JSON from markdown code blocks
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  // First try: parse complete JSON
  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    // Second try: find longest valid JSON substring
    const trimmed = jsonStr.trim();

    // Try parsing from the start, finding the last valid position
    let lastValidIndex = -1;
    let lastValidJSON = '';

    for (let i = 0; i < trimmed.length; i++) {
      try {
        const candidate = trimmed.slice(0, i + 1);
        JSON.parse(candidate);
        lastValidIndex = i;
        lastValidJSON = candidate;
      } catch {
        // Continue searching
      }
    }

    if (lastValidIndex > 100) {
      // Found substantial JSON, try to use it
      try {
        return JSON.parse(lastValidJSON);
      } catch {
        // Fall through to error
      }
    }

    throw new Error(`Failed to parse JSON: ${trimmed.slice(0, 300)}`);
  }
}

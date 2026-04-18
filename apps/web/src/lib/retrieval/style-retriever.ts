import { memoryStore } from '@/lib/db/projects-store';

/**
 * Style Retriever - retrieves writing style guidelines
 *
 * Used by agents to maintain consistent voice, tone, and style
 * across generated content.
 */
export interface StyleGuidelines {
  keywords: string[];
  forbiddenRules: string[];
  tone: string;
  examplePassages: string[];
  perspective: string;
}

export async function getStyleGuidelines(projectId: string): Promise<StyleGuidelines> {
  const memories = await memoryStore.getByProject(projectId, 'style');

  const defaultGuidelines: StyleGuidelines = {
    keywords: [],
    forbiddenRules: [],
    tone: 'neutral',
    examplePassages: [],
    perspective: 'third-person',
  };

  if (memories.length === 0) {
    return defaultGuidelines;
  }

  // Merge all style memories
  return {
    keywords: memories
      .filter((m) => m.content.metadata?.keywords)
      .flatMap((m) => (m.content.metadata?.keywords as string[]) || []),
    forbiddenRules: memories
      .filter((m) => m.content.rules)
      .flatMap((m) => m.content.rules || []),
    tone: (memories[0]?.content.metadata?.tone as string) || defaultGuidelines.tone,
    examplePassages: memories
      .filter((m) => m.content.text)
      .map((m) => m.content.text || ''),
    perspective: (memories[0]?.content.metadata?.perspective as string) || defaultGuidelines.perspective,
  };
}

export async function getStyleConstraints(projectId: string): Promise<string[]> {
  const guidelines = await getStyleGuidelines(projectId);
  return guidelines.forbiddenRules;
}

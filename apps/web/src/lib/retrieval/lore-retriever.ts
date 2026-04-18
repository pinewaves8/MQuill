import { LocationInfo } from '@packages/shared-types';
import { memoryStore } from '@/lib/db/projects-store';

/**
 * Lore Retriever - retrieves world-building facts and details
 *
 * Used by agents to ensure consistency with established world rules,
 * locations, and canonical facts.
 */
export async function getLoreContext(projectId: string): Promise<{
  locations: LocationInfo[];
  rules: string[];
  worldFacts: string[];
}> {
  const memories = await memoryStore.getByProject(projectId, 'world');

  return {
    locations: memories
      .filter((m) => m.content.locations)
      .flatMap((m) => m.content.locations || []),
    rules: memories
      .filter((m) => m.content.rules)
      .flatMap((m) => m.content.rules || []),
    worldFacts: memories
      .filter((m) => m.content.facts)
      .flatMap((m) => m.content.facts || []),
  };
}

export async function searchLore(projectId: string, query: string): Promise<string[]> {
  const memories = await memoryStore.query(projectId, query, 'world');

  return memories
    .filter((m) => m.content.facts)
    .flatMap((m) => m.content.facts || [])
    .filter((fact) => fact.toLowerCase().includes(query.toLowerCase()));
}

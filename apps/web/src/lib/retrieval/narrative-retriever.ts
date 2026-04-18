import { NarrativeEvent, CharacterInfo } from '@packages/shared-types';
import { memoryStore } from '@/lib/db/projects-store';

/**
 * Narrative Retriever - retrieves story events and character information
 *
 * Used by agents to maintain narrative consistency and character
 * continuity across chapters.
 */
export async function getNarrativeContext(projectId: string): Promise<{
  events: NarrativeEvent[];
  characters: CharacterInfo[];
}> {
  const memories = await memoryStore.getByProject(projectId, 'narrative');

  return {
    events: memories
      .filter((m) => m.content.events)
      .flatMap((m) => m.content.events || [])
      .sort((a, b) => {
        // Sort by importance, then by timestamp
        const importanceOrder = { critical: 0, major: 1, minor: 2 };
        const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
        if (importanceDiff !== 0) return importanceDiff;
        return (a.timestamp || '').localeCompare(b.timestamp || '');
      }),
    characters: memories
      .filter((m) => m.content.characters)
      .flatMap((m) => m.content.characters || []),
  };
}

export async function getCharacterById(projectId: string, characterId: string): Promise<CharacterInfo | null> {
  const memories = await memoryStore.getByProject(projectId, 'narrative');

  for (const mem of memories) {
    const characters = mem.content.characters || [];
    const found = characters.find((c: CharacterInfo) => c.id === characterId);
    if (found) return found;
  }

  return null;
}

export async function getRecentEvents(projectId: string, limit: number = 5): Promise<NarrativeEvent[]> {
  const { events } = await getNarrativeContext(projectId);
  return events.slice(0, limit);
}

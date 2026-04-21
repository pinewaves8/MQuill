import { Memory, NarrativeEvent, CharacterInfo, LocationInfo, CharacterRelation, TimelineMarker } from '@packages/shared-types';
import { memoryStore } from '@/lib/db/projects-store';

/**
 * GroundingPack - assembled context for AI generation
 *
 * This is the context package sent to agents before they generate content.
 * It includes retrieved memories organized by type for grounding.
 */
export interface GroundingPack {
  projectId: string;
  facts: string[];           // Canon facts (timeline, world rules)
  lore: LoreContext;        // World-building details
  narrative: NarrativeContext;  // Story events, character arcs
  style: StyleContext;      // Writing style guidelines
  memory: Memory[];         // Raw memory entries (high priority first)
  constraints: string[];   // Explicit constraints from charter
  timeline: TimelineMarker[];  // Timeline markers for narrative consistency
  characterRelations: CharacterRelation[];  // Character relationship map
}

export interface LoreContext {
  locations: LocationInfo[];
  rules: string[];
  worldFacts: string[];
}

export interface NarrativeContext {
  events: NarrativeEvent[];
  characters: CharacterInfo[];
  recentChapters: string[]; // Summaries of recent chapters
}

export interface StyleContext {
  keywords: string[];
  forbiddenRules: string[];
  tone: string;
  examplePassages: string[];
}

/**
 * Build a grounding pack for a project
 * Assembles context from various memory types for AI generation
 */
export async function buildGroundingPack(projectId: string): Promise<GroundingPack> {
  // Fetch all memories for the project
  const memories = await memoryStore.getByProject(projectId);

  // Organize by memory type
  const memoriesByType = memories.reduce((acc, mem) => {
    if (!acc[mem.memoryType]) {
      acc[mem.memoryType] = [];
    }
    acc[mem.memoryType].push(mem);
    return acc;
  }, {} as Record<string, Memory[]>);

  // Extract lore context
  const loreMemories = memoriesByType['world'] || [];
  const lore: LoreContext = {
    locations: loreMemories
      .filter((m) => m.content.locations)
      .flatMap((m) => m.content.locations || []),
    rules: loreMemories
      .filter((m) => m.content.rules)
      .flatMap((m) => m.content.rules || []),
    worldFacts: loreMemories
      .filter((m) => m.content.facts)
      .flatMap((m) => m.content.facts || []),
  };

  // Extract narrative context
  const narrativeMemories = memoriesByType['narrative'] || [];
  const narrative: NarrativeContext = {
    events: narrativeMemories
      .filter((m) => m.content.events)
      .flatMap((m) => m.content.events || []),
    characters: narrativeMemories
      .filter((m) => m.content.characters)
      .flatMap((m) => m.content.characters || []),
    recentChapters: [],
  };

  // Extract style context
  const styleMemories = memoriesByType['style'] || [];
  const style: StyleContext = {
    keywords: styleMemories
      .filter((m) => m.content.metadata?.keywords)
      .flatMap((m) => (m.content.metadata?.keywords as string[]) || []),
    forbiddenRules: styleMemories
      .filter((m) => m.content.rules)
      .flatMap((m) => m.content.rules || []),
    tone: (styleMemories[0]?.content.metadata?.tone as string) || 'neutral',
    examplePassages: styleMemories
      .filter((m) => m.content.text)
      .map((m) => m.content.text || ''),
  };

  // Extract canon facts
  const canonMemories = memoriesByType['canon'] || [];
  const facts = canonMemories
    .filter((m) => m.content.facts)
    .flatMap((m) => m.content.facts || []);

  // Extract timeline markers
  const timelineMarkers: TimelineMarker[] = narrativeMemories
    .filter((m) => m.content.timelineMarkers)
    .flatMap((m) => m.content.timelineMarkers || []);

  // Extract character relations
  const characterRelations: CharacterRelation[] = narrativeMemories
    .filter((m) => m.content.characterRelations)
    .flatMap((m) => m.content.characterRelations || []);

  return {
    projectId,
    facts,
    lore,
    narrative,
    style,
    memory: memories.filter((m) => m.priority >= 70), // High priority memories
    constraints: [], // Would come from project charter
    timeline: timelineMarkers,
    characterRelations,
  };
}

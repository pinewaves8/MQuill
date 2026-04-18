import { memoryStore } from '@/lib/db/projects-store';

/**
 * Fact Retriever - retrieves canonical facts about the story world
 *
 * Used to verify generated content against established facts and
 * ensure continuity across the narrative.
 */
export interface CanonFact {
  key: string;
  fact: string;
  source: string;
  confidence: 'verified' | 'likely' | 'speculative';
}

export async function getCanonFacts(projectId: string): Promise<CanonFact[]> {
  const memories = await memoryStore.getByProject(projectId, 'canon');

  return memories
    .filter((m) => m.content.facts)
    .flatMap((m) =>
      (m.content.facts || []).map((fact: string) => ({
        key: m.key,
        fact,
        source: m.source,
        confidence: 'verified' as const,
      }))
    );
}

export async function verifyFact(projectId: string, fact: string): Promise<{
  isVerified: boolean;
  matchingFacts: CanonFact[];
}> {
  const canonFacts = await getCanonFacts(projectId);
  const factLower = fact.toLowerCase();

  const matchingFacts = canonFacts.filter((cf) =>
    cf.fact.toLowerCase().includes(factLower) ||
    factLower.includes(cf.fact.toLowerCase())
  );

  return {
    isVerified: matchingFacts.length > 0,
    matchingFacts,
  };
}

/**
 * Event Retrieval Skill - Retrieves event templates based on narrative requirements
 *
 * Searches event-library to find event templates that match:
 * - Event types
 * - Narrative functions
 * - Intensity levels
 * - Genre requirements
 * - Information roles
 */

import {
  retrieveEventTemplates,
  type EventRetrievalOptions,
} from '../reference-library-store';
import type {
  EventRetrievalSkillInput,
  EventRetrievalSkillOutput,
  SkillOutputSchema,
} from '../skill-interface';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';

// ============================================================
// Skill Implementation
// ============================================================

export async function executeEventRetrievalSkill(
  input: EventRetrievalSkillInput
): Promise<SkillOutputSchema> {
  const {
    projectId,
    event_type: eventTypes,
    narrative_function: narrativeFunctions,
    genre,
    intensity,
    pace_impact: paceImpact,
    information_role: informationRole,
    participant_count: participantCount,
    forbidden_event_types: forbiddenEventTypes,
    previous_event_id: previousEventId,
    novelty_weight: noveltyWeight = 0.5,
    retrieval_mode: retrievalMode = 'hybrid',
    max_results: maxResults = 5,
  } = input;

  try {
    // Build grounding context for project-specific info
    const groundingPack = await buildGroundingPack(projectId);

    // Build retrieval options
    const retrievalOptions: EventRetrievalOptions = {
      libraryId: 'event-library',
      mode: retrievalMode,
      maxExamples: maxResults,
    };

    // Add genre filter if specified
    const tags: string[] = [];
    if (genre) {
      tags.push(genre);
    }
    if (eventTypes && eventTypes.length > 0) {
      tags.push(...eventTypes);
    }
    if (narrativeFunctions && narrativeFunctions.length > 0) {
      tags.push(...narrativeFunctions);
    }
    if (tags.length > 0) {
      retrievalOptions.tags = tags;
    }

    // Add intensity filter if specified
    if (intensity !== undefined) {
      retrievalOptions.intensity = intensity;
    }

    // Retrieve event templates
    let events = retrieveEventTemplates(retrievalOptions);

    // Filter out forbidden event types
    if (forbiddenEventTypes && forbiddenEventTypes.length > 0) {
      events = events.filter(
        (event) => !forbiddenEventTypes.includes(event.event_type)
      );
    }

    // Filter by participant count if specified
    if (participantCount !== undefined) {
      events = events.filter(
        (event) =>
          event.participant_count === 0 ||
          event.participant_count >= participantCount
      );
    }

    // Filter by pace impact if specified
    if (paceImpact) {
      events = events.filter((event) => event.pace_impact === paceImpact);
    }

    // Filter by information role if specified
    if (informationRole) {
      events = events.filter((event) =>
        event.information_role.toLowerCase().includes(informationRole.toLowerCase())
      );
    }

    // Sort by novelty weight (prefer less clichéd events when novelty_weight is high)
    if (noveltyWeight > 0.5) {
      events.sort((a, b) => {
        const aRisk = a.cliché_risk ?? 5;
        const bRisk = b.cliché_risk ?? 5;
        return aRisk - bRisk;
      });
    }

    // Filter out events similar to previous event (avoid repetition)
    if (previousEventId) {
      const previousEvent = events.find((e) => e.id === previousEventId);
      if (previousEvent) {
        events = events.filter(
          (event) =>
            event.id !== previousEventId &&
            event.event_type !== previousEvent.event_type
        );
      }
    }

    // Calculate match scores
    const matchScores: Record<string, number> = {};
    for (const event of events) {
      let score = 70; // Base score

      // Event type match
      if (eventTypes && eventTypes.includes(event.event_type)) {
        score += 15;
      }

      // Genre match
      if (genre && event.genre_tags.includes(genre)) {
        score += 10;
      }

      // Narrative function match
      if (narrativeFunctions && narrativeFunctions.length > 0) {
        // Events support narrative functions through their information_role and core_conflict
        const funcMatch = narrativeFunctions.filter((f) =>
          event.information_role.toLowerCase().includes(f.toLowerCase()) ||
          event.core_conflict.toLowerCase().includes(f.toLowerCase())
        ).length;
        score += funcMatch * 5;
      }

      // Intensity match
      if (intensity !== undefined) {
        const intensityDiff = Math.abs(event.intensity - intensity);
        score -= intensityDiff * 3;
      }

      // Cliché penalty
      const clichéPenalty = (event.cliché_risk ?? 5) * 2;
      score -= clichéPenalty;

      // Originality bonus
      const originalityBonus = (event.originality_score ?? 5) * 2;
      score += originalityBonus;

      // Clamp score to 0-100
      matchScores[event.id] = Math.max(0, Math.min(100, score));
    }

    // Build retrieval reasoning
    const reasoning = buildRetrievalReasoning({
      eventTypes,
      narrativeFunctions,
      genre,
      intensity,
      paceImpact,
      eventsFound: events.length,
      groundingPack,
    });

    // Map to output schema
    const output: EventRetrievalSkillOutput = {
      status: 'completed',
      deliverable: {
        events,
        retrieval_reasoning: reasoning,
        match_scores: matchScores,
      },
    };

    return output;
  } catch (error) {
    console.error('[EventRetrievalSkill] Execution error:', error);
    return {
      status: 'failed',
      deliverable: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================
// Helper Functions
// ============================================================

interface RetrievalReasoningParams {
  eventTypes?: string[];
  narrativeFunctions?: string[];
  genre?: string;
  intensity?: number;
  paceImpact?: string;
  eventsFound: number;
  groundingPack: unknown;
}

function buildRetrievalReasoning(params: RetrievalReasoningParams): string {
  const { eventTypes, narrativeFunctions, genre, intensity, paceImpact, eventsFound } = params;

  const reasons: string[] = [];

  if (eventTypes && eventTypes.length > 0) {
    reasons.push(`event types: ${eventTypes.join(', ')}`);
  }
  if (narrativeFunctions && narrativeFunctions.length > 0) {
    reasons.push(`narrative functions: ${narrativeFunctions.join(', ')}`);
  }
  if (genre) {
    reasons.push(`genre: ${genre}`);
  }
  if (intensity !== undefined) {
    reasons.push(`intensity: ${intensity}/10`);
  }
  if (paceImpact) {
    reasons.push(`pace: ${paceImpact}`);
  }

  const reasonStr = reasons.length > 0 ? `Based on ${reasons.join(', ')}, ` : '';

  return `${reasonStr}retrieved ${eventsFound} candidate event templates with match scores.`;
}

// ============================================================
// Skill Interface Export
// ============================================================

export const eventRetrievalSkillId = 'event-retrieval-skill';

export async function handleEventRetrievalSkill(
  input: EventRetrievalSkillInput
): Promise<SkillOutputSchema> {
  return executeEventRetrievalSkill(input);
}

/**
 * Scene Retrieval Skill - Retrieves scene templates based on narrative requirements
 *
 * Searches scene-library to find scene templates that match:
 * - Genre requirements
 * - Era settings
 * - Narrative functions
 * - Intensity/danger levels
 * - Location types
 */

import {
  retrieveSceneTemplates,
  type SceneRetrievalOptions,
} from '../reference-library-store';
import type {
  SceneRetrievalSkillInput,
  SceneRetrievalSkillOutput,
  SkillOutputSchema,
  SceneTemplate,
} from '../skill-interface';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';

// ============================================================
// Skill Implementation
// ============================================================

export async function executeSceneRetrievalSkill(
  input: SceneRetrievalSkillInput
): Promise<SkillOutputSchema> {
  const {
    projectId,
    genre,
    era,
    narrative_function: narrativeFunctions,
    intensity,
    tone,
    required_affordances: affordances,
    forbidden_location_types: forbiddenLocations,
    character_count: characterCount,
    protagonist_emotional_state: emotionalState,
    novelty_weight: noveltyWeight = 0.5,
    retrieval_mode: retrievalMode = 'hybrid',
    max_results: maxResults = 5,
  } = input;

  try {
    // Build grounding context for project-specific info
    const groundingPack = await buildGroundingPack(projectId);

    // Build retrieval options
    const retrievalOptions: SceneRetrievalOptions = {
      libraryId: 'scene-library',
      mode: retrievalMode,
      maxExamples: maxResults,
    };

    // Add genre filter if specified
    const tags: string[] = [];
    if (genre) {
      tags.push(genre);
    }
    if (era) {
      tags.push(era);
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

    // Retrieve scene templates
    let scenes = retrieveSceneTemplates(retrievalOptions);

    // Filter out forbidden location types
    if (forbiddenLocations && forbiddenLocations.length > 0) {
      scenes = scenes.filter(
        (scene) => !forbiddenLocations.includes(scene.location_type)
      );
    }

    // Filter by character count if specified
    if (characterCount !== undefined) {
      scenes = scenes.filter(
        (scene) =>
          scene.typical_characters.length === 0 ||
          scene.typical_characters.length >= characterCount
      );
    }

    // Sort by novelty weight (prefer less clichéd scenes when novelty_weight is high)
    if (noveltyWeight > 0.5) {
      scenes.sort((a, b) => {
        const aRisk = a.cliché_risk ?? 5;
        const bRisk = b.cliché_risk ?? 5;
        return aRisk - bRisk;
      });
    }

    // Calculate match scores
    const matchScores: Record<string, number> = {};
    for (const scene of scenes) {
      let score = 70; // Base score

      // Genre match
      if (genre && scene.genre_tags.includes(genre)) {
        score += 10;
      }

      // Era match
      if (era && scene.era_tags.includes(era)) {
        score += 5;
      }

      // Narrative function match
      if (narrativeFunctions && narrativeFunctions.length > 0) {
        const funcMatch = narrativeFunctions.filter((f) =>
          scene.common_functions.includes(f)
        ).length;
        score += funcMatch * 5;
      }

      // Cliché penalty
      const clichéPenalty = (scene.cliché_risk ?? 5) * 2;
      score -= clichéPenalty;

      // Originality bonus
      const originalityBonus = (scene.originality_score ?? 5) * 2;
      score += originalityBonus;

      // Clamp score to 0-100
      matchScores[scene.id] = Math.max(0, Math.min(100, score));
    }

    // Build retrieval reasoning
    const reasoning = buildRetrievalReasoning({
      genre,
      era,
      narrativeFunctions,
      intensity,
      tone,
      scenesFound: scenes.length,
      groundingPack,
    });

    // Map to output schema
    const output: SceneRetrievalSkillOutput = {
      status: 'completed',
      deliverable: {
        scenes,
        retrieval_reasoning: reasoning,
        match_scores: matchScores,
      },
    };

    return output;
  } catch (error) {
    console.error('[SceneRetrievalSkill] Execution error:', error);
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
  genre?: string;
  era?: string;
  narrativeFunctions?: string[];
  intensity?: number;
  tone?: string;
  scenesFound: number;
  groundingPack: unknown;
}

function buildRetrievalReasoning(params: RetrievalReasoningParams): string {
  const { genre, era, narrativeFunctions, intensity, tone, scenesFound } = params;

  const reasons: string[] = [];

  if (genre) {
    reasons.push(`genre: ${genre}`);
  }
  if (era) {
    reasons.push(`era: ${era}`);
  }
  if (narrativeFunctions && narrativeFunctions.length > 0) {
    reasons.push(`narrative functions: ${narrativeFunctions.join(', ')}`);
  }
  if (intensity !== undefined) {
    reasons.push(`intensity: ${intensity}/10`);
  }
  if (tone) {
    reasons.push(`tone: ${tone}`);
  }

  const reasonStr = reasons.length > 0 ? `Based on ${reasons.join(', ')}, ` : '';

  return `${reasonStr}retrieved ${scenesFound} candidate scene templates with match scores.`;
}

// ============================================================
// Skill Interface Export
// ============================================================

export const sceneRetrievalSkillId = 'scene-retrieval-skill';

export async function handleSceneRetrievalSkill(
  input: SceneRetrievalSkillInput
): Promise<SkillOutputSchema> {
  return executeSceneRetrievalSkill(input);
}

/**
 * SceneEvent Composer Skill - Composites scenes and events into structured scene event cards
 *
 * Takes retrieved/provided scene templates and event templates, then:
 * 1. Reads pattern library for classic combinations
 * 2. Generates multiple candidate scene event cards (conservative/dramatic/literary/anti-cliché)
 * 3. Applies de-templatization to ensure originality
 */

import type {
  SceneEventComposerSkillInput,
  SceneEventComposerSkillOutput,
  SkillOutputSchema,
  SceneTemplate,
  EventTemplate,
  SceneEventPattern,
  SceneEventCard,
  NarrativeFunction,
} from '../skill-interface';
import {
  retrieveSceneTemplates,
  retrieveEventTemplates,
  retrieveSceneEventPatterns,
  type SceneRetrievalOptions,
  type EventRetrievalOptions,
} from '../reference-library-store';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';

// ============================================================
// Skill Implementation
// ============================================================

export async function executeSceneEventComposerSkill(
  input: SceneEventComposerSkillInput
): Promise<SkillOutputSchema> {
  const {
    projectId,
    chapter_goal: chapterGoal,
    scene_goal: sceneGoal,
    required_functions: requiredFunctions,
    candidate_scenes: providedScenes,
    candidate_events: providedEvents,
    candidate_patterns: providedPatterns,
    character_states: characterStates,
    tone_style: toneStyle = 'neutral',
    intensity_target: intensityTarget = 5,
    forbidden_cliches: forbiddenCliches = [],
    must_include_elements: mustInclude = [],
    must_avoid_elements: mustAvoid = [],
    word_budget: wordBudget = 500,
    candidate_count: candidateCount = 3,
  } = input;

  try {
    // Build grounding context
    const groundingPack = await buildGroundingPack(projectId);

    // Step 1: Get candidate scenes if not provided
    let scenes = providedScenes;
    if (!scenes || scenes.length === 0) {
      const sceneOptions: SceneRetrievalOptions = {
        libraryId: 'scene-library',
        mode: 'hybrid',
        maxExamples: 5,
      };
      scenes = retrieveSceneTemplates(sceneOptions);
    }

    // Step 2: Get candidate events if not provided
    let events = providedEvents;
    if (!events || events.length === 0) {
      const eventOptions: EventRetrievalOptions = {
        libraryId: 'event-library',
        mode: 'hybrid',
        maxExamples: 5,
      };
      events = retrieveEventTemplates(eventOptions);
    }

    // Step 3: Get patterns if not provided
    let patterns = providedPatterns;
    if (!patterns || patterns.length === 0) {
      patterns = retrieveSceneEventPatterns({
        libraryId: 'scene-event-pattern',
        mode: 'hybrid',
        maxExamples: 3,
      });
    }

    // Step 4: Generate multiple candidates
    const candidates = generateCandidates({
      scenes,
      events,
      patterns,
      chapterGoal,
      sceneGoal,
      requiredFunctions,
      characterStates,
      toneStyle,
      intensityTarget,
      forbiddenCliches,
      mustInclude,
      mustAvoid,
      wordBudget,
      candidateCount,
      groundingPack,
    });

    // Step 5: Apply de-templatization to each candidate
    const polishedCandidates = candidates.map((candidate) =>
      applyDeTemplatization(candidate, forbiddenCliches)
    );

    // Step 6: Select primary variant
    const selectedVariant = selectPrimaryVariant(polishedCandidates, toneStyle);

    // Build pattern usage report
    const patternUsage = buildPatternUsageReport(patterns, candidates);

    // Map to output schema
    const output: SceneEventComposerSkillOutput = {
      status: 'completed',
      deliverable: {
        candidates: polishedCandidates,
        selected_variant: selectedVariant,
        combination_reasoning: buildCombinationReasoning({
          scenes,
          events,
          patterns,
          requiredFunctions,
          intensityTarget,
        }),
        pattern_usage: patternUsage,
      },
    };

    return output;
  } catch (error) {
    console.error('[SceneEventComposerSkill] Execution error:', error);
    return {
      status: 'failed',
      deliverable: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================
// Candidate Generation
// ============================================================

interface CandidateGenerationParams {
  scenes: SceneTemplate[];
  events: EventTemplate[];
  patterns: SceneEventPattern[];
  chapterGoal: string;
  sceneGoal: string;
  requiredFunctions: NarrativeFunction[];
  characterStates: Record<string, {
    emotional_state: string;
    relationship_states: Record<string, string>;
    hidden_secrets: string[];
    goals: string[];
  }>;
  toneStyle: string;
  intensityTarget: number;
  forbiddenCliches: string[];
  mustInclude: string[];
  mustAvoid: string[];
  wordBudget: number;
  candidateCount: number;
  groundingPack: unknown;
}

function generateCandidates(params: CandidateGenerationParams): SceneEventCard[] {
  const {
    scenes,
    events,
    patterns,
    sceneGoal,
    requiredFunctions,
    intensityTarget,
  } = params;

  const candidates: SceneEventCard[] = [];

  // Strategy 1: Conservative - Use pattern-based combination
  if (patterns.length > 0) {
    const patternBased = generatePatternBasedCandidate(params, patterns[0]);
    if (patternBased) {
      candidates.push(patternBased);
    }
  }

  // Strategy 2: Dramatic - High intensity scene-event combo
  const dramaticScene = scenes.find((s) => s.danger_level >= 7) || scenes[0];
  const dramaticEvent = events.find((e) => e.intensity >= 7) || events[0];
  if (dramaticScene && dramaticEvent) {
    candidates.push(generateSceneEventCard({
      ...params,
      scene: dramaticScene,
      event: dramaticEvent,
      variant: 'dramatic',
    }));
  }

  // Strategy 3: Literary - Atmosphere-focused
  const literaryScene = scenes.find((s) => s.mood_tags.includes('压抑') || s.mood_tags.includes('神秘')) || scenes[0];
  const literaryEvent = events.find((e) => e.dialogue_density === 'high') || events[0];
  if (literaryScene && literaryEvent) {
    candidates.push(generateSceneEventCard({
      ...params,
      scene: literaryScene,
      event: literaryEvent,
      variant: 'literary',
    }));
  }

  // Strategy 4: Anti-cliché - Unexpected combination
  if (scenes.length > 1 && events.length > 1) {
    const antiClichéScene = scenes[Math.floor(Math.random() * scenes.length)];
    const antiClichéEvent = events[Math.floor(Math.random() * events.length)];
    if (antiClichéScene.id !== dramaticScene?.id || antiClichéEvent.id !== dramaticEvent?.id) {
      candidates.push(generateSceneEventCard({
        ...params,
        scene: antiClichéScene,
        event: antiClichéEvent,
        variant: 'anti-cliché',
      }));
    }
  }

  // Ensure we have at least one candidate
  if (candidates.length === 0) {
    candidates.push(generateSceneEventCard({
      ...params,
      scene: scenes[0],
      event: events[0],
      variant: 'conservative',
    }));
  }

  return candidates.slice(0, params.candidateCount);
}

function generatePatternBasedCandidate(
  params: CandidateGenerationParams,
  pattern: SceneEventPattern
): SceneEventCard | null {
  const { scenes, events } = params;

  const matchedScene = scenes.find((s) => s.id === pattern.scene_id);
  const matchedEvent = events.find((e) => e.id === pattern.event_id);

  if (!matchedScene || !matchedEvent) {
    return null;
  }

  return generateSceneEventCard({
    ...params,
    scene: matchedScene,
    event: matchedEvent,
    variant: 'conservative',
  });
}

interface SceneEventCardParams extends CandidateGenerationParams {
  scene: SceneTemplate;
  event: EventTemplate;
  variant: 'conservative' | 'dramatic' | 'literary' | 'anti-cliché';
}

function generateSceneEventCard(params: SceneEventCardParams): SceneEventCard {
  const {
    scene,
    event,
    sceneGoal,
    requiredFunctions,
    characterStates,
    intensityTarget,
    variant,
  } = params;

  // Generate participating characters from characterStates
  const participatingCharacters: Array<{
    character_id: string;
    role: 'protagonist' | 'supporting' | 'antagonist' | 'incidental';
    viewpoint: boolean;
    emotional_state: string;
  }> = Object.entries(characterStates || {}).map(
    ([characterId, state], index) => ({
      character_id: characterId,
      role: index === 0 ? 'protagonist' : 'supporting',
      viewpoint: index === 0,
      emotional_state: state.emotional_state,
    })
  );

  // If no characters provided, use scene's typical characters
  if (participatingCharacters.length === 0 && scene.typical_characters.length > 0) {
    participatingCharacters.push({
      character_id: 'unknown_protagonist',
      role: 'protagonist',
      viewpoint: true,
      emotional_state: '待设定',
    });
  }

  // Generate event progression based on event type
  const progression = generateEventProgression(event);

  // Generate ending hook
  const hook = generateEndingHook(event, variant);

  return {
    id: `sec_${Date.now()}_${variant}`,
    title: `${scene.name} · ${event.name}`,
    narrative_function: requiredFunctions.length > 0 ? requiredFunctions : inferNarrativeFunction(event),
    location: {
      type: scene.location_type,
      atmosphere: scene.mood_tags.join('、'),
      sensory_details: scene.sensory_features.slice(0, 3),
      time: scene.time_type,
      weather: scene.weather !== '室内' ? scene.weather : undefined,
    },
    participating_characters: participatingCharacters,
    objective: sceneGoal || '完成本章核心叙事目标',
    external_conflict: event.core_conflict,
    internal_conflict: generateInternalConflict(event, characterStates),
    event_trigger: event.trigger_conditions[0] || '事件自然发生',
    event_progression: progression,
    key_turning_point: progression[Math.floor(progression.length / 2)] || '转折点',
    information_revealed: generateInformationRevealed(event),
    information_hidden: generateInformationHidden(event),
    emotional_arc: event.emotion_curve,
    pacing_notes: `节奏：${event.pace_impact}，对话密度：${event.dialogue_density}，动作密度：${event.action_density}`,
    ending_hook: hook,
    tension_level: variant === 'dramatic' ? Math.min(10, intensityTarget + 2) : intensityTarget,
    cliché_risk_assessment: calculateClichéRisk(scene, event, variant),
    originality_elements: generateOriginalityElements(scene, event, variant),
    upgrade_applied: [],
  };
}

// ============================================================
// Helper Functions
// ============================================================

function inferNarrativeFunction(event: EventTemplate): NarrativeFunction[] {
  const mapping: Record<string, NarrativeFunction[]> = {
    encounter: ['introduce_character'],
    revelation: ['reveal_information'],
    confrontation: ['escalate_conflict'],
    pursuit: ['create_crisis'],
    discovery: ['reveal_truth'],
    betrayal: ['shift_relationship'],
    // ... more mappings
  };
  return mapping[event.event_type] || ['escalate_conflict'];
}

function generateEventProgression(event: EventTemplate): string[] {
  const baseProgression: Record<string, string[]> = {
    encounter: [
      '平静开场',
      '引入参与者',
      '初次互动',
      '意图揭示',
      '结果呈现',
    ],
    revelation: [
      '平静开场',
      '触发事件',
      '信息逐渐揭露',
      '关键揭示',
      '反应与后果',
    ],
    confrontation: [
      '对峙准备',
      '冲突升级',
      '关键转折',
      '高潮对抗',
      '结果与余波',
    ],
  };

  return baseProgression[event.event_type] || [
    '开场',
    '发展',
    '转折',
    '高潮',
    '结局',
  ];
}

function generateEndingHook(event: EventTemplate, variant: string): string {
  const hooks: Record<string, string> = {
    conservative: '悬念留白，引人继续阅读',
    dramatic: '危机降临，命运转折',
    literary: '情绪留白，余韵悠长',
    'anti-cliché': '反套路收尾，打破预期',
  };
  return hooks[variant] || hooks.conservative;
}

function generateInternalConflict(
  event: EventTemplate,
  characterStates: Record<string, { emotional_state: string; hidden_secrets: string[] }>
): string {
  if (Object.keys(characterStates).length > 0) {
    const firstChar = Object.values(characterStates)[0];
    if (firstChar.hidden_secrets.length > 0) {
      return `角色内心纠结：是否揭露隐藏的秘密`;
    }
  }
  return `角色在忠诚与现实之间的内心挣扎`;
}

function generateInformationRevealed(event: EventTemplate): string[] {
  const reveals: Record<string, string[]> = {
    revelation: ['关键线索', '隐藏关系', '真实意图'],
    discovery: ['真相一角', '关键证据', '可疑线索'],
    encounter: ['新角色登场', '新的可能性'],
  };
  return reveals[event.event_type] || ['情节推进信息'];
}

function generateInformationHidden(event: EventTemplate): string[] {
  return ['完整真相（后续揭露）', '其他角色秘密', '更深层动机'];
}

function calculateClichéRisk(
  scene: SceneTemplate,
  event: EventTemplate,
  variant: string
): number {
  let risk = ((scene.cliché_risk ?? 5) + (event.cliché_risk ?? 5)) / 2;
  if (variant === 'anti-cliché') {
    risk = Math.max(1, risk - 3);
  } else if (variant === 'dramatic') {
    risk = Math.min(10, risk + 1);
  }
  return risk;
}

function generateOriginalityElements(
  scene: SceneTemplate,
  event: EventTemplate,
  variant: string
): string[] {
  const elements: string[] = [];

  if (scene.originality_score && scene.originality_score >= 7) {
    elements.push('使用高原创性场景');
  }
  if (event.originality_score && event.originality_score >= 7) {
    elements.push('使用高原创性事件');
  }
  if (variant === 'anti-cliché') {
    elements.push('反套路设计');
  }
  if (variant === 'literary') {
    elements.push('文学性表达');
  }

  return elements.length > 0 ? elements : ['基础组合'];
}

// ============================================================
// De-templatization
// ============================================================

function applyDeTemplatization(
  card: SceneEventCard,
  forbiddenCliches: string[]
): SceneEventCard {
  // Apply basic de-templatization
  let processedCard = { ...card };

  // Remove cliché elements if detected
  const clichéIndicators = [
    '英雄救美',
    '一见钟情',
    '主角光环',
    '突然顿悟',
    '完美结局',
  ];

  for (const cliché of clichéIndicators) {
    if (
      card.title.includes(cliché) ||
      card.external_conflict.includes(cliché)
    ) {
      processedCard.cliché_risk_assessment = Math.max(
        1,
        processedCard.cliché_risk_assessment - 1
      );
      processedCard.upgrade_applied.push(`规避套路：${cliché}`);
    }
  }

  return processedCard;
}

function selectPrimaryVariant(
  candidates: SceneEventCard[],
  toneStyle: string
): 'conservative' | 'dramatic' | 'literary' | 'anti-cliché' {
  if (candidates.length === 1) {
    return 'conservative';
  }

  const toneMapping: Record<string, 'conservative' | 'dramatic' | 'literary' | 'anti-cliché'> = {
    cold: 'literary',
    restrained: 'conservative',
    intense: 'dramatic',
    subversive: 'anti-cliché',
  };

  return toneMapping[toneStyle] || 'conservative';
}

function buildPatternUsageReport(
  patterns: SceneEventPattern[],
  candidates: SceneEventCard[]
): Array<{ pattern_id: string; adaptation_notes: string }> {
  return patterns.slice(0, candidates.length).map((pattern) => ({
    pattern_id: pattern.id,
    adaptation_notes: `参考 "${pattern.name}" 模板进行组合，适配度 ${pattern.fit_score}/10`,
  }));
}

function buildCombinationReasoning(params: {
  scenes: SceneTemplate[];
  events: EventTemplate[];
  patterns: SceneEventPattern[];
  requiredFunctions: NarrativeFunction[];
  intensityTarget: number;
}): string {
  const { scenes, events, patterns, requiredFunctions, intensityTarget } = params;

  const reasons: string[] = [];

  if (scenes.length > 0) {
    reasons.push(`从 ${scenes.length} 个候选场景中选择 "${scenes[0].name}"`);
  }
  if (events.length > 0) {
    reasons.push(`从 ${events.length} 个候选事件中选择 "${events[0].name}"`);
  }
  if (patterns.length > 0) {
    reasons.push(`参考 ${patterns.length} 个经典组合模板`);
  }
  if (requiredFunctions.length > 0) {
    reasons.push(`满足叙事功能：${requiredFunctions.join(', ')}`);
  }
  reasons.push(`目标张力等级：${intensityTarget}/10`);

  return reasons.join('；') + '。';
}

// ============================================================
// Skill Interface Export
// ============================================================

export const sceneEventComposerSkillId = 'scene-event-composer-skill';

export async function handleSceneEventComposerSkill(
  input: SceneEventComposerSkillInput
): Promise<SkillOutputSchema> {
  return executeSceneEventComposerSkill(input);
}

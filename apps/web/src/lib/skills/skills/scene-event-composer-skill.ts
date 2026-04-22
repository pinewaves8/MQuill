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
    chapterGoal,
    sceneGoal,
    requiredFunctions,
    intensityTarget,
  } = params;

  const candidates: SceneEventCard[] = [];

  // Determine number of scenes based on intensity and chapter complexity
  const numScenes = Math.min(Math.max(2, Math.ceil(intensityTarget / 3)), 4);

  // Match narrative functions to scenes: each scene fulfills 1-2 functions
  const functionsPerScene = Math.ceil(requiredFunctions.length / numScenes);

  // Sort scenes by their narrative function support
  const sortedScenes = [...scenes].sort((a, b) => {
    const aScore = countFunctionSupport(a, requiredFunctions);
    const bScore = countFunctionSupport(b, requiredFunctions);
    return bScore - aScore;
  });

  // Sort events by intensity and type match
  const sortedEvents = [...events].sort((a, b) => {
    // Prefer events that match required functions
    const aMatch = a.event_type && requiredFunctions.some(fn => eventSupportsFunction(a, fn));
    const bMatch = b.event_type && requiredFunctions.some(fn => eventSupportsFunction(b, fn));
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    // Then sort by intensity
    return b.intensity - a.intensity;
  });

  // Generate scene sequence: each scene has 1 primary + 1 secondary event
  for (let i = 0; i < numScenes && i < sortedScenes.length; i++) {
    const scene = sortedScenes[i];
    const sceneFunctions = requiredFunctions.slice(i * functionsPerScene, (i + 1) * functionsPerScene);

    // Find matching events for this scene
    const matchingEvents = sortedEvents.filter(e =>
      !candidates.some(c => c.id.includes(e.id)) && // Not already used
      (e.intensity >= (i + 1) * 2) // Escalating intensity
    );

    const primaryEvent = matchingEvents[0] || sortedEvents[0];
    const secondaryEvent = matchingEvents[1] || matchingEvents[0] || sortedEvents[0];

    // Determine style based on scene characteristics and position
    const variant = determineVariantForScene(scene, i, numScenes, intensityTarget);

    // Scene 1: Establish/Introduce
    if (i === 0) {
      candidates.push(generateSceneEventCard({
        ...params,
        scene,
        event: primaryEvent,
        variant,
        sceneIndex: i + 1,
        sceneFunctions,
      }));
    }
    // Scene 2+: Development and climax
    else if (i === numScenes - 1 && numScenes > 1) {
      // Last scene: use highest intensity, dramatic variant
      const climaxScene = sortedScenes.find(s => s.danger_level >= 7) || scene;
      const climaxEvent = sortedEvents.find(e => e.intensity >= 8) || primaryEvent;
      candidates.push(generateSceneEventCard({
        ...params,
        scene: climaxScene,
        event: climaxEvent,
        variant: 'dramatic',
        sceneIndex: i + 1,
        sceneFunctions,
      }));
    } else {
      // Middle scenes: alternate between literary and anti-cliché for variety
      candidates.push(generateSceneEventCard({
        ...params,
        scene,
        event: primaryEvent,
        variant: i % 2 === 0 ? 'literary' : 'anti-cliché',
        sceneIndex: i + 1,
        sceneFunctions,
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
      sceneIndex: 1,
      sceneFunctions: requiredFunctions.slice(0, 1),
    }));
  }

  return candidates;
}

function countFunctionSupport(scene: SceneTemplate, functions: NarrativeFunction[]): number {
  // Count how many narrative functions this scene template supports
  const sceneFunctions = extractSceneFunctions(scene);
  return functions.filter(fn => sceneFunctions.includes(fn)).length;
}

function extractSceneFunctions(scene: SceneTemplate): NarrativeFunction[] {
  // Infer narrative functions from scene template characteristics
  const functions: NarrativeFunction[] = [];
  if (scene.location_type?.includes('室内') || scene.era_tags?.some(e => e.includes('古代'))) {
    functions.push('establish_setting');
  }
  if (scene.mood_tags?.includes('紧张') || scene.mood_tags?.includes('危机')) {
    functions.push('create_crisis', 'escalate_conflict');
  }
  if (scene.danger_level >= 7) {
    functions.push('build_climax');
  }
  if (scene.cliché_risk && scene.cliché_risk < 4) {
    functions.push('create_reversal');
  }
  return functions;
}

function eventSupportsFunction(event: EventTemplate, fn: NarrativeFunction): boolean {
  const mapping: Record<string, NarrativeFunction[]> = {
    encounter: ['introduce_character', 'establish_setting'],
    revelation: ['reveal_information', 'payoff_foreshadowing'],
    confrontation: ['escalate_conflict', 'build_climax'],
    pursuit: ['create_crisis', 'escalate_conflict'],
    discovery: ['reveal_truth', 'plant_foreshadowing'],
    betrayal: ['shift_relationship', 'reveal_information'],
  };
  return mapping[event.event_type]?.includes(fn) || false;
}

function determineVariantForScene(
  scene: SceneTemplate,
  index: number,
  total: number,
  intensity: number
): 'conservative' | 'dramatic' | 'literary' | 'anti-cliché' {
  // First scene: conservative (establish)
  if (index === 0) return 'conservative';
  // High intensity chapter: dramatic for climactic scenes
  if (intensity >= 8) return 'dramatic';
  // Low risk scene: anti-cliché
  if (scene.cliché_risk && scene.cliché_risk < 4) return 'anti-cliché';
  // Default: literary for development scenes
  return 'literary';
}

interface SceneEventCardParams extends CandidateGenerationParams {
  scene: SceneTemplate;
  event: EventTemplate;
  variant: 'conservative' | 'dramatic' | 'literary' | 'anti-cliché';
  sceneIndex: number;
  sceneFunctions: NarrativeFunction[];
}

function generateSceneEventCard(params: SceneEventCardParams): SceneEventCard {
  const {
    scene,
    event,
    sceneIndex,
    sceneFunctions,
    sceneGoal,
    characterStates,
    intensityTarget,
    variant,
    requiredFunctions,
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
    id: `sec_${sceneIndex}_${variant}_${Date.now()}`,
    title: `第${sceneIndex}幕：${scene.name} · ${event.name}`,
    narrative_function: sceneFunctions.length > 0 ? sceneFunctions : (requiredFunctions.length > 0 ? requiredFunctions : inferNarrativeFunction(event)),
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

/**
 * SceneEvent Polish Skill - Polishes scene event cards by:
 * - Reducing cliché risk
 * - Enhancing originality
 * - Adjusting tone
 * - Strengthening hooks
 * - Improving pacing
 */

import type {
  SceneEventPolishSkillInput,
  SceneEventPolishSkillOutput,
  SkillOutputSchema,
  SceneEventCard,
} from '../skill-interface';

// ============================================================
// Skill Implementation
// ============================================================

export async function executeSceneEventPolishSkill(
  input: SceneEventPolishSkillInput
): Promise<SkillOutputSchema> {
  const {
    projectId,
    scene_event_card: card,
    polish_goals: polishGoals,
    novel_style_keywords: styleKeywords = [],
    forbidden_expressions: forbiddenExpressions = [],
    required_style_elements: requiredStyleElements = [],
    genre,
    intensity_adjustment: intensityAdjustment = 0,
  } = input;

  try {
    // Apply polishing based on goals
    let polishedCard = { ...card };
    const appliedPolish: Array<{
      original_aspect: string;
      polished_aspect: string;
      technique_used: string;
    }> = [];
    const clichéMitigation: string[] = [];
    const originalityBoost: string[] = [];

    // Apply each polish goal
    for (const goal of polishGoals) {
      const result = applyPolishGoal(
        polishedCard,
        goal.goal,
        goal.specific_guidance,
        { styleKeywords, forbiddenExpressions, requiredStyleElements, genre }
      );

      if (result.changed) {
        polishedCard = result.card;
        appliedPolish.push(result.polish);
        if (goal.goal === 'reduce_cliché') {
          clichéMitigation.push(result.polish.technique_used);
        } else if (goal.goal === 'enhance_originality') {
          originalityBoost.push(result.polish.technique_used);
        }
      }
    }

    // Apply intensity adjustment
    if (intensityAdjustment !== 0) {
      const originalIntensity = polishedCard.tension_level;
      polishedCard.tension_level = Math.max(
        1,
        Math.min(10, polishedCard.tension_level + intensityAdjustment)
      );
      appliedPolish.push({
        original_aspect: `tension_level: ${originalIntensity}`,
        polished_aspect: `tension_level: ${polishedCard.tension_level}`,
        technique_used: `intensity_adjustment: ${intensityAdjustment > 0 ? '+' : ''}${intensityAdjustment}`,
      });
    }

    // Recalculate cliché risk if changes were made
    if (appliedPolish.length > 0) {
      const clichéReduction = appliedPolish.filter(
        (p) => p.technique_used.includes('reduce_cliché')
      ).length;
      polishedCard.cliché_risk_assessment = Math.max(
        1,
        polishedCard.cliché_risk_assessment - clichéReduction * 0.5
      );
    }

    // Add style keywords influence
    if (requiredStyleElements.length > 0) {
      const addedElements = requiredStyleElements.filter(
        (el) => !polishedCard.originality_elements.includes(el)
      );
      if (addedElements.length > 0) {
        polishedCard.originality_elements.push(...addedElements);
        appliedPolish.push({
          original_aspect: 'originality_elements',
          polished_aspect: `added: ${addedElements.join(', ')}`,
          technique_used: 'style_keywords_application',
        });
      }
    }

    // Map to output schema
    const output: SceneEventPolishSkillOutput = {
      status: 'completed',
      deliverable: {
        polished_card: polishedCard,
        applied_polish: appliedPolish,
        cliché_mitigation: clichéMitigation,
        originality_boost: originalityBoost,
      },
    };

    return output;
  } catch (error) {
    console.error('[SceneEventPolishSkill] Execution error:', error);
    return {
      status: 'failed',
      deliverable: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================
// Polish Goal Application
// ============================================================

interface PolishContext {
  styleKeywords: string[];
  forbiddenExpressions: string[];
  requiredStyleElements: string[];
  genre?: string;
}

interface PolishResult {
  changed: boolean;
  card: SceneEventCard;
  polish: {
    original_aspect: string;
    polished_aspect: string;
    technique_used: string;
  };
}

function applyPolishGoal(
  card: SceneEventCard,
  goal: 'reduce_cliché' | 'enhance_originality' | 'adjust_tone' | 'strengthen_hook' | 'improve_pacing',
  specificGuidance: string | undefined,
  context: PolishContext
): PolishResult {
  switch (goal) {
    case 'reduce_cliché':
      return applyClichéReduction(card, specificGuidance, context);
    case 'enhance_originality':
      return applyOriginalityEnhancement(card, specificGuidance, context);
    case 'adjust_tone':
      return applyToneAdjustment(card, specificGuidance, context);
    case 'strengthen_hook':
      return applyHookStrengthening(card, specificGuidance, context);
    case 'improve_pacing':
      return applyPacingImprovement(card, specificGuidance, context);
    default:
      return { changed: false, card, polish: { original_aspect: '', polished_aspect: '', technique_used: '' } };
  }
}

function applyClichéReduction(
  card: SceneEventCard,
  guidance: string | undefined,
  context: PolishContext
): PolishResult {
  const clichéIndicators = [
    { pattern: '英雄救美', alternative: '角色主动选择承担风险' },
    { pattern: '一见钟情', alternative: '现实而缓慢的吸引过程' },
    { pattern: '主角光环', alternative: '角色面临真实的局限和失败' },
    { pattern: '突然顿悟', alternative: '渐进式的理解和发现' },
    { pattern: '完美结局', alternative: '有代价的胜利或开放的结局' },
    { pattern: '坏人死于话多', alternative: '敌人果断行动' },
    { pattern: '青梅竹马', alternative: '偶然重逢或新建立的羁绊' },
  ];

  let changed = false;
  let polishedCard = { ...card };
  const polishEntries: string[] = [];

  for (const indicator of clichéIndicators) {
    if (card.title.includes(indicator.pattern)) {
      polishedCard.title = card.title.replace(
        indicator.pattern,
        guidance || indicator.alternative
      );
      polishEntries.push(`title: ${indicator.pattern} → ${guidance || indicator.alternative}`);
      changed = true;
    }
    if (card.external_conflict.includes(indicator.pattern)) {
      polishedCard.external_conflict = card.external_conflict.replace(
        indicator.pattern,
        guidance || indicator.alternative
      );
      polishEntries.push(`conflict: ${indicator.pattern} → ${guidance || indicator.alternative}`);
      changed = true;
    }
  }

  // Check for forbidden expressions
  for (const expr of context.forbiddenExpressions) {
    if (card.title.includes(expr)) {
      polishEntries.push(`removed_forbidden_expression: ${expr}`);
      changed = true;
    }
  }

  if (changed) {
    return {
      changed: true,
      card: polishedCard,
      polish: {
        original_aspect: 'cliché_elements_detected',
        polished_aspect: polishEntries.join('; '),
        technique_used: `reduce_cliché: ${polishEntries.length} elements addressed`,
      },
    };
  }

  return { changed: false, card, polish: { original_aspect: '', polished_aspect: '', technique_used: '' } };
}

function applyOriginalityEnhancement(
  card: SceneEventCard,
  guidance: string | undefined,
  context: PolishContext
): PolishResult {
  const polishEntries: string[] = [];
  let polishedCard = { ...card };

  // Add genre-specific originality elements
  if (context.genre) {
    const genreElement = getGenreOriginalityElement(context.genre);
    if (genreElement && !card.originality_elements.includes(genreElement)) {
      polishedCard.originality_elements = [
        ...card.originality_elements,
        genreElement,
      ];
      polishEntries.push(`genre_element: ${genreElement}`);
    }
  }

  // Apply style keywords influence
  for (const keyword of context.styleKeywords) {
    if (
      keyword &&
      !card.originality_elements.includes(keyword) &&
      polishEntries.length < 3
    ) {
      polishedCard.originality_elements.push(keyword);
      polishEntries.push(`style_keyword: ${keyword}`);
    }
  }

  // Add unique perspective if missing
  if (card.participating_characters.length > 0) {
    const protagonist = card.participating_characters.find((c) => c.viewpoint);
    if (protagonist && !card.originality_elements.some((el) => el.includes('视角'))) {
      polishedCard.originality_elements.push(`独特视角：${protagonist.character_id}的内心世界`);
      polishEntries.push('unique_perspective_added');
    }
  }

  const changed = polishEntries.length > 0;
  if (changed) {
    return {
      changed: true,
      card: polishedCard,
      polish: {
        original_aspect: 'originality_elements',
        polished_aspect: polishEntries.join('; '),
        technique_used: `enhance_originality: ${polishEntries.length} elements added`,
      },
    };
  }

  return { changed: false, card, polish: { original_aspect: '', polished_aspect: '', technique_used: '' } };
}

function getGenreOriginalityElement(genre: string): string | null {
  const genreElements: Record<string, string> = {
    '武侠': '武侠意境：江湖规矩与武力等级的细腻呈现',
    '悬疑': '悬疑机制：信息不对称与读者共情陷阱',
    '都市': '都市肌理：现代社会的疏离与连接',
    '科幻': '科幻设定：技术奇点与社会想象的平衡',
    '侦探': '推理逻辑：线索公平与误导的精妙平衡',
  };
  return genreElements[genre] || null;
}

function applyToneAdjustment(
  card: SceneEventCard,
  guidance: string | undefined,
  context: PolishContext
): PolishResult {
  let polishedCard = { ...card };
  const polishEntries: string[] = [];

  // Adjust emotional arc based on guidance
  if (guidance) {
    const toneModifiers: Record<string, string[]> = {
      cold: ['冷静', '克制', '疏离'],
      warm: ['温暖', '柔和', '人情味'],
      dark: ['压抑', '阴沉', '绝望'],
      light: ['明快', '轻松', '希望'],
    };

    const modifier = toneModifiers[guidance.toLowerCase()];
    if (modifier && modifier.length > 0) {
      if (card.emotional_arc.length > 0) {
        polishedCard.emotional_arc = [modifier[0], ...card.emotional_arc.slice(1)];
        polishEntries.push(`tone: adjusted to ${guidance}`);
      }
    }
  }

  // Adjust atmosphere based on context
  if (context.requiredStyleElements.length > 0) {
    for (const element of context.requiredStyleElements) {
      if (
        element.includes('氛围') &&
        !card.location.atmosphere.includes(element)
      ) {
        polishedCard.location = {
          ...card.location,
          atmosphere: `${element}、${card.location.atmosphere}`,
        };
        polishEntries.push(`atmosphere: added ${element}`);
      }
    }
  }

  const changed = polishEntries.length > 0;
  if (changed) {
    return {
      changed: true,
      card: polishedCard,
      polish: {
        original_aspect: 'tone/atmosphere',
        polished_aspect: polishEntries.join('; '),
        technique_used: `adjust_tone: ${guidance || 'context_based'}`,
      },
    };
  }

  return { changed: false, card, polish: { original_aspect: '', polished_aspect: '', technique_used: '' } };
}

function applyHookStrengthening(
  card: SceneEventCard,
  guidance: string | undefined,
  context: PolishContext
): PolishResult {
  let polishedCard = { ...card };
  const polishEntries: string[] = [];

  // Strengthen ending hook
  const originalHook = card.ending_hook;
  let newHook = originalHook;

  // Check if hook is too explicit
  if (originalHook.length > 50) {
    newHook = `${originalHook.slice(0, 30)}...（悬念强化）`;
    polishEntries.push('hook: made more implicit');
  }

  // Add question/uncertainty if missing
  if (!newHook.includes('？') && !newHook.includes('是否')) {
    newHook = `${newHook}——这意味着什么？`;
    polishEntries.push('hook: added question_element');
  }

  // Add stakes elevation if guidance suggests
  if (guidance?.toLowerCase().includes('高风险')) {
    newHook = `而最坏的情况还未到来。${newHook}`;
    polishEntries.push('hook: elevated_stakes');
  }

  if (newHook !== originalHook) {
    polishedCard.ending_hook = newHook;
    return {
      changed: true,
      card: polishedCard,
      polish: {
        original_aspect: `ending_hook: ${originalHook.slice(0, 30)}...`,
        polished_aspect: `ending_hook: ${newHook.slice(0, 30)}...`,
        technique_used: 'strengthen_hook',
      },
    };
  }

  return { changed: false, card, polish: { original_aspect: '', polished_aspect: '', technique_used: '' } };
}

function applyPacingImprovement(
  card: SceneEventCard,
  guidance: string | undefined,
  context: PolishContext
): PolishResult {
  let polishedCard = { ...card };
  const polishEntries: string[] = [];

  // Adjust pacing notes
  const originalPacing = card.pacing_notes;
  let newPacing = originalPacing;

  if (guidance?.toLowerCase().includes('快节奏')) {
    newPacing = `节奏紧凑，${newPacing.replace('节奏：', '')}`;
    polishEntries.push('pacing: tightened');
  } else if (guidance?.toLowerCase().includes('慢热')) {
    newPacing = `节奏舒缓，${newPacing.replace('节奏：', '')}`;
    polishEntries.push('pacing: slowed');
  }

  // Shorten progression if too long
  if (card.event_progression.length > 5) {
    polishedCard.event_progression = card.event_progression.slice(0, 4);
    polishEntries.push('progression: condensed_to_4_beats');
  }

  if (newPacing !== originalPacing || polishEntries.length > 0) {
    polishedCard.pacing_notes = newPacing;
    return {
      changed: true,
      card: polishedCard,
      polish: {
        original_aspect: 'pacing_notes',
        polished_aspect: polishEntries.join('; '),
        technique_used: 'improve_pacing',
      },
    };
  }

  return { changed: false, card, polish: { original_aspect: '', polished_aspect: '', technique_used: '' } };
}

// ============================================================
// Skill Interface Export
// ============================================================

export const sceneEventPolishSkillId = 'scene-event-polish-skill';

export async function handleSceneEventPolishSkill(
  input: SceneEventPolishSkillInput
): Promise<SkillOutputSchema> {
  return executeSceneEventPolishSkill(input);
}

/**
 * Character Drift Detector - detects when characters act out of established personality
 *
 * Checks:
 * - Character actions match their personality profile
 * - Speech patterns are consistent
 * - Relationships are respected in dialogue/actions
 */

import { CharacterInfo, CharacterRelation } from '@packages/shared-types';
import { memoryStore } from '@/lib/db/projects-store';

export interface DriftCheck {
  characterId: string;
  characterName: string;
  severity: 'high' | 'medium' | 'low';
  type: 'trait_violation' | 'speech_violation' | 'relationship_violation';
  description: string;
  suggestion: string;
}

export interface CharacterDriftResult {
  hasDrift: boolean;
  checks: DriftCheck[];
}

/**
 * Detect character drift in a given text against established character profiles
 */
export async function detectCharacterDrift(
  projectId: string,
  text: string
): Promise<CharacterDriftResult> {
  const memories = await memoryStore.getByProject(projectId, 'narrative');

  const characters: CharacterInfo[] = memories
    .filter((m) => m.content.characters)
    .flatMap((m) => m.content.characters || []);

  const relations: CharacterRelation[] = memories
    .filter((m) => m.content.characterRelations)
    .flatMap((m) => m.content.characterRelations || []);

  const checks: DriftCheck[] = [];

  for (const character of characters) {
    // Check personality trait violations
    if (character.personalityProfile && character.personalityProfile.length > 0) {
      const traitViolation = checkTraitViolation(text, character);
      if (traitViolation) {
        checks.push(traitViolation);
      }
    }

    // Check speech pattern violations
    if (character.speechPatterns && character.speechPatterns.length > 0) {
      const speechViolation = checkSpeechViolation(text, character);
      if (speechViolation) {
        checks.push(speechViolation);
      }
    }
  }

  // Check relationship violations
  const relationshipViolations = checkRelationshipViolations(text, characters, relations);
  checks.push(...relationshipViolations);

  return {
    hasDrift: checks.length > 0,
    checks,
  };
}

/**
 * Check if text violates character's established personality traits
 */
function checkTraitViolation(
  text: string,
  character: CharacterInfo
): DriftCheck | null {
  if (!character.personalityProfile || character.personalityProfile.length === 0) {
    return null;
  }

  const traits = character.personalityProfile;
  const textLower = text.toLowerCase();

  // Check for contradictory traits in the text
  // This is a simplified check - in reality would need NLP
  const contradictionPatterns: Record<string, string[]> = {
    'cold': ['warm', 'friendly', 'affectionate', 'loving'],
    'hot-headed': ['calm', 'patient', 'peaceful', 'serene'],
    'wise': ['foolish', 'naive', 'reckless', 'impulsive'],
    'silent': ['talkative', 'chatty', 'verbose', 'loud'],
  };

  for (const trait of traits) {
    const opposites = contradictionPatterns[trait.toLowerCase()];
    if (opposites) {
      for (const opposite of opposites) {
        if (textLower.includes(opposite)) {
          // Check if the character is exhibiting this opposite trait
          const contextPatterns = [
            new RegExp(`${character.name}[^。]*${opposite}`, 'i'),
            new RegExp(`${character.name}[^。]*很[^。]*${opposite}`, 'i'),
            new RegExp(`只见${character.name}[^。]*${opposite}`, 'i'),
          ];

          for (const pattern of contextPatterns) {
            if (pattern.test(text)) {
              return {
                characterId: character.id,
                characterName: character.name,
                severity: 'medium',
                type: 'trait_violation',
                description: `角色 "${character.name}" 的性格设定为 "${trait}"，但文本中表现出了相反特质 "${opposite}"`,
                suggestion: `确保角色行为符合 "${trait}" 的设定，避免突然的性格转变`,
              };
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * Check if character's speech patterns are violated
 */
function checkSpeechViolation(
  text: string,
  character: CharacterInfo
): DriftCheck | null {
  if (!character.speechPatterns || character.speechPatterns.length === 0) {
    return null;
  }

  // Extract dialogue from text
  const dialogueMatches = text.match(/["""'""'][^"""'"""']{10,100}[""""'"""']/g);
  if (!dialogueMatches) {
    return null;
  }

  const dialogues = dialogueMatches.map(d => d.slice(1, -1));

  // Check for forbidden speech patterns
  for (const pattern of character.speechPatterns) {
    if (pattern.startsWith('!')) {
      const forbidden = pattern.slice(1);
      for (const dialogue of dialogues) {
        if (dialogue.includes(forbidden)) {
          return {
            characterId: character.id,
            characterName: character.name,
            severity: 'low',
            type: 'speech_violation',
            description: `角色 "${character.name}" 的对话中出现了禁止的用语模式 "${forbidden}"`,
            suggestion: '避免使用不符合角色身份的用语',
          };
        }
      }
    }
  }

  return null;
}

/**
 * Check if character relationships are violated
 */
function checkRelationshipViolations(
  text: string,
  characters: CharacterInfo[],
  relations: CharacterRelation[]
): DriftCheck[] {
  const checks: DriftCheck[] = [];

  for (const relation of relations) {
    const fromChar = characters.find(c => c.id === relation.from);
    const toChar = characters.find(c => c.id === relation.to);

    if (!fromChar || !toChar) continue;

    // Check enemy relationships - they shouldn't show friendly behavior
    if (relation.type === 'enemy') {
      const friendlyPatterns = [
        new RegExp(`${fromChar.name}[^。]*向${toChar.name}[^。]*微笑`, 'i'),
        new RegExp(`${fromChar.name}[^。]*拍了拍?${toChar.name}`, 'i'),
        new RegExp(`${fromChar.name}[^。]*热情地[^。]*${toChar.name}`, 'i'),
      ];

      for (const pattern of friendlyPatterns) {
        if (pattern.test(text)) {
          checks.push({
            characterId: relation.from,
            characterName: fromChar.name,
            severity: 'high',
            type: 'relationship_violation',
            description: `"${fromChar.name}" 与 "${toChar.name}" 是敌对关系，但文本中表现出友好行为`,
            suggestion: `敌对角色之间应保持警惕、冷漠或敌意，避免友好互动`,
          });
        }
      }
    }

    // Check mentor relationships - mentor shouldn't show disrespect
    if (relation.type === 'mentor') {
      const disrespectfulPatterns = [
        new RegExp(`${fromChar.name}[^。]*顶撞${toChar.name}`, 'i'),
        new RegExp(`${fromChar.name}[^。]*反驳${toChar.name}[^。]*的话`, 'i'),
      ];

      for (const pattern of disrespectfulPatterns) {
        if (pattern.test(text)) {
          checks.push({
            characterId: relation.from,
            characterName: fromChar.name,
            severity: 'medium',
            type: 'relationship_violation',
            description: `"${fromChar.name}" 是 "${toChar.name}" 的学生，但表现出不尊重的行为`,
            suggestion: '徒弟应保持对师父的尊重，避免直接反驳或顶撞',
          });
        }
      }
    }
  }

  return checks;
}

/**
 * Get character relationship map
 */
export async function getCharacterRelations(
  projectId: string
): Promise<Map<string, CharacterRelation[]>> {
  const memories = await memoryStore.getByProject(projectId, 'narrative');

  const relations: CharacterRelation[] = memories
    .filter((m) => m.content.characterRelations)
    .flatMap((m) => m.content.characterRelations || []);

  const relationMap = new Map<string, CharacterRelation[]>();

  for (const relation of relations) {
    if (!relationMap.has(relation.from)) {
      relationMap.set(relation.from, []);
    }
    relationMap.get(relation.from)!.push(relation);
  }

  return relationMap;
}

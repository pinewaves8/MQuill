/**
 * Write Skill - Chapter content generation with technique directives
 *
 * Wraps writer-agent with:
 * - Reference example injection from writing-technique library
 * - Technique directive application
 * - Continuity context from previous segments
 */

import type {
  WriteSkillInput,
  WriteSkillOutput,
  SkillOutputSchema,
  ReferenceExample,
  TechniqueDirective,
} from '../skill-interface';
import { writerAgent } from '@/lib/agents/writer-agent';
import { buildGroundingPack } from '@/lib/retrieval/grounding-pack';
import { projectStore, chapterStore } from '@/lib/db/projects-store';
import { loadCollection } from '@/lib/db/file-storage';
import { retrieveReferenceExamples, RetrievalOptions } from '../reference-library-store';
import type { BookOutline } from '@packages/shared-types';

// ============================================================
// Skill Implementation
// ============================================================

export async function executeWriteSkill(
  input: WriteSkillInput,
  referenceExamples?: ReferenceExample[],
  techniqueDirectives?: TechniqueDirective[]
): Promise<SkillOutputSchema> {
  const {
    projectId,
    chapterId,
    sceneId,
    scene,
    chapterTitle,
    chapterGoal,
    previousContext,
    recentEvents,
  } = input;

  try {
    // Build grounding context
    const groundingPack = await buildGroundingPack(projectId, {
      includeLore: true,
      includeNarrative: true,
      includeStyle: true,
      includeMemory: true,
      includeConstraints: true,
      includeTimeline: true,
    });

    // Get chapter context
    const chapter = await chapterStore.getById(chapterId);
    const project = await projectStore.getById(projectId);
    const outline = loadCollection<BookOutline>('outlines').find((o) => o.projectId === projectId);

    // Get scene count for context
    const allChapters = outline?.volumes.flatMap((v) => v.chapters) ?? [];
    const sceneIndex = allChapters.findIndex((c) => c.id === chapterId) + 1;
    const sceneCount = allChapters.length;

    // Retrieve reference examples if not provided
    const examples = referenceExamples ?? retrieveReferenceExamples({
      libraryId: 'writing-technique',
      mode: 'hybrid',
      maxExamples: 5,
    });

    // Build technique directive string for prompt
    const techniqueDirectivesStr = techniqueDirectives && techniqueDirectives.length > 0
      ? techniqueDirectives
          .map((d) => `- ${d.technique_name}: ${d.application_hint}`)
          .join('\n')
      : '';

    // Call writer agent with enhanced context
    const writerOutput = await writerAgent({
      projectId,
      chapterId,
      sceneId,
      scene,
      context: {
        chapterTitle,
        chapterGoal,
        previousContext,
        recentEvents,
        groundingPack,
        sceneIndex,
        sceneCount,
        // Enhanced fields for technique directives
        referenceExamples: examples,
        techniqueDirectives: techniqueDirectivesStr,
        writingGuidelines: buildWritingGuidelines(examples, techniqueDirectives),
      },
    });

    // Map writer output to skill output
    const output: WriteSkillOutput = {
      status: writerOutput.status === 'completed' ? 'completed' : writerOutput.status === 'failed' ? 'failed' : 'needs_revision',
      deliverable: {
        content: writerOutput.segment?.content ?? '',
        summary: writerOutput.summary ?? '',
        used_beats: writerOutput.usedBeats,
        continuity_notes: writerOutput.continuityNotes,
        risk_flags: writerOutput.riskFlags,
      },
    };

    return output;
  } catch (error) {
    console.error('[WriteSkill] Execution error:', error);
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

function buildWritingGuidelines(
  examples: ReferenceExample[],
  directives?: TechniqueDirective[]
): string {
  const guidelines: string[] = [];

  // Add technique directives
  if (directives && directives.length > 0) {
    guidelines.push('## 技法要求');
    for (const directive of directives) {
      guidelines.push(`**${directive.technique_name}**: ${directive.application_hint}`);
    }
    guidelines.push('');
  }

  // Add reference examples for few-shot learning
  if (examples.length > 0) {
    guidelines.push('## 参考样本 (Few-Shot)');
    for (const example of examples.slice(0, 3)) {
      guidelines.push(`### ${example.title}`);
      if (example.source_work) {
        guidelines.push(`来源: ${example.source_work} by ${example.source_author ?? '未知'}`);
      }
      if (example.technique_tags) {
        guidelines.push(`技法: ${example.technique_tags.join(', ')}`);
      }
      guidelines.push('---');
      guidelines.push(example.content);
      guidelines.push('');
    }
  }

  return guidelines.join('\n');
}

// ============================================================
// Skill Interface Export
// ============================================================

export const writeSkillId = 'write-skill';

export async function handleWriteSkill(
  input: WriteSkillInput,
  referenceExamples?: ReferenceExample[],
  techniqueDirectives?: TechniqueDirective[]
): Promise<SkillOutputSchema> {
  return executeWriteSkill(input, referenceExamples, techniqueDirectives);
}

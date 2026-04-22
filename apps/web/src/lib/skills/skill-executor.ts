/**
 * Skill Executor - Executes individual skills with standardized interface
 *
 * Handles:
 * - Skill invocation with proper input/output schema validation
 * - Reference library injection into skill context
 * - Model configuration and execution
 * - Error handling and retry logic
 */

import type {
  SkillInputSchema,
  SkillOutputSchema,
  BaseSkill,
  ReferenceExample,
  TechniqueDirective,
  QualitySignal,
} from './skill-interface';
import {
  retrieveReferenceExamples,
  RetrievalOptions,
} from './reference-library-store';
import { getSkill } from './skill-registry';

// ============================================================
// Execution Context
// ============================================================

export interface SkillExecutionContext {
  projectId: string;
  skillId: string;
  input: SkillInputSchema;
  referenceExamples?: ReferenceExample[];
  techniqueDirectives?: TechniqueDirective[];
  attemptNumber?: number;
}

export interface SkillExecutionResult {
  success: boolean;
  output?: SkillOutputSchema;
  error?: string;
  executionMetrics?: ExecutionMetrics;
}

export interface ExecutionMetrics {
  durationMs: number;
  modelCalls: number;
  tokenUsage?: {
    input: number;
    output: number;
  };
}

// ============================================================
// Skill Executor
// ============================================================

export class SkillExecutor {
  private executionTimeout = 120000; // 2 minutes default

  async execute(context: SkillExecutionContext): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    const { skillId, input, referenceExamples, techniqueDirectives, attemptNumber = 1 } = context;

    const skillEntry = getSkill(skillId);
    if (!skillEntry) {
      return {
        success: false,
        error: `Skill not found: ${skillId}`,
      };
    }

    const { skill } = skillEntry;

    try {
      // Validate input against schema
      const validationError = this.validateInput(skill, input);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // Build enhanced context with reference examples
      const enhancedInput = this.injectReferences(input, skill, referenceExamples, techniqueDirectives);

      // Execute the skill
      const output = await this.invokeSkill(skill, enhancedInput);

      // Extract quality signals if available
      const qualitySignals = this.extractQualitySignals(output);

      const durationMs = Date.now() - startTime;

      return {
        success: true,
        output: {
          ...output,
          quality_signals: qualitySignals,
        },
        executionMetrics: {
          durationMs,
          modelCalls: 1,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`[SkillExecutor] Error executing ${skillId}:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
        executionMetrics: {
          durationMs,
          modelCalls: 1,
        },
      };
    }
  }

  private validateInput(skill: BaseSkill, input: SkillInputSchema): string | null {
    // Basic schema validation - ensure required fields present
    const requiredFields = Object.keys(skill.input_schema).filter(
      (key) => key !== 'reference_style_library_id' && key !== 'reference_examples' && key !== 'technique_directives'
    );

    for (const field of requiredFields) {
      if (field === 'projectId' && !input.projectId) {
        return `Missing required field: projectId`;
      }
      if (field === 'chapterId' && !input.chapterId) {
        return `Missing required field: chapterId`;
      }
    }

    return null;
  }

  private injectReferences(
    input: SkillInputSchema,
    skill: BaseSkill,
    referenceExamples?: ReferenceExample[],
    techniqueDirectives?: TechniqueDirective[]
  ): SkillInputSchema {
    // If reference examples were pre-loaded, use them directly
    if (referenceExamples && referenceExamples.length > 0) {
      return {
        ...input,
        reference_examples: referenceExamples,
        technique_directives: techniqueDirectives,
      };
    }

    // Otherwise, retrieve from library based on skill config
    const libraryIds = skill.execution_config.reference_library_ids;
    if (!libraryIds || libraryIds.length === 0) {
      return {
        ...input,
        technique_directives: techniqueDirectives,
      };
    }

    // Retrieve reference examples from each configured library
    const retrievedExamples: ReferenceExample[] = [];
    for (const libraryId of libraryIds) {
      const retrievalOptions: RetrievalOptions = {
        libraryId,
        mode: 'hybrid',
        maxExamples: 3,
      };

      const examples = retrieveReferenceExamples(retrievalOptions);
      retrievedExamples.push(...examples);
    }

    return {
      ...input,
      reference_examples: retrievedExamples.length > 0 ? retrievedExamples : undefined,
      technique_directives: techniqueDirectives,
    };
  }

  private async invokeSkill(skill: BaseSkill, input: SkillInputSchema): Promise<SkillOutputSchema> {
    // Route to appropriate skill handler based on skill_id
    switch (skill.skill_id) {
      case 'outline-skill': {
        const { handleOutlineSkill } = await import('./skills/outline-skill');
        return handleOutlineSkill(input as import('./skill-interface').OutlineSkillInput);
      }
      case 'scene-plan-skill': {
        const { handleScenePlanSkill } = await import('./skills/scene-plan-skill');
        return handleScenePlanSkill(input as import('./skill-interface').ScenePlanSkillInput);
      }
      case 'write-skill': {
        const { handleWriteSkill } = await import('./skills/write-skill');
        return handleWriteSkill(input as import('./skill-interface').WriteSkillInput);
      }
      case 'evaluate-skill': {
        const { handleEvaluateSkill } = await import('./skills/evaluate-skill');
        return handleEvaluateSkill(input as import('./skill-interface').EvaluateSkillInput);
      }
      case 'revision-skill': {
        const { handleRevisionSkill } = await import('./skills/revision-skill');
        return handleRevisionSkill(input as import('./skill-interface').RevisionSkillInput);
      }
      case 'publishability-skill': {
        const { handlePublishabilitySkill } = await import('./skills/publishability-skill');
        return handlePublishabilitySkill(input as import('./skill-interface').PublishabilitySkillInput);
      }
      case 'bootstrap-skill': {
        const { handleBootstrapSkill } = await import('./skills/bootstrap-skill');
        return handleBootstrapSkill(input as import('./skill-interface').BootstrapSkillInput);
      }
      case 'scene-retrieval-skill': {
        const { handleSceneRetrievalSkill } = await import('./skills/scene-retrieval-skill');
        return handleSceneRetrievalSkill(input as import('./skill-interface').SceneRetrievalSkillInput);
      }
      case 'event-retrieval-skill': {
        const { handleEventRetrievalSkill } = await import('./skills/event-retrieval-skill');
        return handleEventRetrievalSkill(input as import('./skill-interface').EventRetrievalSkillInput);
      }
      case 'scene-event-composer-skill': {
        const { handleSceneEventComposerSkill } = await import('./skills/scene-event-composer-skill');
        return handleSceneEventComposerSkill(input as import('./skill-interface').SceneEventComposerSkillInput);
      }
      case 'scene-event-polish-skill': {
        const { handleSceneEventPolishSkill } = await import('./skills/scene-event-polish-skill');
        return handleSceneEventPolishSkill(input as import('./skill-interface').SceneEventPolishSkillInput);
      }
      default:
        throw new Error(`Unknown skill handler for: ${skill.skill_id}`);
    }
  }

  private extractQualitySignals(output: SkillOutputSchema): QualitySignal[] {
    // Extract quality signals from output if present
    if (!output.quality_signals) {
      return [];
    }
    return output.quality_signals;
  }

  setExecutionTimeout(timeoutMs: number): void {
    this.executionTimeout = timeoutMs;
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const skillExecutor = new SkillExecutor();

// ============================================================
// Convenience Functions
// ============================================================

export async function executeSkill(
  skillId: string,
  input: SkillInputSchema,
  options?: {
    referenceExamples?: ReferenceExample[];
    techniqueDirectives?: TechniqueDirective[];
    attemptNumber?: number;
  }
): Promise<SkillExecutionResult> {
  return skillExecutor.execute({
    projectId: input.projectId,
    skillId,
    input,
    referenceExamples: options?.referenceExamples,
    techniqueDirectives: options?.techniqueDirectives,
    attemptNumber: options?.attemptNumber,
  });
}

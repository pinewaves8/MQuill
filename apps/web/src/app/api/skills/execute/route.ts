import { NextResponse } from 'next/server';

import { executeSkill } from '@/lib/skills/skill-executor';

/**
 * POST /api/skills/execute
 *
 * Execute a skill with the given input.
 *
 * Request body:
 * {
 *   "skillId": "scene-event-composer-skill",
 *   "input": { ... }
 * }
 *
 * Response:
 * {
 *   "data": { skill output }
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { skillId, input } = body;

    if (!skillId || !input) {
      return NextResponse.json(
        { error: 'skillId and input are required' },
        { status: 400 }
      );
    }

    const result = await executeSkill(skillId, input);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Skill execution failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result.output });
  } catch (error) {
    console.error('[Skills/Execute] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute skill' },
      { status: 500 }
    );
  }
}

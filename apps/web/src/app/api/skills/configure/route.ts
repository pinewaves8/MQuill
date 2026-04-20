import { NextResponse } from 'next/server';

import { configureSkills } from '@/lib/skills';

/**
 * POST /api/skills/configure
 *
 * Configure skills with intelligent technique recommendations based on novel metadata.
 *
 * Request body:
 * {
 *   "projectId": "...",
 *   "title": "...",
 *   "description": "...",
 *   "bookType": "novel",
 *   "targetLength": "mid",
 *   "tags": ["玄幻", "修炼"],
 *   "charter": { ... }
 * }
 *
 * Response:
 * {
 *   "data": {
 *     "novelProfile": { ... },
 *     "recommendation": { ... },
 *     "skillConfigs": { ... }
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      projectId,
      title,
      description,
      bookType,
      targetLength,
      tags,
      styleKeywords,
      charter,
    } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const config = configureSkills({
      projectId,
      title,
      description,
      bookType,
      targetLength,
      tags,
      styleKeywords,
      charter,
    });

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error('[Skills/Configure] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to configure skills' },
      { status: 500 }
    );
  }
}

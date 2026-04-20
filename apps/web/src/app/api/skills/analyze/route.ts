import { NextResponse } from 'next/server';

import { analyzeNovel } from '@/lib/skills';

/**
 * POST /api/skills/analyze
 *
 * Analyze novel metadata to extract features for technique recommendation.
 *
 * Request body:
 * {
 *   "title": "...",
 *   "description": "...",
 *   "bookType": "novel",
 *   "targetLength": "mid",
 *   "tags": ["玄幻", "修炼"],
 *   "styleKeywords": ["热血", "逆袭"]
 * }
 *
 * Response:
 * {
 *   "data": {
 *     "novelProfile": {
 *       "genre": ["玄幻"],
 *       "subGenres": ["废柴逆袭", "升级流"],
 *       "tone": ["热血"],
 *       ...
 *     }
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      title,
      description,
      bookType,
      targetLength,
      tags,
      styleKeywords,
      charter,
    } = body;

    const novelProfile = analyzeNovel({
      title,
      description,
      bookType,
      targetLength,
      tags,
      styleKeywords,
      charter,
    });

    return NextResponse.json({ data: { novelProfile } });
  } catch (error) {
    console.error('[Skills/Analyze] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze novel' },
      { status: 500 }
    );
  }
}

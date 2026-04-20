import { NextResponse } from 'next/server';

import { retrieveReferenceExamples, getReferenceLibraryStats, getAllTags } from '@/lib/skills';
import type { ReferenceLibraryType } from '@/lib/skills/skill-interface';

/**
 * GET /api/skills/reference-library
 *
 * Query reference library for technique examples.
 *
 * Query params:
 * - category: "narrative-framework" | "visual-lens" | "writing-technique"
 * - tags: comma-separated list of tags to filter by
 * - works: comma-separated list of source works
 * - mode: "semantic" | "keyword" | "hybrid"
 * - limit: max number of results (default 5)
 * - minQualityScore: minimum quality score (0-100)
 *
 * Response:
 * {
 *   "data": {
 *     "examples": [...],
 *     "stats": { ... },
 *     "availableTags": [...]
 *   }
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category') as ReferenceLibraryType | null;
    const tagsParam = searchParams.get('tags');
    const worksParam = searchParams.get('works');
    const mode = searchParams.get('mode') as 'semantic' | 'keyword' | 'hybrid' | null;
    const limitParam = searchParams.get('limit');
    const minQualityScoreParam = searchParams.get('minQualityScore');

    const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()) : undefined;
    const works = worksParam ? worksParam.split(',').map(w => w.trim()) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 5;
    const minQualityScore = minQualityScoreParam ? parseInt(minQualityScoreParam, 10) : undefined;

    // If category is provided, query examples
    const examples = category
      ? retrieveReferenceExamples({
          libraryId: category,
          mode: mode || 'hybrid',
          maxExamples: limit,
          tags,
          works,
          minQualityScore,
        })
      : [];

    // Get stats for all libraries
    const stats = getReferenceLibraryStats();

    // Get available tags if category is specified
    const availableTags = category ? getAllTags(category) : [];

    return NextResponse.json({
      data: {
        examples,
        stats,
        availableTags,
      },
    });
  } catch (error) {
    console.error('[Skills/ReferenceLibrary] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to query reference library' },
      { status: 500 }
    );
  }
}

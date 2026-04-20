/**
 * Foreshadowing Checker
 *
 * Checks if foreshadowed elements are properly resolved
 * and generates issues for unresolved foreshadowings.
 */

import { ForeshadowingEntry } from '@packages/shared-types';
import { memoryStore } from '@/lib/db/projects-store';

export interface ForeshadowingIssue {
  id: string;
  type: 'unresolved_foreshadow';
  severity: 'low' | 'medium' | 'high';
  description: string;
  hintText: string;
  setupChapter: string;
  suggestion: string;
}

/**
 * Check if chapter content resolves any registered foreshadowings
 */
export async function checkForeshadowingResolution(
  projectId: string,
  chapterId: string,
  chapterTitle: string,
  content: string
): Promise<{
  resolved: ForeshadowingEntry[];
  stillUnresolved: ForeshadowingEntry[];
  issues: ForeshadowingIssue[];
}> {
  const memories = await memoryStore.getByProject(projectId, 'foreshadow');
  const allForeshadowings: ForeshadowingEntry[] = memories
    .filter((m) => m.content.foreshadowings)
    .flatMap((m) => m.content.foreshadowings || []);

  const unresolved = allForeshadowings.filter((f) => !f.resolved && f.setupChapterId !== chapterId);
  const resolved: ForeshadowingEntry[] = [];
  const issues: ForeshadowingIssue[] = [];

  // Check each unresolved foreshadowing
  for (const foreshadow of unresolved) {
    // Simple keyword-based resolution detection
    const hintKeywords = extractKeywords(foreshadow.hintText);
    const contentKeywords = extractKeywords(content);

    // Check if significant keywords from hint appear in resolution form
    const hasResolution = hintKeywords.some((keyword) => {
      // Look for keywords that appear in a "resolved" context
      const resolutionPatterns = [
        new RegExp(`(原来|果然|正如|正如${keyword})`, 'i'),
        new RegExp(`${keyword}[^。]*原来`, 'i'),
        new RegExp(`(揭示|揭露|暴露)${keyword}`, 'i'),
      ];
      return resolutionPatterns.some((pattern) => pattern.test(content));
    });

    if (hasResolution) {
      resolved.push({
        ...foreshadow,
        resolved: true,
        resolvedChapterId: chapterId,
        resolutionText: content.slice(0, 200),
      });
    }
  }

  // Generate issues for still unresolved foreshadowings
  for (const foreshadow of unresolved) {
    if (!resolved.find((r) => r.id === foreshadow.id)) {
      // Check if this foreshadow is approaching its resolution window (near end of novel)
      issues.push({
        id: foreshadow.id,
        type: 'unresolved_foreshadow',
        severity: foreshadow.type === 'event' ? 'high' : 'medium',
        description: `伏笔未回收："${foreshadow.hintText.slice(0, 50)}..."`,
        hintText: foreshadow.hintText,
        setupChapter: foreshadow.setupChapterTitle,
        suggestion: `考虑在后续章节中回收此伏笔：${foreshadow.expectedResolution}`,
      });
    }
  }

  return {
    resolved,
    stillUnresolved: unresolved.filter((f) => !resolved.find((r) => r.id === f.id)),
    issues,
  };
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text: string): string[] {
  // Simple extraction - remove common words and get significant terms
  const stopWords = new Set(['的', '了', '是', '在', '和', '与', '或', '的', '了', '有', '也', '就', '都', '而', '及', '着', '或', '但', '然而']);

  return text
    .split(/[，。！？、；：""''（）【】\s]+/)
    .filter((word) => word.length >= 2 && !stopWords.has(word))
    .slice(0, 10);
}

/**
 * Get foreshadowing statistics for a project
 */
export async function getForeshadowingStats(
  projectId: string
): Promise<{
  total: number;
  resolved: number;
  unresolved: number;
  resolutionRate: number;
}> {
  const memories = await memoryStore.getByProject(projectId, 'foreshadow');
  const allForeshadowings: ForeshadowingEntry[] = memories
    .filter((m) => m.content.foreshadowings)
    .flatMap((m) => m.content.foreshadowings || []);

  const resolved = allForeshadowings.filter((f) => f.resolved).length;
  const total = allForeshadowings.length;

  return {
    total,
    resolved,
    unresolved: total - resolved,
    resolutionRate: total > 0 ? resolved / total : 0,
  };
}

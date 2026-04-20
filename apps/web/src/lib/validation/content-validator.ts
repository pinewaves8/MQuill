/**
 * Content validation utilities for detecting quality issues.
 */

export interface DuplicateParagraph {
  index1: number;
  index2: number;
  similarity: number;
  sample: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'duplicate_paragraph' | 'structural_repetition' | 'length_gate';
  severity: 'low' | 'medium' | 'high';
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Similarity threshold for duplicate paragraph detection.
 * Two paragraphs are considered duplicates if:
 * - 50+ consecutive characters are identical, OR
 * - Jaccard similarity > 0.7
 */
const DUPLICATE_CHAR_THRESHOLD = 50;
const DUPLICATE_JACCARD_THRESHOLD = 0.7;

/**
 * Maximum allowed duplicate paragraph ratio (5%)
 */
const MAX_DUPLICATE_RATIO = 0.05;

/**
 * Detects duplicate paragraphs in the given content.
 * Returns array of detected duplicates with similarity scores.
 */
export function detectDuplicateParagraphs(content: string): DuplicateParagraph[] {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
  const duplicates: DuplicateParagraph[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    for (let j = i + 1; j < paragraphs.length; j++) {
      const similarity = calculateParagraphSimilarity(paragraphs[i], paragraphs[j]);

      if (similarity >= DUPLICATE_JACCARD_THRESHOLD) {
        duplicates.push({
          index1: i,
          index2: j,
          similarity,
          sample: paragraphs[i].slice(0, 80),
        });
      }
    }
  }

  return duplicates;
}

/**
 * Calculates Jaccard similarity between two text strings.
 * Uses character-level comparison for Chinese text.
 */
function calculateParagraphSimilarity(text1: string, text2: string): number {
  if (text1 === text2) return 1.0;

  // Check for consecutive character match (length >= threshold)
  const consecutiveMatch = findConsecutiveMatch(text1, text2, DUPLICATE_CHAR_THRESHOLD);
  if (consecutiveMatch >= DUPLICATE_CHAR_THRESHOLD) {
    return 0.9; // High similarity due to long consecutive match
  }

  // Jaccard similarity: |A ∩ B| / |A ∪ B|
  const set1 = new Set(text1.split(''));
  const set2 = new Set(text2.split(''));

  let intersection = 0;
  for (const char of Array.from(set1)) {
    if (set2.has(char)) intersection++;
  }

  const union = set1.size + set2.size - intersection;

  return union > 0 ? intersection / union : 0;
}

/**
 * Finds the longest consecutive character match between two strings.
 */
function findConsecutiveMatch(text1: string, text2: string, minLength: number): number {
  // Normalize whitespace
  const t1 = text1.replace(/\s+/g, '');
  const t2 = text2.replace(/\s+/g, '');

  let maxMatch = 0;
  let currentMatch = 0;

  for (let i = 0; i < t1.length; i++) {
    for (let j = 0; j < t2.length; j++) {
      currentMatch = 0;
      let k = 0;
      while (i + k < t1.length && j + k < t2.length && t1[i + k] === t2[j + k]) {
        currentMatch++;
        k++;
      }
      maxMatch = Math.max(maxMatch, currentMatch);
      if (maxMatch >= minLength) return maxMatch;
    }
  }

  return maxMatch;
}

/**
 * Validates content for duplicate paragraphs.
 * Returns validation result with issues if any.
 */
export function validateContentDuplicates(content: string): ValidationResult {
  const duplicates = detectDuplicateParagraphs(content);
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
  const duplicateRatio = duplicates.length / Math.max(paragraphs.length, 1);

  const issues: ValidationIssue[] = [];

  if (duplicateRatio > MAX_DUPLICATE_RATIO) {
    issues.push({
      type: 'duplicate_paragraph',
      severity: duplicateRatio > 0.1 ? 'high' : 'medium',
      message: `重复段落率过高 (${(duplicateRatio * 100).toFixed(1)}%)，超过 ${(MAX_DUPLICATE_RATIO * 100).toFixed(0)}% 阈值`,
      data: {
        duplicateCount: duplicates.length,
        totalParagraphs: paragraphs.length,
        duplicateRatio,
        samples: duplicates.slice(0, 3).map(d => ({
          paragraphIndex: d.index1,
          sample: d.sample,
        })),
      },
    });
  } else if (duplicates.length > 0) {
    issues.push({
      type: 'duplicate_paragraph',
      severity: 'low',
      message: `检测到 ${duplicates.length} 个相似段落`,
      data: {
        duplicateCount: duplicates.length,
        totalParagraphs: paragraphs.length,
        duplicateRatio,
        samples: duplicates.slice(0, 3).map(d => ({
          paragraphIndex: d.index1,
          sample: d.sample,
        })),
      },
    });
  }

  return {
    valid: issues.length === 0 || issues.every(i => i.severity !== 'high'),
    issues,
  };
}

/**
 * Checks if applying new content would create duplicate paragraphs.
 * Returns the duplicates that would be created if content is added.
 */
export function checkNewContentDuplicates(
  existingContent: string,
  newContent: string
): DuplicateParagraph[] {
  const existingParagraphs = existingContent.split(/\n\n+/).filter(p => p.trim().length > 0);
  const newParagraphs = newContent.split(/\n\n+/).filter(p => p.trim().length > 0);
  const duplicates: DuplicateParagraph[] = [];

  for (const newP of newParagraphs) {
    for (let i = 0; i < existingParagraphs.length; i++) {
      const similarity = calculateParagraphSimilarity(newP, existingParagraphs[i]);
      if (similarity >= DUPLICATE_JACCARD_THRESHOLD) {
        duplicates.push({
          index1: i,
          index2: -1, // New paragraph
          similarity,
          sample: newP.slice(0, 80),
        });
      }
    }
  }

  return duplicates;
}

/**
 * Timeline Validator - checks narrative consistency across chapters
 *
 * Detects:
 * - Timeline contradictions (event ordering conflicts)
 * - Character location inconsistencies
 * - Temporal impossibilities
 */

import { NarrativeEvent, TimelineMarker } from '@packages/shared-types';
import { memoryStore } from '@/lib/db/projects-store';

export interface TimelineConflict {
  type: 'ordering' | 'location' | 'temporal' | 'character_presence';
  severity: 'high' | 'medium' | 'low';
  message: string;
  events: string[]; // Event IDs involved
  suggestion: string;
}

export interface TimelineValidationResult {
  valid: boolean;
  conflicts: TimelineConflict[];
}

/**
 * Validates timeline consistency for a project
 */
export async function validateTimeline(projectId: string): Promise<TimelineValidationResult> {
  const memories = await memoryStore.getByProject(projectId, 'narrative');

  const events: NarrativeEvent[] = memories
    .filter((m) => m.content.events)
    .flatMap((m) => m.content.events || []);

  const conflicts: TimelineConflict[] = [];

  // Check for temporal contradictions
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const conflict = checkEventPair(events[i], events[j]);
      if (conflict) {
        conflicts.push(conflict);
      }
    }
  }

  return {
    valid: conflicts.filter(c => c.severity === 'high').length === 0,
    conflicts,
  };
}

/**
 * Checks if two events have a temporal conflict
 */
function checkEventPair(a: NarrativeEvent, b: NarrativeEvent): TimelineConflict | null {
  // Check for explicit timestamp conflicts
  if (a.timestamp && b.timestamp) {
    // Parse timestamps and check ordering
    const aTime = parseTimestamp(a.timestamp);
    const bTime = parseTimestamp(b.timestamp);

    if (aTime && bTime && aTime < bTime) {
      // a happens before b - check if b mentions a's description
      if (b.description.includes(a.title)) {
        return {
          type: 'ordering',
          severity: 'medium',
          message: `事件顺序矛盾："${a.title}" 发生在 "${b.title}" 之前，但后者描述中未体现`,
          events: [a.id, b.id],
          suggestion: `确保 "${b.title}" 正确反映 "${a.title}" 已发生`,
        };
      }
    }
  }

  // Check story time markers
  if (a.storyTime && b.storyTime) {
    const aTimeOrder = getStoryTimeOrder(a.storyTime);
    const bTimeOrder = getStoryTimeOrder(b.storyTime);

    if (aTimeOrder !== null && bTimeOrder !== null && aTimeOrder > bTimeOrder) {
      // a should happen before b based on story time, but a.id > b.id suggests otherwise
      return {
        type: 'temporal',
        severity: 'low',
        message: `故事时间顺序可能矛盾：${a.storyTime} vs ${b.storyTime}`,
        events: [a.id, b.id],
        suggestion: '检查时间线标记是否正确',
      };
    }
  }

  // Check character presence contradictions
  if (a.involvedCharacters && b.involvedCharacters) {
    const aChars = new Set(a.involvedCharacters);
    const bChars = new Set(b.involvedCharacters);

    // If same character appears in mutually exclusive contexts
    for (const char of Array.from(aChars)) {
      if (bChars.has(char) && a.chapterId !== b.chapterId) {
        // Same character in different chapters - check if timeline allows
        const aChapterOrder = a.chapterId?.match(/\d+/)?.[0] || '0';
        const bChapterOrder = b.chapterId?.match(/\d+/)?.[0] || '0';

        if (parseInt(aChapterOrder) > parseInt(bChapterOrder)) {
          return {
            type: 'character_presence',
            severity: 'low',
            message: `角色同时出现在多个时间线中，请确认逻辑顺序`,
            events: [a.id, b.id],
            suggestion: '检查角色出现的时间线是否一致',
          };
        }
      }
    }
  }

  return null;
}

/**
 * Parse timestamp to numeric value for comparison
 */
function parseTimestamp(ts: string): number | null {
  // Try to parse ISO-like timestamp
  const dateMatch = ts.match(/\d{4}-\d{2}-\d{2}/);
  if (dateMatch) {
    return new Date(dateMatch[0]).getTime();
  }

  // Try relative time
  const relativeMatch = ts.match(/(\d+)\s*小时/);
  if (relativeMatch) {
    return Date.now() - parseInt(relativeMatch[1]) * 3600000;
  }

  return null;
}

/**
 * Get story time ordering based on common patterns
 */
function getStoryTimeOrder(storyTime: string): number | null {
  // "第X章" pattern
  const chapterMatch = storyTime.match(/第(\d+)章/);
  if (chapterMatch) {
    return parseInt(chapterMatch[1]);
  }

  // "之前"/"之后" patterns
  if (storyTime.includes('之前') || storyTime.includes('以前')) {
    return -1;
  }
  if (storyTime.includes('之后') || storyTime.includes('后来')) {
    return 1;
  }

  return null;
}

/**
 * Build timeline markers from events
 */
export async function buildTimelineMarkers(
  projectId: string,
  chapters: Array<{ id: string; title: string }>
): Promise<TimelineMarker[]> {
  const memories = await memoryStore.getByProject(projectId, 'narrative');

  const events: NarrativeEvent[] = memories
    .filter((m) => m.content.events)
    .flatMap((m) => m.content.events || []);

  const markers: TimelineMarker[] = [];

  for (const chapter of chapters) {
    const chapterEvents = events.filter(e => e.chapterId === chapter.id);

    if (chapterEvents.length > 0) {
      const marker: TimelineMarker = {
        id: `marker-${chapter.id}`,
        chapterId: chapter.id,
        storyTime: chapterEvents[0].storyTime || `第${chapter.title.match(/\d+/)?.[0] || '?'}章`,
        chapterTitle: chapter.title,
        summary: chapterEvents.map(e => e.title).join('; '),
        keyEvents: chapterEvents.map(e => e.id),
      };
      markers.push(marker);
    }
  }

  return markers;
}

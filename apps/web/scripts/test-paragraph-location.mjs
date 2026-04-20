/**
 * Paragraph-level location verification test.
 *
 * Usage:
 * 1. Start the app server first (http://localhost:3001)
 * 2. Run: node apps/web/scripts/test-paragraph-location.mjs
 */

const API_BASE = process.env.MQUILL_API_BASE ?? 'http://localhost:3005/api';

async function requestJson(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  const text = await response.text();
  let payload;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      throw new Error(`Invalid JSON response from ${endpoint}`);
    }
  }

  if (!response.ok) {
    const message = payload?.error ?? text;
    throw new Error(`Request failed for ${endpoint}: ${message}`);
  }

  return payload;
}

async function getChapters(projectId) {
  const data = await requestJson(`/projects/${projectId}/chapters`);
  return data.data?.chapters ?? data.chapters ?? [];
}

async function getChapterDraft(chapterId) {
  const data = await requestJson(`/chapters/${chapterId}/draft`);
  return data.data?.segments ?? data.segments ?? [];
}

async function listIssues(chapterId) {
  const data = await requestJson(`/issues?chapterId=${chapterId}`);
  return data.data?.issues ?? data.issues ?? [];
}

async function evaluateChapter(chapterId) {
  return requestJson(`/agents/evaluate/${chapterId}`, { method: 'POST' });
}

function splitParagraphs(content) {
  // Split by double newlines (paragraph separator)
  return content.split(/\n\n+/).filter(p => p.trim().length > 0);
}

async function verifyParagraphLocation(chapterId) {
  console.log(`\n=== Verifying paragraph location for chapter ${chapterId} ===\n`);

  // Get chapter content
  const segments = await getChapterDraft(chapterId);
  const content = segments.map(s => s.content).join('\n\n');
  const paragraphs = splitParagraphs(content);

  console.log(`Total paragraphs in chapter: ${paragraphs.length}`);
  console.log('\nParagraphs preview:');
  paragraphs.forEach((p, i) => {
    const preview = p.slice(0, 50).replace(/\n/g, ' ');
    console.log(`  [${i}] ${preview}${p.length > 50 ? '...' : ''}`);
  });

  // Evaluate chapter
  console.log('\nRunning evaluation...');
  const evalResult = await evaluateChapter(chapterId);
  const issues = evalResult.data?.issues ?? [];

  console.log(`\nFound ${issues.length} issues`);

  let validLocationCount = 0;
  let invalidLocationCount = 0;
  const results = [];

  for (const issue of issues) {
    const paragraphIndex = issue.paragraphIndex;
    const excerpt = issue.excerpt;

    console.log(`\n--- Issue: ${issue.title} ---`);
    console.log(`  paragraphIndex: ${paragraphIndex}`);
    console.log(`  excerpt: "${excerpt?.slice(0, 80)}..."`);

    if (paragraphIndex === undefined || paragraphIndex === null) {
      console.log(`  ❌ NO paragraphIndex (undefined/null)`);
      results.push({ issueId: issue.id, status: 'missing_index', paragraphIndex });
      invalidLocationCount++;
      continue;
    }

    if (paragraphIndex < 0 || paragraphIndex >= paragraphs.length) {
      console.log(`  ❌ INVALID paragraphIndex (out of range: 0-${paragraphs.length - 1})`);
      results.push({ issueId: issue.id, status: 'out_of_range', paragraphIndex, maxIndex: paragraphs.length - 1 });
      invalidLocationCount++;
      continue;
    }

    // Check if excerpt matches the paragraph at paragraphIndex
    const targetParagraph = paragraphs[paragraphIndex];
    const excerptNormalized = excerpt?.replace(/\s+/g, '').slice(0, 50);
    const paragraphNormalized = targetParagraph?.replace(/\s+/g, '').slice(0, 50);

    if (excerpt && paragraphNormalized && excerptNormalized === paragraphNormalized) {
      console.log(`  ✅ CORRECT: excerpt matches paragraph[${paragraphIndex}]`);
      results.push({ issueId: issue.id, status: 'correct', paragraphIndex });
      validLocationCount++;
    } else if (excerpt && targetParagraph?.includes(excerpt.slice(0, 30))) {
      console.log(`  ⚠️ PARTIAL: excerpt found in paragraph[${paragraphIndex}] but not exact match`);
      results.push({ issueId: issue.id, status: 'partial', paragraphIndex });
      validLocationCount++;
    } else {
      console.log(`  ❌ MISMATCH: excerpt does not match paragraph[${paragraphIndex}]`);
      console.log(`    Expected excerpt to start with: "${targetParagraph?.slice(0, 50)}..."`);
      results.push({ issueId: issue.id, status: 'mismatch', paragraphIndex });
      invalidLocationCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total issues: ${issues.length}`);
  console.log(`Valid location: ${validLocationCount}`);
  console.log(`Invalid location: ${invalidLocationCount}`);

  if (validLocationCount === issues.length && issues.length > 0) {
    console.log('\n✅ All issues have correct paragraph locations!');
  } else if (invalidLocationCount > 0) {
    console.log('\n⚠️ Some issues have incorrect paragraph locations');
  }

  return { validLocationCount, invalidLocationCount, results };
}

async function main() {
  // Use the project with actual content from baseline test
  const projectId = '5de74f40-15e2-4c29-954b-957855e3f677';
  console.log(`Testing with project: 燕山雪夜录 (${projectId})`);

  const chapters = await getChapters(projectId);
  console.log(`Found ${chapters.length} chapters`);

  if (chapters.length === 0) {
    console.log('No chapters found.');
    return;
  }

  const chapter = chapters[0];
  console.log(`Testing with chapter: ${chapter.title} (${chapter.id})`);

  // Check if chapter has content
  const segments = await getChapterDraft(chapter.id);
  const totalWords = segments.reduce((sum, s) => sum + s.content.length, 0);
  console.log(`Chapter content: ${segments.length} segments, ${totalWords} chars`);

  if (totalWords < 100) {
    console.log('Chapter has insufficient content for evaluation.');
    return;
  }

  await verifyParagraphLocation(chapter.id);
}

main().catch(console.error);

/**
 * Wuxia baseline end-to-end test.
 *
 * Usage:
 * 1. Start the app server first, typically on http://localhost:3001
 * 2. Run: node apps/web/scripts/run-wuxia-baseline.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API_BASE = process.env.MQUILL_API_BASE ?? 'http://localhost:3001/api';
const OUTPUT_DIR = path.resolve(process.cwd(), 'docs', 'test-runs');
const TARGET_CHAPTERS = 2;
const TARGET_WORDS = 6000;
const MAX_DUPLICATE_RATIO = 0.05;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function summarizeError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function parseErrorPayload(message) {
  const jsonStart = message.indexOf('{');

  if (jsonStart < 0) {
    return null;
  }

  try {
    return JSON.parse(message.slice(jsonStart));
  } catch {
    return null;
  }
}

function categorizeFailure(reason) {
  if (reason.includes('duplicate_paragraph')) {
    return 'duplicate_paragraph';
  }

  if (reason.includes('below minimum')) {
    return 'length_gate';
  }

  if (reason.includes('shrank too much')) {
    return 'revision_too_short';
  }

  if (reason.includes('expanded too much')) {
    return 'revision_too_long';
  }

  if (reason.includes('Export quality gate failed')) {
    return 'export_gate';
  }

  return 'other';
}

function calculateDuplicateRatio(content) {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
  if (paragraphs.length === 0) return 0;

  let duplicates = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    for (let j = i + 1; j < paragraphs.length; j++) {
      if (calculateJaccardSimilarity(paragraphs[i], paragraphs[j]) > 0.7) {
        duplicates++;
      }
    }
  }

  return duplicates / paragraphs.length;
}

function calculateJaccardSimilarity(text1, text2) {
  if (text1 === text2) return 1.0;
  const set1 = new Set(text1.split(''));
  const set2 = new Set(text2.split(''));
  let intersection = 0;
  for (const char of set1) {
    if (set2.has(char)) intersection++;
  }
  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function validateTwoLayer(baselineReport, exportedContent) {
  const layer1Passes = baselineReport.chapterReports.length === TARGET_CHAPTERS &&
    baselineReport.totalScenes >= TARGET_CHAPTERS * 2 &&
    baselineReport.totalRevisedIssues / Math.max(baselineReport.totalIssues, 1) >= 0.8;

  const duplicateRatio = calculateDuplicateRatio(exportedContent);
  const wordCountPass = baselineReport.totalWords >= TARGET_WORDS * 0.8;
  const duplicatePass = duplicateRatio <= MAX_DUPLICATE_RATIO;
  const failureRateAcceptable = Object.values(baselineReport.failureCategories)
    .reduce((sum, count) => sum + count, 0) < baselineReport.totalIssues * 0.3;

  const layer2Passes = wordCountPass && duplicatePass && failureRateAcceptable;

  return {
    layer1: {
      passes: layer1Passes,
      criteria: {
        chapterCount: { expected: TARGET_CHAPTERS, actual: baselineReport.chapterReports.length, pass: baselineReport.chapterReports.length === TARGET_CHAPTERS },
        minScenesPerChapter: { expected: 2, actual: baselineReport.totalScenes / Math.max(baselineReport.chapterReports.length, 1), pass: baselineReport.totalScenes / Math.max(baselineReport.chapterReports.length, 1) >= 2 },
        revisionSuccessRate: { expected: 0.8, actual: baselineReport.totalRevisedIssues / Math.max(baselineReport.totalIssues, 1), pass: baselineReport.totalRevisedIssues / Math.max(baselineReport.totalIssues, 1) >= 0.8 },
      },
      summary: layer1Passes ? 'PASS' : 'FAIL',
    },
    layer2: {
      passes: layer2Passes,
      criteria: {
        wordCount: { expected: TARGET_WORDS * 0.8, actual: baselineReport.totalWords, pass: wordCountPass },
        duplicateRatio: { expected: MAX_DUPLICATE_RATIO, actual: duplicateRatio, pass: duplicatePass },
        failureRate: { expected: 0.3, actual: Object.values(baselineReport.failureCategories).reduce((sum, c) => sum + c, 0) / Math.max(baselineReport.totalIssues, 1), pass: failureRateAcceptable },
      },
      summary: layer2Passes ? 'PASS' : 'FAIL',
    },
    overallPass: layer1Passes && layer2Passes,
  };
}

function recordFailure(baselineReport, reason) {
  const category = categorizeFailure(reason);
  baselineReport.failureCategories[category] = (baselineReport.failureCategories[category] ?? 0) + 1;
}

async function ensureOutputDir() {
  await mkdir(OUTPUT_DIR, { recursive: true });
}

async function requestJson(endpoint, options) {
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
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : text || `Request failed with status ${response.status}`;
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  if (!payload || !('data' in payload) || payload.data === undefined) {
    throw new Error(`Missing data payload from ${endpoint}`);
  }

  return payload.data;
}

async function requestText(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return text;
}

async function checkServer() {
  await requestJson('/projects');
}

async function createProject() {
  const data = await requestJson('/projects', {
    method: 'POST',
    body: JSON.stringify({
      title: '燕山雪夜录',
      bookType: 'novel',
      targetLength: 'short',
      language: 'zh',
      mode: 'auto',
      description:
        '写一部短篇武侠小说，预计两章，总字数约6000字。故事需具备江湖门派、旧案恩怨、人物抉择与情义冲突，整体追求可发表的文学质感：语言凝练、人物鲜明、冲突递进、结尾留有余韵。',
      styleKeywords: ['武侠', '短篇', '江湖恩怨', '冷峻', '写意', '发表级'],
      coverTone: 'ink',
      viewpoint: 'third_person',
      targetAudience: '武侠与文学向读者',
    }),
  });

  return data.project;
}

async function generateCharter(projectId) {
  return requestJson(`/agents/bootstrap/${projectId}`, { method: 'POST' });
}

async function generateOutline(projectId) {
  const data = await requestJson('/agents/outline', {
    method: 'POST',
    body: JSON.stringify({ projectId }),
  });

  return data.outline;
}

function selectTwoChapterOutline(outline) {
  const selectedVolumes = [];
  let remaining = TARGET_CHAPTERS;

  for (const volume of outline.volumes) {
    if (remaining <= 0) {
      break;
    }

    const chosenChapters = volume.chapters.slice(0, remaining);
    if (chosenChapters.length === 0) {
      continue;
    }

    selectedVolumes.push({
      ...volume,
      chapters: chosenChapters,
    });

    remaining -= chosenChapters.length;
  }

  if (remaining > 0) {
    throw new Error(`Outline only produced ${TARGET_CHAPTERS - remaining} chapters, not enough for the baseline.`);
  }

  return selectedVolumes;
}

async function getChapters(projectId) {
  const data = await requestJson(`/projects/${projectId}/chapters`);
  return [...data.chapters].sort((a, b) => a.sortOrder - b.sortOrder);
}

async function deleteChapter(chapterId) {
  await requestJson(`/chapters/${chapterId}`, { method: 'DELETE' });
}

async function importChapters(projectId, volumes) {
  await requestJson(`/projects/${projectId}/chapters/from-outline`, {
    method: 'POST',
    body: JSON.stringify({ volumes }),
  });

  return getChapters(projectId);
}

async function generateScenes(projectId, chapterId) {
  const data = await requestJson(`/projects/${projectId}/scenes/from-outline`, {
    method: 'POST',
    body: JSON.stringify({ chapterId }),
  });

  return data.scenes;
}

async function confirmScene(sceneId) {
  await requestJson(`/scenes/${sceneId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'confirmed' }),
  });
}

async function generateDraft(sceneId) {
  const data = await requestJson(`/scenes/${sceneId}/generate-draft`, { method: 'POST' });
  return data.segment;
}

async function createSnapshot(chapterId, label, summary) {
  const data = await requestJson(`/chapters/${chapterId}/versions`, {
    method: 'POST',
    body: JSON.stringify({
      label,
      summary,
      source: 'baseline-test',
    }),
  });

  return data.version;
}

async function evaluateChapter(chapterId) {
  return requestJson(`/agents/evaluate/${chapterId}`, { method: 'POST' });
}

async function listIssues(chapterId) {
  const data = await requestJson(`/issues?chapterId=${chapterId}`);
  return data.issues;
}

async function listRevisions(chapterId) {
  const data = await requestJson(`/revisions?chapterId=${chapterId}`);
  return data.revisions;
}

async function createRevisionFromIssue(issueId) {
  const data = await requestJson(`/issues/${issueId}/create-revision`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  return data.revision;
}

async function runRevision(revisionId) {
  const data = await requestJson(`/revisions/${revisionId}/run`, { method: 'POST' });
  return data.candidate;
}

async function applyCandidate(candidateId, mode) {
  const data = await requestJson(`/revision-candidates/${candidateId}/apply`, {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });

  return data.version;
}

async function exportNovel(projectId) {
  return requestText(`/export/${projectId}?format=markdown`);
}

function countWords(text) {
  return text.replace(/\s+/g, '').length;
}

async function processIssuesForChapter(chapter, chapterReport, baselineReport) {
  const issues = await listIssues(chapter.id);
  const revisions = await listRevisions(chapter.id);

  chapterReport.issueCount = issues.length;
  baselineReport.totalIssues += issues.length;

  const actionableIssues = issues.filter((issue) => issue.status !== 'wont_fix');

  for (const issue of actionableIssues) {
    try {
      let revision = revisions.find((item) => item.linkedIssueId === issue.id);

      if (!revision) {
        revision = await createRevisionFromIssue(issue.id);
      }

      const candidate = await runRevision(revision.id);
      await applyCandidate(candidate.id, revision.applyMode ?? 'replace');
      chapterReport.revisedIssues.push(issue.id);
      baselineReport.totalRevisedIssues += 1;
    } catch (error) {
      const reason = summarizeError(error);
      chapterReport.failedIssues.push({ issueId: issue.id, reason });
      baselineReport.failures.push(`Chapter "${chapter.title}" issue "${issue.title}" failed: ${reason}`);
      recordFailure(baselineReport, reason);
    }
  }
}

async function main() {
  const startedAt = new Date();
  const runId = timestamp();

  const baselineReport = {
    runId,
    apiBase: API_BASE,
    startedAt: startedAt.toISOString(),
    importedChapterTitles: [],
    chapterReports: [],
    totalScenes: 0,
    totalDraftSegments: 0,
    totalWords: 0,
    totalIssues: 0,
    totalRevisedIssues: 0,
    failureCategories: {},
    exportGateIssues: [],
    notes: [],
    failures: [],
  };

  await ensureOutputDir();

  try {
    console.log('=== MQuill 武侠基线测试开始 ===');
    await checkServer();
    console.log(`API server ready at ${API_BASE}`);

    const project = await createProject();
    baselineReport.project = { id: project.id, title: project.title };
    console.log(`1. Created project: ${project.title} (${project.id})`);

    const charterResult = await generateCharter(project.id);
    baselineReport.charter = charterResult.charter;
    console.log('2. Charter generated');

    const outline = await generateOutline(project.id);
    const selectedVolumes = selectTwoChapterOutline(outline);
    baselineReport.importedChapterTitles = selectedVolumes.flatMap((volume) =>
      volume.chapters.map((chapter) => chapter.title)
    );
    console.log(`3. Outline generated, selected chapters: ${baselineReport.importedChapterTitles.join(' / ')}`);

    const defaultChapters = await getChapters(project.id);
    for (const chapter of defaultChapters) {
      await deleteChapter(chapter.id);
    }
    baselineReport.notes.push(`Deleted ${defaultChapters.length} default chapter(s) before import to keep the baseline fixed at two chapters.`);

    const importedChapters = await importChapters(project.id, selectedVolumes);
    if (importedChapters.length !== TARGET_CHAPTERS) {
      baselineReport.notes.push(`Expected ${TARGET_CHAPTERS} chapters after import but got ${importedChapters.length}.`);
    }
    console.log(`4. Imported ${importedChapters.length} chapter(s) from outline`);

    for (const chapter of importedChapters) {
      const chapterReport = {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        sceneCount: 0,
        draftSegments: 0,
        draftWordCount: 0,
        snapshotLabel: undefined,
        evaluationScore: undefined,
        issueCount: 0,
        revisedIssues: [],
        failedIssues: [],
      };
      baselineReport.chapterReports.push(chapterReport);

      console.log(`Processing chapter: ${chapter.title}`);
      const scenes = await generateScenes(project.id, chapter.id);
      chapterReport.sceneCount = scenes.length;
      baselineReport.totalScenes += scenes.length;
      console.log(`5. Generated ${scenes.length} scene(s)`);

      for (const scene of scenes) {
        await confirmScene(scene.id);
      }

      for (const scene of scenes) {
        const segment = await generateDraft(scene.id);
        const segmentWords = countWords(segment.content);
        chapterReport.draftSegments += 1;
        chapterReport.draftWordCount += segmentWords;
        baselineReport.totalDraftSegments += 1;
      }
      baselineReport.totalWords += chapterReport.draftWordCount;
      console.log(`6. Generated ${chapterReport.draftSegments} draft segment(s), ${chapterReport.draftWordCount} chars`);

      const snapshot = await createSnapshot(
        chapter.id,
        `武侠基线初始版本-${chapter.title}`,
        '武侠基线测试：章节正文生成后的初始快照'
      );
      chapterReport.snapshotLabel = snapshot.label;
      console.log(`7. Snapshot created: ${snapshot.label}`);

      const evaluation = await evaluateChapter(chapter.id);
      chapterReport.evaluationScore = evaluation.evaluationResult?.scores?.total ?? undefined;
      console.log(`8. Evaluation score: ${chapterReport.evaluationScore ?? 'n/a'}`);

      await processIssuesForChapter(chapter, chapterReport, baselineReport);
      console.log(`9. Revised ${chapterReport.revisedIssues.length}/${chapterReport.issueCount} issue(s) for ${chapter.title}`);
    }

    const markdown = await exportNovel(project.id);
    const markdownPath = path.join(OUTPUT_DIR, `${runId}-wuxia-baseline.md`);
    await writeFile(markdownPath, markdown, 'utf8');
    baselineReport.outputMarkdownPath = markdownPath;
    baselineReport.totalWords = countWords(markdown);
    console.log(`10. Exported novel to ${markdownPath}`);

    if (baselineReport.totalWords < TARGET_WORDS * 0.8) {
      baselineReport.notes.push(
        `Final length ${baselineReport.totalWords} is below the expected baseline floor ${Math.round(TARGET_WORDS * 0.8)}.`
      );
    }

    if (baselineReport.totalRevisedIssues === 0) {
      baselineReport.notes.push('No issues were revised. This weakens the usefulness of the baseline for revision quality checks.');
    }
  } catch (error) {
    const reason = summarizeError(error);
    baselineReport.failures.push(reason);
    recordFailure(baselineReport, reason);

    const payload = parseErrorPayload(reason);
    if (Array.isArray(payload?.data?.issues)) {
      baselineReport.exportGateIssues = payload.data.issues;
      baselineReport.notes.push(
        `Export gate returned ${payload.data.issues.length} structured issue(s).`
      );
    }

    console.error('Baseline test failed:', error);
    process.exitCode = 1;
  } finally {
    const finishedAt = new Date();
    baselineReport.finishedAt = finishedAt.toISOString();
    baselineReport.elapsedMs = finishedAt.getTime() - startedAt.getTime();

    // Calculate validation result (two-layer)
    const exportedContent = baselineReport.outputMarkdownPath
      ? await import('node:fs').then(fs => fs.readFileSync(baselineReport.outputMarkdownPath, 'utf8').replace(/^#+ .*/gm, '').replace(/\n/g, ''))
      : '';
    baselineReport.validation = validateTwoLayer(baselineReport, exportedContent);

    const reportPath = path.join(OUTPUT_DIR, `${runId}-wuxia-baseline-report.json`);
    baselineReport.outputReportPath = reportPath;
    await writeFile(reportPath, JSON.stringify(baselineReport, null, 2), 'utf8');

    console.log('=== MQuill 武侠基线测试结束 ===');
    console.log(`Report: ${reportPath}`);
    console.log(`流程闭环验收: ${baselineReport.validation.layer1.summary}`);
    console.log(`质量门禁验收: ${baselineReport.validation.layer2.summary}`);
    console.log(`Overall: ${baselineReport.validation.overallPass ? 'PASS' : 'FAIL'}`);
    console.log(`Failures: ${baselineReport.failures.length}`);
    console.log(`Words: ${baselineReport.totalWords}`);
    console.log(`Issues revised: ${baselineReport.totalRevisedIssues}`);
  }
}

await main();

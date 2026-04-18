/**
 * 全自动生成短篇小说测试脚本
 *
 * 运行方式:
 * 1. 确保 Next.js 开发服务器正在运行 (npm run dev)
 * 2. 在项目根目录运行: npx tsx apps/web/scripts/generate-novel.ts
 *
 * 功能:
 * 1. 创建项目
 * 2. 生成 Charter (世界观、人物、规则)
 * 3. 生成大纲 (卷和章节)
 * 4. 从大纲导入章节
 * 5. 为每个章节生成场景
 * 6. 为每个场景生成正文
 * 7. 导出完整小说
 */

const API_BASE = 'http://localhost:3001/api';

interface Project {
  id: string;
  title: string;
  status: string;
  wordCount: number;
}

interface Chapter {
  id: string;
  projectId: string;
  title: string;
  sortOrder: number;
  status: string;
  wordCount: number;
}

interface Scene {
  id: string;
  chapterId: string;
  title: string;
  status: string;
}

interface DraftSegment {
  id: string;
  chapterId: string;
  content: string;
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API Error: ${res.status} - ${error}`);
  }

  return res.json();
}

async function createProject(): Promise<Project> {
  console.log('\n📝 步骤1: 创建项目...');

  const res = await fetchJSON<{ project: Project }>(`${API_BASE}/projects`, {
    method: 'POST',
    body: JSON.stringify({
      title: '星际迷途',
      bookType: 'novel',
      targetLength: 'short', // 短篇约3万字
      language: 'zh',
      mode: 'auto',
      description: '一艘星际货船在穿越虫洞时迷失方向，来到一个未知的星系。这里存在着一个古老的文明，他们的技术已经超越人类的想象。船长李翰必须带领船员找到回家的路，同时揭开这个文明消失的真相。',
      styleKeywords: ['科幻', '星际探险', '悬疑', '热血'],
      coverTone: 'blue',
    }),
  });

  console.log(`✅ 项目创建成功: ${res.project.title} (ID: ${res.project.id})`);
  return res.project;
}

async function generateCharter(projectId: string): Promise<void> {
  console.log('\n📚 步骤2: 生成 Charter (世界观设定)...');

  await fetchJSON(`${API_BASE}/agents/bootstrap/${projectId}`, {
    method: 'POST',
  });

  console.log('✅ Charter 生成成功!');
}

async function generateOutline(projectId: string): Promise<any> {
  console.log('\n📋 步骤3: 生成小说大纲...');

  const res = await fetchJSON<{ outline: any }>(`${API_BASE}/agents/outline`, {
    method: 'POST',
    body: JSON.stringify({ projectId }),
  });

  const outline = res.outline;
  console.log(`✅ 大纲生成成功!`);
  console.log(`   卷数: ${outline.volumes.length}`);
  let totalChapters = 0;
  outline.volumes.forEach((v: any, i: number) => {
    console.log(`   卷${i + 1} "${v.title}": ${v.chapters.length} 章`);
    totalChapters += v.chapters.length;
  });
  console.log(`   总章节数: ${totalChapters}`);

  return outline;
}

async function importChaptersFromOutline(projectId: string, outline: any): Promise<void> {
  console.log('\n📖 步骤4: 从大纲导入章节...');

  const res = await fetchJSON<{ count: number }>(
    `${API_BASE}/projects/${projectId}/chapters/from-outline`,
    {
      method: 'POST',
      body: JSON.stringify({ volumes: outline.volumes }),
    }
  );

  console.log(`✅ 成功导入 ${res.count} 个章节!`);
}

async function getChapters(projectId: string): Promise<Chapter[]> {
  const res = await fetchJSON<{ chapters: Chapter[] }>(
    `${API_BASE}/projects/${projectId}/chapters`
  );

  return res.chapters.sort((a, b) => a.sortOrder - b.sortOrder);
}

async function generateScenesFromOutline(projectId: string, chapterId: string): Promise<Scene[]> {
  console.log(`   生成场景中...`);

  const res = await fetchJSON<{ scenes: Scene[] }>(
    `${API_BASE}/projects/${projectId}/scenes/from-outline`,
    {
      method: 'POST',
      body: JSON.stringify({ chapterId }),
    }
  );

  return res.scenes;
}

async function confirmScene(sceneId: string): Promise<void> {
  await fetchJSON(`${API_BASE}/scenes/${sceneId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'confirmed' }),
  });
}

async function generateSceneDraft(sceneId: string): Promise<DraftSegment> {
  const res = await fetchJSON<{ segment: DraftSegment }>(
    `${API_BASE}/scenes/${sceneId}/generate-draft`,
    { method: 'POST' }
  );

  return res.segment;
}

async function exportNovel(projectId: string): Promise<string> {
  console.log('\n📤 步骤7: 导出小说...');

  const res = await fetch(`${API_BASE}/export/${projectId}?format=markdown`);
  const markdown = await res.text();

  console.log(`✅ 小说导出成功!`);
  return markdown;
}

async function getProjectProgress(projectId: string): Promise<any> {
  return fetchJSON<any>(`${API_BASE}/projects/${projectId}/progress`);
}

async function main() {
  console.log('===========================================');
  console.log('🚀 全自动短篇小说生成测试');
  console.log('===========================================');

  const startTime = Date.now();

  try {
    // 1. 创建项目
    const project = await createProject();

    // 2. 生成 Charter
    await generateCharter(project.id);

    // 3. 生成大纲
    const outline = await generateOutline(project.id);

    // 4. 从大纲导入章节
    await importChaptersFromOutline(project.id, outline);

    // 5. 获取所有章节
    const chapters = await getChapters(project.id);
    console.log(`\n📑 获取到 ${chapters.length} 个章节`);

    // 6. 遍历每个章节：生成场景 → 确认场景 → 生成正文
    let totalScenes = 0;
    let totalSegments = 0;

    for (const chapter of chapters) {
      console.log(`\n处理章节: ${chapter.title}`);

      // 生成2-3个场景
      const scenes = await generateScenesFromOutline(project.id, chapter.id);
      console.log(`   生成 ${scenes.length} 个场景`);
      totalScenes += scenes.length;

      // 确认所有场景
      for (const scene of scenes) {
        await confirmScene(scene.id);
      }
      console.log(`   场景已确认`);

      // 为每个场景生成正文
      for (const scene of scenes) {
        const segment = await generateSceneDraft(scene.id);
        totalSegments++;
        console.log(`   ✅ 场景 "${scene.title}": 生成 ${segment.content.length} 字`);
      }
    }

    // 7. 导出小说
    const markdown = await exportNovel(project.id);

    // 计算总字数
    const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n===========================================');
    console.log('📊 生成统计');
    console.log('===========================================');
    console.log(`项目: ${project.title}`);
    console.log(`卷数: ${outline.volumes.length}`);
    console.log(`章节数: ${chapters.length}`);
    console.log(`场景数: ${totalScenes}`);
    console.log(`正文段数: ${totalSegments}`);
    console.log(`总字数: ${totalWords.toLocaleString()}`);
    console.log(`耗时: ${elapsedSeconds}秒`);
    console.log('===========================================');

    // 保存小说到文件
    const fs = await import('fs');
    const outputPath = `./${project.title}_${Date.now()}.md`;
    fs.writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`\n📁 小说已保存到: ${outputPath}`);

    console.log('\n✅ 全自动生成完成!');

  } catch (error) {
    console.error('\n❌ 生成失败:', error);
    process.exit(1);
  }
}

main();

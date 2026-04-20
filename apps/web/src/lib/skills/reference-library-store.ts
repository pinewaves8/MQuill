/**
 * Reference Library Store - Storage and retrieval for reference examples
 *
 * Three-tier reference library system:
 * - narrative-framework: 大纲、梗概结构
 * - visual-lens: 场景、细节、画面
 * - writing-technique: 笔法、技法
 *
 * Supports semantic and keyword retrieval modes.
 */

import type { ReferenceExample, ReferenceLibraryType } from './skill-interface';

// ============================================================
// Library Data Structure
// ============================================================

interface ReferenceLibrary {
  library_id: ReferenceLibraryType;
  examples: ReferenceExample[];
  tags: Set<string>;
  workIndex: Map<string, ReferenceExample[]>; // by source_work
  tagIndex: Map<string, ReferenceExample[]>; // by technique_tags
}

// ============================================================
// In-Memory Store
// ============================================================

const libraries: Record<ReferenceLibraryType, ReferenceLibrary> = {
  'narrative-framework': {
    library_id: 'narrative-framework',
    examples: [],
    tags: new Set(),
    workIndex: new Map(),
    tagIndex: new Map(),
  },
  'visual-lens': {
    library_id: 'visual-lens',
    examples: [],
    tags: new Set(),
    workIndex: new Map(),
    tagIndex: new Map(),
  },
  'writing-technique': {
    library_id: 'writing-technique',
    examples: [],
    tags: new Set(),
    workIndex: new Map(),
    tagIndex: new Map(),
  },
};

// ============================================================
// Registration
// ============================================================

export function registerReferenceExample(example: ReferenceExample): void {
  const library = libraries[example.category];
  if (!library) {
    console.error(`Unknown reference library category: ${example.category}`);
    return;
  }

  // Avoid duplicates by ID
  if (library.examples.some((e) => e.id === example.id)) {
    return;
  }

  library.examples.push(example);

  // Index by work
  if (example.source_work) {
    const existing = library.workIndex.get(example.source_work) ?? [];
    existing.push(example);
    library.workIndex.set(example.source_work, existing);
  }

  // Index by tags
  if (example.technique_tags) {
    for (const tag of example.technique_tags) {
      library.tags.add(tag);
      const existing = library.tagIndex.get(tag) ?? [];
      existing.push(example);
      library.tagIndex.set(tag, existing);
    }
  }
}

export function registerReferenceExamples(examples: ReferenceExample[]): void {
  for (const example of examples) {
    registerReferenceExample(example);
  }
}

// ============================================================
// Retrieval
// ============================================================

export interface RetrievalOptions {
  libraryId: ReferenceLibraryType;
  mode: 'semantic' | 'keyword' | 'hybrid';
  maxExamples?: number;
  tags?: string[];
  works?: string[];
  minQualityScore?: number;
}

export function retrieveReferenceExamples(
  options: RetrievalOptions
): ReferenceExample[] {
  const { libraryId, mode, maxExamples = 5, tags, works, minQualityScore } = options;
  const library = libraries[libraryId];

  if (!library) {
    console.error(`Unknown reference library: ${libraryId}`);
    return [];
  }

  let candidates = [...library.examples];

  // Filter by quality score
  if (minQualityScore !== undefined) {
    candidates = candidates.filter(
      (e) => e.quality_score !== undefined && e.quality_score >= minQualityScore
    );
  }

  // Filter by works
  if (works && works.length > 0) {
    candidates = candidates.filter((e) => e.source_work && works.includes(e.source_work));
  }

  // Filter by tags
  if (tags && tags.length > 0) {
    candidates = candidates.filter((e) =>
      e.technique_tags?.some((tag) => tags.includes(tag))
    );
  }

  // Sort by quality score if available
  candidates.sort((a, b) => {
    const scoreA = a.quality_score ?? 50;
    const scoreB = b.quality_score ?? 50;
    return scoreB - scoreA;
  });

  return candidates.slice(0, maxExamples);
}

export function retrieveByTags(
  libraryId: ReferenceLibraryType,
  tags: string[],
  maxExamples: number = 5
): ReferenceExample[] {
  return retrieveReferenceExamples({
    libraryId,
    mode: 'keyword',
    tags,
    maxExamples,
  });
}

export function retrieveByWorks(
  libraryId: ReferenceLibraryType,
  works: string[],
  maxExamples: number = 5
): ReferenceExample[] {
  return retrieveReferenceExamples({
    libraryId,
    mode: 'keyword',
    works,
    maxExamples,
  });
}

// ============================================================
// Query Interface
// ============================================================

export function getReferenceLibraryStats(): Record<ReferenceLibraryType, { count: number; tags: number }> {
  return {
    'narrative-framework': {
      count: libraries['narrative-framework'].examples.length,
      tags: libraries['narrative-framework'].tags.size,
    },
    'visual-lens': {
      count: libraries['visual-lens'].examples.length,
      tags: libraries['visual-lens'].tags.size,
    },
    'writing-technique': {
      count: libraries['writing-technique'].examples.length,
      tags: libraries['writing-technique'].tags.size,
    },
  };
}

export function getAllTags(libraryId: ReferenceLibraryType): string[] {
  const library = libraries[libraryId];
  if (!library) return [];
  return Array.from(library.tags).sort();
}

export function clearLibrary(libraryId: ReferenceLibraryType): void {
  const library = libraries[libraryId];
  if (!library) return;
  library.examples = [];
  library.tags.clear();
  library.workIndex.clear();
  library.tagIndex.clear();
}

// ============================================================
// Preloaded Reference Examples
// ============================================================

// Chinese Classical Writing Techniques (金圣叹, 毛宗岗, 脂砚斋, 张竹坡)
const chineseClassicalExamples: ReferenceExample[] = [
  {
    id: 'cc-jst-001',
    title: '草蛇灰线·武松哨棒',
    category: 'writing-technique',
    content: '武松正带着哨棒起身去景阳冈，酒保追出来喊"阿呀，这是我家的酒发开了"。后文武松打虎时，哨棒折断，徒手打虎。前后呼应，伏笔浑然天成。',
    technique_tags: ['草蛇灰线', '伏笔照应', '金圣叹'],
    source_author: '施耐庵',
    source_work: '水浒传',
    quality_score: 95,
  },
  {
    id: 'cc-jst-002',
    title: '背面铺粉法·林冲娘子',
    category: 'writing-technique',
    content: '高衙内调戏林冲娘子，不直接写林冲愤怒，而写林冲"也横身在里八花九转"护住娘子。以旁观者反应衬主角处境。',
    technique_tags: ['背面铺粉', '对比衬托', '金圣叹'],
    source_author: '施耐庵',
    source_work: '水浒传',
    quality_score: 92,
  },
  {
    id: 'cc-mzg-001',
    title: '横云断山法·三顾茅庐',
    category: 'writing-technique',
    content: '刘备一顾茅庐，遇崔州平；崔州平论古今成败，笔势横绝。二顾茅庐，遇石广元、孟节公等，叙话别事。三顾时，直入草庐，笔墨顿然合拢。横云断山，妙在断处不断。',
    technique_tags: ['横云断山', '结构布局', '毛宗岗'],
    source_author: '罗贯中',
    source_work: '三国演义',
    quality_score: 94,
  },
  {
    id: 'cc-zyz-001',
    title: '烘云托月法·王熙凤出场',
    category: 'writing-technique',
    content: '林黛玉入贾府，众人皆有限定描写。独有王熙凤，先写贾母笑道"他是我们这里有名的一个泼辣货"，再写彩绣辉煌，恍若神妃仙子。周围人物皆为烘托，独占云端。',
    technique_tags: ['烘云托月', '人物塑造', '脂砚斋'],
    source_author: '曹雪芹',
    source_work: '红楼梦',
    quality_score: 96,
  },
  {
    id: 'cc-zzp-001',
    title: '一击两鸣·刘姥姥一进荣国府',
    category: 'writing-technique',
    content: '刘姥姥进荣国府，一进写其卑微、凤姐之富；二进写其粗鄙、贾母之贵。同一人物，两番进府，互相比照，一击而两鸣。',
    technique_tags: ['一击两鸣', '结构布局', '张竹坡'],
    source_author: '曹雪芹',
    source_work: '红楼梦',
    quality_score: 93,
  },
];

// Chinese Modern Wuxia Techniques (金庸, 古龙)
const chineseModernExamples: ReferenceExample[] = [
  {
    id: 'cm-jy-001',
    title: '草蛇灰线·萧峰身世',
    category: 'writing-technique',
    content: '萧峰出场，胸口狼头纹身，仅作点缀。杏子林事件、马夫人揭真相、萧峰认父，三段文字遥相呼应。伏笔跨越全书五十回，回收时读者恍然大悟。',
    technique_tags: ['草蛇灰线', '伏笔照应', '金庸', '身世之谜'],
    source_author: '金庸',
    source_work: '天龙八部',
    quality_score: 97,
  },
  {
    id: 'cm-jy-002',
    title: '紧张舒缓交替·六大派围攻光明顶',
    category: 'writing-technique',
    content: '张无忌一人对六大派，战斗正急，忽然周芷若出场喂饭。一筷面条，顿挫有致。而后战斗再起，更加热烈。紧张与舒缓交替，如波峰波谷。',
    technique_tags: ['紧张舒缓', '节奏控制', '金庸'],
    source_author: '金庸',
    source_work: '倚天屠龙记',
    quality_score: 94,
  },
  {
    id: 'cm-gl-001',
    title: '闪电式开局·冷风如刀',
    category: 'writing-technique',
    content: '"冷风如刀，以大地为砧板，视众生为鱼肉。"起笔即入情境，无任何铺垫，直接将读者拽入凛冽氛围。全句无一动词，却动态十足。',
    technique_tags: ['闪电式开局', '节奏控制', '古龙', '格言体'],
    source_author: '古龙',
    source_work: '多情剑客无情剑',
    quality_score: 96,
  },
  {
    id: 'cm-gl-002',
    title: '悬疑核驱动·谁是青龙会老大',
    category: 'writing-technique',
    content: '陆小凤系列，以"青龙会老大是谁"为核心悬疑核。每一案，可能人物均疑似青龙会内鬼。碎片化线索逐步拼凑，却始终不得全貌。读者与主角同步推理。',
    technique_tags: ['悬疑核驱动', '伏笔照应', '古龙'],
    source_author: '古龙',
    source_work: '陆小凤传奇',
    quality_score: 93,
  },
];

// Western Classical Techniques (Homer, Cervantes, Tolstoy, etc.)
const westernClassicalExamples: ReferenceExample[] = [
  {
    id: 'wc-hom-001',
    title: '史诗式倒叙·冥间见闻',
    category: 'writing-technique',
    content: '奥德修斯冥间见阿基琉斯鬼魂："你虽是死人，却仍照耀如星辰。"通过死者的对话，折射生者的荣耀与悲哀，倒叙手法使时间层次立体化。',
    technique_tags: ['倒叙', '史诗', '荷马'],
    source_author: '荷马',
    source_work: '奥德赛',
    quality_score: 95,
  },
  {
    id: 'wc-cer-001',
    title: '元叙事·堂吉诃德与读者',
    category: 'writing-technique',
    content: '堂吉诃德阅读大量骑士小说后出发冒险。作者多次插入"读者诸君"的直接呼唤，打破第四堵墙，使读者参与叙事建构。',
    technique_tags: ['元叙事', '元小说', '塞万提斯'],
    source_author: '塞万提斯',
    source_work: '堂吉诃德',
    quality_score: 94,
  },
  {
    id: 'wc-tol-001',
    title: '心理时间·娜塔莎的夜晚',
    category: 'writing-technique',
    content: '娜塔莎等待安德来的一夜，作者将一小时的心理活动拉展为数十页。现实时间与心理时间错位，外部动作极少，内心波澜壮阔。',
    technique_tags: ['心理时间', '意识流先声', '托尔斯泰'],
    source_author: '托尔斯泰',
    source_work: '战争与和平',
    quality_score: 96,
  },
];

// Western Modern Techniques (Joyce, Hemingway, Faulkner, etc.)
const westernModernExamples: ReferenceExample[] = [
  {
    id: 'wm-joy-001',
    title: '意识流·莫妮娅的内心独白',
    category: 'writing-technique',
    content: '莫妮娅在海边："慢慢地把水弄咸……他走后的所有日子都是这样开始的……"内心独白自由飘浮，无标点束缚，思维本身成为叙事客体。',
    technique_tags: ['意识流', '内心独白', '乔伊斯'],
    source_author: '乔伊斯',
    source_work: '尤利西斯',
    quality_score: 97,
  },
  {
    id: 'wm-hem-001',
    title: '冰山原则·乞力马扎罗的雪',
    category: 'writing-technique',
    content: '哈里死于乞力马扎罗山巅。小说中从未直接写他如何死亡，只写他的意识飘向山巅。文字是露出水面的冰山，水下是未言的生死主题。',
    technique_tags: ['冰山原则', '简洁', '海明威'],
    source_author: '海明威',
    source_work: '乞力马扎罗的雪',
    quality_score: 96,
  },
  {
    id: 'wm-fau-001',
    title: '多视角叙事·喧哗与骚动',
    category: 'writing-technique',
    content: '班杰明的意识、昆丁的意识、凯蒂的意识，三个视角讲述同一家庭的分崩离析。视角切换如棱镜折射，同一事件呈现不同色泽。',
    technique_tags: ['多视角', '意识流', '福克纳'],
    source_author: '福克纳',
    source_work: '喧哗与骚动',
    quality_score: 95,
  },
];

// Narrative Framework Examples
const narrativeFrameworkExamples: ReferenceExample[] = [
  {
    id: 'nf-001',
    title: '红楼梦·家族兴衰结构',
    category: 'narrative-framework',
    content: '以贾府兴衰为经，以宝黛爱情为纬。家族命运与个人命运交织，最终繁华落尽，落了片白茫茫大地真干净。结构宏大而统一。',
    technique_tags: ['家族叙事', '兴衰结构', '网状结构'],
    source_author: '曹雪芹',
    source_work: '红楼梦',
    quality_score: 98,
  },
  {
    id: 'nf-002',
    title: '天龙八部·三线并行交织',
    category: 'narrative-framework',
    content: '萧峰线、段誉线、虚竹线，三条人物线独立发展，后交织于少林寺大会。三线如辫子，最终合拢成一。',
    technique_tags: ['多线并行', '人物交织', '金庸'],
    source_author: '金庸',
    source_work: '天龙八部',
    quality_score: 95,
  },
  {
    id: 'nf-003',
    title: '俄狄浦斯王·发现与逆转',
    category: 'narrative-framework',
    content: '信使带来真相，发现即逆转。俄狄浦斯"发现"自己弑父娶母的那一刻，即命运逆转的高潮。亚里士多德称之为"发现即逆转"。',
    technique_tags: ['发现与逆转', '悲剧结构', '索福克勒斯'],
    source_author: '索福克勒斯',
    source_work: '俄狄浦斯王',
    quality_score: 97,
  },
];

// Visual Lens Examples
const visualLensExamples: ReferenceExample[] = [
  {
    id: 'vl-001',
    title: '金庸·张无忌光明顶之战',
    category: 'visual-lens',
    content: '张无忌一人对崆峒派、华山派、昆仑派、正反两仪刀剑。动作描写如绘画：一分为二、二分为四、四分为八，层层递加，视觉丰富如棋盘。',
    technique_tags: ['动作描写', '武侠动作', '金庸'],
    source_author: '金庸',
    source_work: '倚天屠龙记',
    quality_score: 94,
  },
  {
    id: 'vl-002',
    title: '古龙·兰亭集序意境',
    category: 'visual-lens',
    content: '李寻欢与林诗音分别，十年来各自回忆。文字如山水画留白："她只是静静地站在阴影里，像一幅淡墨山水。"意境大于情节。',
    technique_tags: ['意境描写', '氛围', '古龙'],
    source_author: '古龙',
    source_work: '多情剑客无情剑',
    quality_score: 95,
  },
  {
    id: 'vl-003',
    title: '海明威·斗牛场面',
    category: 'visual-lens',
    content: '"红布在公牛面前抖动，他蹄子刨地，蹄子下的沙土飞溅如血。"动作精准如解剖，感官细节密集，读者如在现场。',
    technique_tags: ['动作描写', '感官细节', '海明威'],
    source_author: '海明威',
    source_work: '永别了武器',
    quality_score: 93,
  },
];

// ============================================================
// Initialize Libraries
// ============================================================

export function initializeReferenceLibraries(): void {
  // Chinese Classical
  registerReferenceExamples(chineseClassicalExamples);

  // Chinese Modern
  registerReferenceExamples(chineseModernExamples);

  // Western Classical
  registerReferenceExamples(westernClassicalExamples);

  // Western Modern
  registerReferenceExamples(westernModernExamples);

  // Narrative Framework
  registerReferenceExamples(narrativeFrameworkExamples);

  // Visual Lens
  registerReferenceExamples(visualLensExamples);

  console.log('[ReferenceLibrary] Initialized with examples:', getReferenceLibraryStats());
}

// Auto-initialize on module load
initializeReferenceLibraries();

/**
 * Novel Analyzer - Analyzes novel metadata to extract features for technique recommendation
 *
 * Analyzes:
 * - Genre (类型：玄幻、都市、武侠、仙侠等)
 * - Sub-genre and themes (题材：废柴逆袭、穿越、系统流等)
 * - Tone and style keywords
 * - Target audience
 * - Narrative style preferences
 */

export interface NovelProfile {
  // 基本类型
  bookType: string;           // novel, short, series, nonfiction, poetry
  targetLength: string;        // short, mid, long

  // 题材类型
  genre: GenreTag[];           // 玄幻, 都市, 武侠, 仙侠, 悬疑, 科幻等
  subGenres: SubGenreTag[];   // 废柴逆袭, 穿越, 系统流, 重生, 星际, 异世等

  // 主题和风格
  themes: string[];           // 核心主题关键词
  tone: ToneTag[];            // 热血, 虐心, 搞笑, 治愈等
  styleKeywords: string[];     // 用户指定的风格词

  // 受众
  targetAudience: TargetAudienceTag[]; // 青少年, 女性向, 男性向, 大众等

  // 叙事偏好
  narrativePerspective: NarrativePerspectiveTag[]; // 第三人称, 第一人称等
  pacingPreference: PacingPreference; // 快节奏, 慢热, 张弛有度

  // 特殊标签
  specialTags: string[];       // 其他关键词如"爽文", "虐文", "甜文"等
}

// ============================================================
// Genre Tags
// ============================================================

export type GenreTag =
  | '玄幻'
  | '都市'
  | '武侠'
  | '仙侠'
  | '悬疑'
  | '科幻'
  | '奇幻'
  | '历史'
  | '军事'
  | '游戏'
  | '体育'
  | '轻小说'
  | '言情'
  | '耽美'
  | '百合'
  | '现实主义'
  | '悬疑推理'
  | '恐怖惊悚'
  | '其他';

export type SubGenreTag =
  // 玄幻/仙侠子类型
  | '废柴逆袭'
  | '系统流'
  | '升级流'
  | '凡人流'
  | '退婚流'
  | '洪荒流'
  | '星际玄幻'
  // 都市子类型
  | '都市异能'
  | '都市重生'
  | '职场商战'
  | '乡村种田'
  | '娱乐明星'
  | '特种兵'
  // 其他
  | '穿越'
  | '重生'
  | '快穿'
  | '综漫'
  | '同人'
  | '无限流';

export type ToneTag =
  | '热血'
  | '虐心'
  | '搞笑'
  | '治愈'
  | '暗黑'
  | '温馨'
  | '燃向'
  | '甜宠'
  | '虐恋';

export type TargetAudienceTag =
  | '青少年'
  | '大学生'
  | '白领'
  | '女性向'
  | '男性向'
  | '大众';

export type NarrativePerspectiveTag =
  | '第三人称全知'
  | '第三人称限知'
  | '第一人称主角'
  | '第一人称配角'
  | '第二人称';

export type PacingPreference =
  | '快节奏'
  | '中速'
  | '慢热'
  | '张弛有度';

// ============================================================
// Genre-to-Technique Mapping
// ============================================================

interface GenreTechniqueProfile {
  // 推荐的叙事骨架库
  narrativeFrameworks: string[];  // narrative-framework 标签
  // 推荐的画面镜头库
  visualLenses: string[];         // visual-lens 标签
  // 推荐的笔法技法
  writingTechniques: string[];    // writing-technique 技法标签
  // 权重偏向（哪些技法的权重应该更高）
  techniqueWeights: Record<string, number>;
  // 避免的技法
  avoidTechniques: string[];
  // 系统提示补充
  systemHints: string[];
}

// 预定义的类型-技法映射
export const GENRE_TECHNIQUE_MAP: Record<GenreTag, GenreTechniqueProfile> = {
  '玄幻': {
    narrativeFrameworks: ['多线并行', '升级结构', '网状结构'],
    visualLenses: ['动作描写', '升级描写', '法宝展示'],
    writingTechniques: ['草蛇灰线', '紧张舒缓交替', '欲扬先抑', '蝴蝶效应'],
    techniqueWeights: {
      '草蛇灰线': 1.2,      // 玄幻需要长线伏笔
      '紧张舒缓交替': 1.3,   // 升级需要节奏感
      '欲扬先抑': 1.2,       // 废柴逆袭标配
    },
    avoidTechniques: [],
    systemHints: ['注重升级体系的逻辑性', '主角成长曲线要清晰', '金手指要有代价'],
  },
  '都市': {
    narrativeFrameworks: ['线性叙事', '多线交织', '生活流'],
    visualLenses: ['心理描写', '对话场景', '都市氛围'],
    writingTechniques: ['冰山原则', '心理时间', '蒙太奇切换', '格言体'],
    techniqueWeights: {
      '冰山原则': 1.2,       // 都市场景适合简洁
      '心理时间': 1.1,        // 都市人内心丰富
    },
    avoidTechniques: [],
    systemHints: ['人物行为逻辑要接地气', '对话要符合身份', '细节要真实'],
  },
  '武侠': {
    narrativeFrameworks: ['英雄旅程', '江湖恩怨', '武林编年史'],
    visualLenses: ['动作描写', '江湖氛围', '兵器描写'],
    writingTechniques: ['草蛇灰线', '横云断山', '一击两鸣', '紧张舒缓交替'],
    techniqueWeights: {
      '草蛇灰线': 1.3,       // 武侠伏笔经典
      '紧张舒缓交替': 1.2,
    },
    avoidTechniques: [],
    systemHints: ['武功描写要符合物理逻辑', '门派规矩要有约束力', '江湖义气要体现'],
  },
  '仙侠': {
    narrativeFrameworks: ['修仙体系', '凡人流', '洪荒流'],
    visualLenses: ['意境描写', '法宝展示', '功法修炼'],
    writingTechniques: ['草蛇灰线', '紧张舒缓交替', '云龙雾雨', '空谷传声'],
    techniqueWeights: {
      '草蛇灰线': 1.3,
      '云龙雾雨': 1.2,       // 仙侠意境
    },
    avoidTechniques: [],
    systemHints: ['修仙体系要有层次感', '世界观要有独特设定', '境界描写要具体'],
  },
  '悬疑': {
    narrativeFrameworks: ['悬疑核驱动', '谜题揭示', '多视角叙事'],
    visualLenses: ['氛围描写', '细节暗示', '心理惊悚'],
    writingTechniques: ['悬疑核驱动', '格言体', '碎片视角拼接', '紧张舒缓交替'],
    techniqueWeights: {
      '悬疑核驱动': 1.4,    // 悬疑核心
      '碎片视角拼接': 1.2,
    },
    avoidTechniques: ['故作消闲之笔'],  // 悬疑要紧凑
    systemHints: ['线索要埋设自然', '真相揭示要合理', '误导要巧妙'],
  },
  '科幻': {
    narrativeFrameworks: ['科技设定', '星际冒险', '赛博朋克'],
    visualLenses: ['科技展示', '未来描写', '机械动作'],
    writingTechniques: ['冰山原则', '蒙太奇切换', '紧张舒缓交替'],
    techniqueWeights: {
      '冰山原则': 1.2,
    },
    avoidTechniques: [],
    systemHints: ['科技设定要自洽', '人文思考要深刻', '想象力要大胆'],
  },
  '奇幻': {
    narrativeFrameworks: ['世界观构建', '英雄旅程', '多线并行'],
    visualLenses: ['魔法展示', '异世界描写', '种族描写'],
    writingTechniques: ['草蛇灰线', '紧张舒缓交替', '烘云托月'],
    techniqueWeights: {
      '烘云托月': 1.2,
    },
    avoidTechniques: [],
    systemHints: ['世界观要有独特规则', '魔法体系要自洽', '人物成长要合理'],
  },
  '历史': {
    narrativeFrameworks: ['历史编年', '人物传记', '战争史诗'],
    visualLenses: ['历史场景', '战争描写', '人物群像'],
    writingTechniques: ['横云断山', '大间架法', '紧张舒缓交替'],
    techniqueWeights: {
      '大间架法': 1.3,       // 历史需要大格局
    },
    avoidTechniques: [],
    systemHints: ['史实要准确', '人物要符合历史形象', '细节要考究'],
  },
  '其他': {
    narrativeFrameworks: ['线性叙事'],
    visualLenses: ['叙事描写'],
    writingTechniques: [],
    techniqueWeights: {},
    avoidTechniques: [],
    systemHints: [],
  },
};

// ============================================================
// Tone-to-Technique Mapping
// ============================================================

const TONE_TECHNIQUE_MAP: Record<ToneTag, string[]> = {
  '热血': ['紧张舒缓交替', '欲扬先抑', '正面描写'],
  '虐心': ['心理时间', '背面铺粉法', '隐笔'],
  '搞笑': ['横云断山法', '故作消闲之笔'],
  '治愈': ['烘云托月法', '染叶衬花法'],
  '暗黑': ['背面铺粉法', '隐笔'],
  '温馨': ['烘云托月法', '染叶衬花法'],
  '燃向': ['紧张舒缓交替', '欲扬先抑'],
  '甜宠': ['烘云托月法'],
  '虐恋': ['心理时间', '背面铺粉法'],
};

// ============================================================
// SubGenre-to-Technique Mapping
// ============================================================

const SUBGENRE_TECHNIQUE_MAP: Record<SubGenreTag, string[]> = {
  '废柴逆袭': ['欲扬先抑', '紧张舒缓交替'],
  '系统流': ['紧张舒缓交替'],  // 系统提示+剧情高潮交替
  '升级流': ['紧张舒缓交替', '层层递进'],
  '凡人流': ['草蛇灰线', '欲扬先抑'],
  '退婚流': ['欲扬先抑', '草蛇灰线'],
  '洪荒流': ['草蛇灰线', '紧张舒缓交替'],
  '都市异能': ['冰山原则', '紧张舒缓交替'],
  '都市重生': ['心理时间', '欲扬先抑'],
  '穿越': ['横云断山法', '紧张舒缓交替'],
  '重生': ['心理时间', '欲扬先抑'],
  '快穿': ['横云断山法', '蒙太奇切换'],
  '无限流': ['紧张舒缓交替', '碎片视角拼接'],
};

// ============================================================
// Novel Analyzer
// ============================================================

export class NovelAnalyzer {
  /**
   * Analyze novel metadata and generate profile
   */
  analyze(params: {
    title?: string;
    description?: string;
    bookType?: string;
    targetLength?: string;
    tags?: string[];
    styleKeywords?: string[];
    charter?: {
      theme?: string;
      coreConflict?: string;
      targetAudience?: string;
      styleKeywords?: string[];
    };
  }): NovelProfile {
    const { title = '', description = '', bookType = 'novel', targetLength = 'mid', tags = [], styleKeywords = [], charter } = params;

    // 解析题材类型
    const genre = this.extractGenres(title, description, tags);

    // 解析子类型
    const subGenres = this.extractSubGenres(title, description, tags);

    // 解析主题
    const themes = this.extractThemes(title, description, charter);

    // 解析基调
    const tone = this.extractTone(title, description, tags);

    // 解析受众
    const targetAudience = this.extractAudience(charter?.targetAudience, tags);

    // 解析叙事视角
    const narrativePerspective = this.extractNarrativePerspective(description, tags);

    // 解析节奏偏好
    const pacingPreference = this.extractPacingPreference(subGenres, tone);

    // 解析特殊标签
    const specialTags = this.extractSpecialTags(tags);

    return {
      bookType,
      targetLength,
      genre,
      subGenres,
      themes,
      tone,
      styleKeywords: styleKeywords.length > 0 ? styleKeywords : (charter?.styleKeywords || []),
      targetAudience,
      narrativePerspective,
      pacingPreference,
      specialTags,
    };
  }

  /**
   * Extract genre from title, description, and tags
   */
  private extractGenres(title: string, description: string, tags: string[]): GenreTag[] {
    const text = `${title} ${description} ${tags.join(' ')}`.toLowerCase();
    const genres: GenreTag[] = [];

    // 题材关键词映射
    const genreKeywords: Record<GenreTag, string[]> = {
      '玄幻': ['玄幻', '异世', '异界', '斗气', '魔法', '领主', '巫师'],
      '都市': ['都市', '现代', '职场', '商战', '种田', '乡村', '明星'],
      '武侠': ['武侠', '江湖', '武林', '剑客', '刀客', '侠客'],
      '仙侠': ['仙侠', '修真', '修仙', '飞升', '金丹', '元婴', '阵法'],
      '悬疑': ['悬疑', '推理', '侦探', '破案', '惊悚', '恐怖'],
      '科幻': ['科幻', '星际', '机甲', '赛博', '废土', '末日', '高武'],
      '奇幻': ['奇幻', '精灵', '矮人', '龙族', '魔法', '异世界'],
      '历史': ['历史', '穿越古代', '秦时', '三国', '大明', '清朝'],
      '军事': ['军事', '特种兵', '抗战', '军旅'],
      '游戏': ['游戏', '电竞', '虚拟现实', '全息'],
      '体育': ['体育', '篮球', '足球', '电竞', '竞技'],
      '轻小说': ['轻小说', '日轻', '日常'],
      '言情': ['言情', '爱情', '甜文', '虐文', '恋爱'],
      '耽美': ['耽美', 'BL', '男男'],
      '百合': ['百合', 'GL', '女女'],
      '现实主义': ['现实', '成长', '人生'],
      '悬疑推理': ['推理', '破案', '侦探'],
      '恐怖惊悚': ['恐怖', '惊悚', '灵异', '鬼故事'],
      '其他': [],
    };

    for (const [genre, keywords] of Object.entries(genreKeywords)) {
      if (keywords.some(k => text.includes(k))) {
        genres.push(genre as GenreTag);
      }
    }

    // 如果没有识别到，返回默认
    if (genres.length === 0) {
      genres.push('其他');
    }

    return genres;
  }

  /**
   * Extract sub-genre from title, description, and tags
   */
  private extractSubGenres(title: string, description: string, tags: string[]): SubGenreTag[] {
    const text = `${title} ${description} ${tags.join(' ')}`.toLowerCase();
    const subGenres: SubGenreTag[] = [];

    const subGenreKeywords: Record<SubGenreTag, string[]> = {
      '废柴逆袭': ['废柴', '废物', '逆袭', '崛起', '被打压', '受辱'],
      '系统流': ['系统', '面板', '任务', '积分', '商城'],
      '升级流': ['升级', '突破', '修炼', '境界'],
      '凡人流': ['凡人', '散修', '底层'],
      '退婚流': ['退婚', '悔婚', '退婚流'],
      '洪荒流': ['洪荒', '混沌', '开天'],
      '都市异能': ['异能', '觉醒', '超能力', '特异功能'],
      '都市重生': ['重生', '回到过去', '再活一次'],
      '职场商战': ['职场', '商战', '创业', '职场晋升'],
      '乡村种田': ['种田', '发家致富', '田园', '乡村'],
      '娱乐明星': ['明星', '偶像', '出道', '娱乐圈'],
      '特种兵': ['特种兵', '兵王', '军旅'],
      '穿越': ['穿越', '时空', '转世'],
      '重生': ['重生'],
      '快穿': ['快穿', '攻略', '系统文'],
      '综漫': ['综漫', '综穿'],
      '同人': ['同人', '衍生'],
      '无限流': ['无限流', '副本', '闯关'],
    };

    for (const [subGenre, keywords] of Object.entries(subGenreKeywords)) {
      if (keywords.some(k => text.includes(k))) {
        subGenres.push(subGenre as SubGenreTag);
      }
    }

    return subGenres;
  }

  /**
   * Extract themes from title, description, and charter
   */
  private extractThemes(title: string, description: string, charter?: { theme?: string; coreConflict?: string }): string[] {
    const themes: string[] = [];

    if (charter?.theme) {
      themes.push(charter.theme);
    }
    if (charter?.coreConflict) {
      themes.push(charter.coreConflict);
    }

    // 常见主题关键词
    const themeKeywords = [
      '成长', '复仇', '救赎', '爱情', '友情', '热血', '梦想',
      '正义', '邪恶', '自由', '命运', '抗争', '归属', ' identity'
    ];

    const text = `${title} ${description}`.toLowerCase();
    for (const theme of themeKeywords) {
      if (text.includes(theme)) {
        themes.push(theme);
      }
    }

    return [...new Set(themes)].slice(0, 5); // 去重，最多5个
  }

  /**
   * Extract tone from title, description, and tags
   */
  private extractTone(title: string, description: string, tags: string[]): ToneTag[] {
    const text = `${title} ${description} ${tags.join(' ')}`.toLowerCase();
    const tones: ToneTag[] = [];

    const toneKeywords: Record<ToneTag, string[]> = {
      '热血': ['热血', '燃', '激情', '战斗'],
      '虐心': ['虐心', '虐文', '虐', '玻璃渣'],
      '搞笑': ['搞笑', '幽默', '轻松', '沙雕', '逗比'],
      '治愈': ['治愈', '温馨', '甜', '暖'],
      '暗黑': ['暗黑', '致郁', '压抑', '黑暗'],
      '温馨': ['温馨', '甜蜜', '温暖'],
      '燃向': ['燃向', '燃向'],
      '甜宠': ['甜宠', '撒糖', '甜文'],
      '虐恋': ['虐恋', '相爱相杀'],
    };

    for (const [tone, keywords] of Object.entries(toneKeywords)) {
      if (keywords.some(k => text.includes(k))) {
        tones.push(tone as ToneTag);
      }
    }

    // 默认热血
    if (tones.length === 0) {
      tones.push('热血');
    }

    return tones;
  }

  /**
   * Extract target audience
   */
  private extractAudience(charterAudience?: string, tags: string[] = []): TargetAudienceTag[] {
    const text = `${charterAudience || ''} ${tags.join(' ')}`.toLowerCase();
    const audiences: TargetAudienceTag[] = [];

    if (text.includes('女性') || text.includes('女频')) {
      audiences.push('女性向');
    }
    if (text.includes('男性') || text.includes('男频')) {
      audiences.push('男性向');
    }
    if (text.includes('青少年') || text.includes('学生')) {
      audiences.push('青少年');
    }
    if (text.includes('白领') || text.includes('职场')) {
      audiences.push('白领');
    }

    if (audiences.length === 0) {
      audiences.push('大众');
    }

    return audiences;
  }

  /**
   * Extract narrative perspective
   */
  private extractNarrativePerspective(description: string, tags: string[]): NarrativePerspectiveTag[] {
    const text = `${description} ${tags.join(' ')}`.toLowerCase();
    const perspectives: NarrativePerspectiveTag[] = [];

    if (text.includes('第一人称') || text.includes('我')) {
      perspectives.push('第一人称主角');
    }
    if (text.includes('第二人称')) {
      perspectives.push('第二人称');
    }
    if (text.includes('全知')) {
      perspectives.push('第三人称全知');
    }
    if (text.includes('限知') || text.includes('视角')) {
      perspectives.push('第三人称限知');
    }

    // 默认第三人称全知
    if (perspectives.length === 0) {
      perspectives.push('第三人称全知');
    }

    return perspectives;
  }

  /**
   * Extract pacing preference
   */
  private extractPacingPreference(subGenres: SubGenreTag[], tones: ToneTag[]): PacingPreference {
    // 系统流、快穿、无限流通常快节奏
    if (['系统流', '快穿', '无限流'].some(s => subGenres.includes(s))) {
      return '快节奏';
    }

    // 都市重生、凡人流可能慢热
    if (['都市重生', '凡人流'].some(s => subGenres.includes(s))) {
      return '慢热';
    }

    // 热血基调适合张弛有度
    if (tones.includes('热血') || tones.includes('燃向')) {
      return '张弛有度';
    }

    return '中速';
  }

  /**
   * Extract special tags
   */
  private extractSpecialTags(tags: string[]): string[] {
    const specialTagKeywords: Record<string, string[]> = {
      '爽文': ['爽文', '一路爽', '爽'],
      '虐文': ['虐文', '玻璃渣', '玻璃碴'],
      '甜文': ['甜文', '甜', '撒糖'],
      '水文': ['水文', '日常', '慢节奏'],
    };

    const result: string[] = [];
    const tagsText = tags.join(' ').toLowerCase();

    for (const [tag, keywords] of Object.entries(specialTagKeywords)) {
      if (keywords.some(k => tagsText.includes(k))) {
        result.push(tag);
      }
    }

    return result;
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const novelAnalyzer = new NovelAnalyzer();

// ============================================================
// Convenience Function
// ============================================================

export function analyzeNovel(params: {
  title?: string;
  description?: string;
  bookType?: string;
  targetLength?: string;
  tags?: string[];
  styleKeywords?: string[];
  charter?: {
    theme?: string;
    coreConflict?: string;
    targetAudience?: string;
    styleKeywords?: string[];
  };
}): NovelProfile {
  return novelAnalyzer.analyze(params);
}

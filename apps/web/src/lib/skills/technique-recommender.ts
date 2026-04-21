/**
 * Technique Recommender - Recommends writing techniques based on novel profile
 *
 * Recommends:
 * - Writing techniques from reference library
 * - Narrative frameworks
 * - Visual lens styles
 * - Technique directives for skill execution
 */

import type { NovelProfile, GenreTag, ToneTag, SubGenreTag } from './novel-analyzer';
import { GENRE_TECHNIQUE_MAP } from './novel-analyzer';
import type { ReferenceExample, TechniqueDirective } from './skill-interface';
import { retrieveReferenceExamples, getAllTags } from './reference-library-store';

// ============================================================
// Recommendation Result
// ============================================================

export interface TechniqueRecommendation {
  // 推荐使用的参考样本
  recommendedExamples: ReferenceExample[];

  // 推荐使用的技法指令
  techniqueDirectives: TechniqueDirective[];

  // 推荐权重偏向（传给模型的提示）
  weightHints: string[];

  // 需要避免的技法标签
  avoidTechniques: string[];

  // 额外的系统提示
  systemHints: string[];

  // 置信度评分
  confidence: number;
}

export interface NarrativeFrameworkRecommendation {
  // 推荐的叙事骨架类型
  frameworkTypes: string[];
  recommendedExamples: ReferenceExample[];
}

export interface VisualLensRecommendation {
  // 推荐的画面镜头类型
  lensTypes: string[];
  recommendedExamples: ReferenceExample[];
}

// ============================================================
// Genre-to-Technique Directives
// ============================================================

interface TechniqueDirectiveTemplate {
  technique_id: string;
  technique_name: string;
  application_hint: string;
  priority: 'high' | 'medium' | 'low';
}

// 题材→技法指令映射
const GENRE_DIRECTIVE_MAP: Record<GenreTag, TechniqueDirectiveTemplate[]> = {
  '玄幻': [
    {
      technique_id: '草蛇灰线-金庸版',
      technique_name: '草蛇灰线·金庸版',
      application_hint: '在主角成长的关键节点埋设伏笔，如金手指来历、身份秘密、势力纠葛。伏笔跨度要长，初读不觉，回收时震撼。',
      priority: 'high',
    },
    {
      technique_id: '紧张舒缓交替',
      technique_name: '紧张舒缓交替',
      application_hint: '修炼突破时用紧张节奏，对战间隙用舒缓描写调节。主角每次大危机后安排温情场景，形成节奏波峰波谷。',
      priority: 'high',
    },
    {
      technique_id: '欲扬先抑',
      technique_name: '欲扬先抑',
      application_hint: '主角出场要低，越低越好。被打压、被嘲笑、被欺辱，然后一步步扬起来，让读者憋着一口气等爆发。',
      priority: 'high',
    },
    {
      technique_id: '横云断山法',
      technique_name: '横云断山法',
      application_hint: '重大剧情进行时插入支线事件，如中途敌人来袭、突发变故，打断主线索后再接回，增强叙事张力。',
      priority: 'medium',
    },
  ],
  '都市': [
    {
      technique_id: '冰山原则',
      technique_name: '冰山原则·海明威',
      application_hint: '对话和动作描写要简洁有力，留白给读者想象。人物不必说透一切，用行为暗示心理。',
      priority: 'high',
    },
    {
      technique_id: '心理时间',
      technique_name: '心理时间·托尔斯泰',
      application_hint: '重要决策或情感高潮时，放慢时间流速，放大内心波澜。外部一秒，内心一年。',
      priority: 'high',
    },
    {
      technique_id: '格言体',
      technique_name: '格言体·古龙',
      application_hint: '都市精英的对话要简洁有力，偶有警句点睛。人物语言风格要符合身份，不要说废话。',
      priority: 'medium',
    },
  ],
  '武侠': [
    {
      technique_id: '草蛇灰线-金庸版',
      technique_name: '草蛇灰线·金庸版',
      application_hint: '武功来历、门派恩怨、人物身世，都要提前埋设伏笔。江湖秘辛要在关键时刻才揭示。',
      priority: 'high',
    },
    {
      technique_id: '紧张舒缓交替',
      technique_name: '紧张舒缓交替',
      application_hint: '对决前用舒缓氛围铺垫，对决时用密集动作描写，胜负分后用感慨收尾。',
      priority: 'high',
    },
    {
      technique_id: '横云断山法',
      technique_name: '横云断山法',
      application_hint: '比武正酣时插入突发事件，如外援来到、阴谋曝光、第三方介入，打断后继续。',
      priority: 'high',
    },
    {
      technique_id: '一击两鸣',
      technique_name: '一击两鸣·张竹坡',
      application_hint: '用一场戏同时完成多个人物的塑造，或用同一事件折射多重含义。',
      priority: 'medium',
    },
  ],
  '仙侠': [
    {
      technique_id: '草蛇灰线-金庸版',
      technique_name: '草蛇灰线·金庸版',
      application_hint: '修仙体系中境界突破、机缘获得都要有前兆。仙魔大战的伏笔要跨越数十万字。',
      priority: 'high',
    },
    {
      technique_id: '云龙雾雨',
      technique_name: '云龙雾雨·脂砚斋',
      application_hint: '用云雾雨雪等自然元素烘托氛围。渡劫时的雷云、飞升时的霞光，都是意境的延伸。',
      priority: 'high',
    },
    {
      technique_id: '紧张舒缓交替',
      technique_name: '紧张舒缓交替',
      application_hint: '修仙世界同样适用。注意修炼静与战斗动的对比，闭关与历练的交替。',
      priority: 'high',
    },
    {
      technique_id: '空谷传声',
      technique_name: '空谷传声·张竹坡',
      application_hint: '用回响、呼应增加叙事层次。如一人悟道，众人受益；一地事件，影响深远。',
      priority: 'medium',
    },
  ],
  '悬疑': [
    {
      technique_id: '悬疑核驱动',
      technique_name: '悬疑核驱动·古龙',
      application_hint: '开篇即抛出核心谜题，所有人物和事件围绕谜题展开。线索要碎片化抛出，让读者与主角同步推理。',
      priority: 'high',
    },
    {
      technique_id: '碎片视角拼接',
      technique_name: '碎片视角拼接·福克纳',
      application_hint: '用多视角叙述同一事件，不同视角揭示不同碎片，读者在脑中拼凑真相。',
      priority: 'high',
    },
    {
      technique_id: '横云断山法',
      technique_name: '横云断山法',
      application_hint: '正接近真相时插入干扰事件，或突然发现新线索，打断节奏后再推进。',
      priority: 'medium',
    },
  ],
  '科幻': [
    {
      technique_id: '冰山原则',
      technique_name: '冰山原则·海明威',
      application_hint: '科技设定不要写透，用行为和效果暗示技术原理。留给读者想象空间。',
      priority: 'high',
    },
    {
      technique_id: '蒙太奇切换',
      technique_name: '蒙太奇切换·古龙',
      application_hint: '星际跳跃、时间跳跃时用蒙太奇切换，快速推进剧情而不失流畅。',
      priority: 'high',
    },
    {
      technique_id: '紧张舒缓交替',
      technique_name: '紧张舒缓交替',
      application_hint: '科幻战斗同样需要节奏控制。星际战争描写要密集，平时航行则舒缓。',
      priority: 'medium',
    },
  ],
  '奇幻': [
    {
      technique_id: '烘云托月法',
      technique_name: '烘云托月法·脂砚斋',
      application_hint: '用次要人物或场景烘托主要人物。魔法世界用NPC烘托主角的存在感。',
      priority: 'high',
    },
    {
      technique_id: '紧张舒缓交替',
      technique_name: '紧张舒缓交替',
      application_hint: '奇幻世界的事件通常规模宏大，注意在大场面和小场景间交替。',
      priority: 'high',
    },
    {
      technique_id: '草蛇灰线',
      technique_name: '草蛇灰线·金庸版',
      application_hint: '世界观设定复杂，需要提前埋设线索，如魔法来历、种族渊源。',
      priority: 'medium',
    },
  ],
  '历史': [
    {
      technique_id: '大间架法',
      technique_name: '大间架法·毛宗岗',
      application_hint: '历史小说要有大格局，朝廷兴衰、江湖纷争，都要在大结构下展开。',
      priority: 'high',
    },
    {
      technique_id: '紧张舒缓交替',
      technique_name: '紧张舒缓交替',
      application_hint: '战争与和平交替，朝堂与江湖交替。注意历史事件的节奏感。',
      priority: 'high',
    },
    {
      technique_id: '横云断山法',
      technique_name: '横云断山法',
      application_hint: '重大历史事件进行时插入人物命运，增强历史感与个人感对比。',
      priority: 'medium',
    },
  ],
  '军事': [
    {
      technique_id: '紧张舒缓交替',
      technique_name: '紧张舒缓交替',
      application_hint: '战斗场景要密集真实，休息场景要有人情味。注意军队内部的关系描写。',
      priority: 'high',
    },
    {
      technique_id: '冰山原则',
      technique_name: '冰山原则·海明威',
      application_hint: '军事描写要简洁，武器、战术、动作不要过度描写，给读者留想象。',
      priority: 'medium',
    },
  ],
  '游戏': [
    {
      technique_id: '紧张舒缓交替',
      technique_name: '紧张舒缓交替',
      application_hint: '副本、PK用紧张节奏，公会活动、日常任务用舒缓节奏。',
      priority: 'high',
    },
    {
      technique_id: '蒙太奇切换',
      technique_name: '蒙太奇切换·古龙',
      application_hint: '游戏中的升级、刷怪可以用蒙太奇快速掠过，不必逐一描写。',
      priority: 'medium',
    },
  ],
  '体育': [
    {
      technique_id: '紧张舒缓交替',
      technique_name: '紧张舒缓交替',
      application_hint: '比赛时用密集动作描写，训练和日常生活中有人物成长。',
      priority: 'high',
    },
  ],
  '轻小说': [
    {
      technique_id: '格言体',
      technique_name: '格言体·古龙',
      application_hint: '轻小说角色常有犀利台词，偶有格言警句增加魅力。',
      priority: 'medium',
    },
    {
      technique_id: '横云断山法',
      technique_name: '横云断山法',
      application_hint: '轻小说节奏较快，可用横云断山法插入日常搞笑打断主线。',
      priority: 'medium',
    },
  ],
  '言情': [
    {
      technique_id: '心理时间',
      technique_name: '心理时间·托尔斯泰',
      application_hint: '言情核心是情感，可用心理时间放大情感波澜。心动的瞬间可以写得很长。',
      priority: 'high',
    },
    {
      technique_id: '欲扬先抑',
      technique_name: '欲扬先抑',
      application_hint: '甜文常用先虐后甜结构，相爱过程曲折，结局美好。',
      priority: 'high',
    },
    {
      technique_id: '烘云托月法',
      technique_name: '烘云托月法·脂砚斋',
      application_hint: '用配角或环境烘托主角情感，如旁观者羡慕、景色映衬心情。',
      priority: 'medium',
    },
  ],
  '耽美': [
    {
      technique_id: '心理时间',
      technique_name: '心理时间·托尔斯泰',
      application_hint: '情感描写细腻，可用心理时间放大暗恋、相思等情感。',
      priority: 'high',
    },
    {
      technique_id: '欲扬先抑',
      technique_name: '欲扬先抑',
      application_hint: '暧昧期的拉扯要慢，相爱后的甜蜜突然放大。',
      priority: 'high',
    },
  ],
  '百合': [
    {
      technique_id: '心理时间',
      technique_name: '心理时间·托尔斯泰',
      application_hint: '情感细腻，心理描写要婉转有层次。',
      priority: 'high',
    },
    {
      technique_id: '烘云托月法',
      technique_name: '烘云托月法·脂砚斋',
      application_hint: '用环境和人际关系烘托情感。',
      priority: 'medium',
    },
  ],
  '现实主义': [
    {
      technique_id: '冰山原则',
      technique_name: '冰山原则·海明威',
      application_hint: '现实主义要克制，用行为暗示而非直接说出。',
      priority: 'high',
    },
    {
      technique_id: '心理时间',
      technique_name: '心理时间·托尔斯泰',
      application_hint: '人生重大时刻可以用心理时间展开。',
      priority: 'medium',
    },
  ],
  '悬疑推理': [
    {
      technique_id: '悬疑核驱动',
      technique_name: '悬疑核驱动·古龙',
      application_hint: '核心谜题贯穿全文，所有线索为此服务。',
      priority: 'high',
    },
    {
      technique_id: '碎片视角拼接',
      technique_name: '碎片视角拼接·福克纳',
      application_hint: '多视角叙事，增加推理难度。',
      priority: 'high',
    },
  ],
  '恐怖惊悚': [
    {
      technique_id: '横云断山法',
      technique_name: '横云断山法',
      application_hint: '恐怖场景用断续叙事增强不安感，不能太流畅。',
      priority: 'high',
    },
    {
      technique_id: '紧张舒缓交替',
      technique_name: '紧张舒缓交替',
      application_hint: '恐怖要有节奏，不能一直紧绷，也不能完全放松。',
      priority: 'high',
    },
  ],
  '其他': [
    {
      technique_id: '紧张舒缓交替',
      technique_name: '紧张舒缓交替',
      application_hint: '通用节奏控制技法。',
      priority: 'medium',
    },
  ],
};

// ============================================================
// Tone Modifiers
// ============================================================

const TONE_DIRECTIVE_MODIFIERS: Record<ToneTag, Partial<TechniqueDirectiveTemplate>> = {
  '热血': {
    application_hint: '强化战斗、成长、荣耀场景的描写，情感要饱满有力。',
  },
  '虐心': {
    application_hint: '强化内心痛苦、失去、遗憾的描写，情感要深沉。',
  },
  '搞笑': {
    application_hint: '偶有幽默台词或场景打断严肃氛围，但不能喧宾夺主。',
  },
  '治愈': {
    application_hint: '强化温暖、关怀、治愈场景，情感要柔和。',
  },
  '暗黑': {
    application_hint: '强化黑暗、压抑、人性幽暗的描写，情感要冷峻。',
  },
  '温馨': {
    application_hint: '强化日常、甜蜜、治愈的细节，不要过度冲突。',
  },
  '燃向': {
    application_hint: '战斗、胜利、热血场景要写出燃点，情感要爆炸。',
  },
  '甜宠': {
    application_hint: '强化甜蜜、宠溺的细节，感情线要干净利落。',
  },
  '虐恋': {
    application_hint: '强化相爱相杀、纠结、痛苦的感情描写。',
  },
};

// ============================================================
// Technique Recommender
// ============================================================

export class TechniqueRecommender {
  /**
   * Recommend techniques based on novel profile
   */
  recommend(profile: NovelProfile): TechniqueRecommendation {
    // 获取主题材（第一个）
    const primaryGenre = profile.genre[0] || '其他';
    const secondaryGenres = profile.genre.slice(1);

    // 1. 获取题材基础推荐
    const genreDirectives = GENRE_DIRECTIVE_MAP[primaryGenre] || GENRE_DIRECTIVE_MAP['其他'];

    // 2. 根据子题材补充
    const subGenreDirectives = this.getSubGenreDirectives(profile.subGenres);

    // 3. 根据基调调整
    const toneModifiers = this.getToneModifiers(profile.tone);

    // 4. 合并去重
    const allDirectives = this.mergeDirectives(genreDirectives, subGenreDirectives, toneModifiers);

    // 5. 获取参考样本
    const recommendedExamples = this.getRecommendedExamples(primaryGenre, secondaryGenres, profile);

    // 6. 获取避免技法
    const avoidTechniques = this.getAvoidTechniques(primaryGenre, profile);

    // 7. 生成系统提示
    const systemHints = this.generateSystemHints(primaryGenre, profile);

    // 8. 计算置信度
    const confidence = this.calculateConfidence(profile);

    return {
      recommendedExamples,
      techniqueDirectives: allDirectives.map(d => ({
        technique_id: d.technique_id,
        technique_name: d.technique_name,
        application_hint: d.application_hint,
      })),
      weightHints: this.generateWeightHints(primaryGenre, allDirectives),
      avoidTechniques,
      systemHints,
      confidence,
    };
  }

  /**
   * Recommend narrative frameworks
   */
  recommendNarrativeFrameworks(profile: NovelProfile): NarrativeFrameworkRecommendation {
    const primaryGenre = profile.genre[0] || '其他';
    const genreProfile = this.getGenreTechniqueProfile(primaryGenre);

    const frameworkTypes = genreProfile?.narrativeFrameworks || ['线性叙事'];

    // 从参考库获取示例
    const examples = retrieveReferenceExamples({
      libraryId: 'narrative-framework',
      mode: 'hybrid',
      maxExamples: 3,
      tags: frameworkTypes,
      minQualityScore: 70,
    });

    return {
      frameworkTypes,
      recommendedExamples: examples,
    };
  }

  /**
   * Recommend visual lens styles
   */
  recommendVisualLenses(profile: NovelProfile): VisualLensRecommendation {
    const primaryGenre = profile.genre[0] || '其他';
    const genreProfile = this.getGenreTechniqueProfile(primaryGenre);

    const lensTypes = genreProfile?.visualLenses || ['叙事描写'];

    // 从参考库获取示例
    const examples = retrieveReferenceExamples({
      libraryId: 'visual-lens',
      mode: 'hybrid',
      maxExamples: 3,
      tags: lensTypes,
      minQualityScore: 70,
    });

    return {
      lensTypes,
      recommendedExamples: examples,
    };
  }

  /**
   * Get sub-genre specific directives
   */
  private getSubGenreDirectives(subGenres: SubGenreTag[]): TechniqueDirectiveTemplate[] {
    const directives: TechniqueDirectiveTemplate[] = [];

    for (const subGenre of subGenres) {
      switch (subGenre) {
        case '废柴逆袭':
        case '退婚流':
          directives.push({
            technique_id: '欲扬先抑',
            technique_name: '欲扬先抑',
            application_hint: '开篇要充分压抑，打压越狠，后面逆袭越爽。',
            priority: 'high',
          });
          break;
        case '系统流':
          directives.push({
            technique_id: '紧张舒缓交替',
            technique_name: '紧张舒缓交替',
            application_hint: '系统提示用轻松笔调，任务危机用紧张节奏，形成对比。',
            priority: 'high',
          });
          break;
        case '快穿':
        case '无限流':
          directives.push({
            technique_id: '横云断山法',
            technique_name: '横云断山法',
            application_hint: '每个世界用不同节奏，穿插切换增加丰富度。',
            priority: 'high',
          });
          break;
        case '都市重生':
          directives.push({
            technique_id: '心理时间',
            technique_name: '心理时间·托尔斯泰',
            application_hint: '重生瞬间的记忆闪回可以用心理时间拉长。',
            priority: 'medium',
          });
          break;
      }
    }

    return directives;
  }

  /**
   * Get tone modifiers
   */
  private getToneModifiers(tones: ToneTag[]): Partial<TechniqueDirectiveTemplate>[] {
    return tones
      .map(tone => TONE_DIRECTIVE_MODIFIERS[tone])
      .filter(Boolean);
  }

  /**
   * Merge directives with priority ordering
   */
  private mergeDirectives(
    genre: TechniqueDirectiveTemplate[],
    subGenre: TechniqueDirectiveTemplate[],
    toneModifiers: Partial<TechniqueDirectiveTemplate>[]
  ): TechniqueDirectiveTemplate[] {
    const directiveMap = new Map<string, TechniqueDirectiveTemplate>();

    // 先加入题材指令
    for (const d of genre) {
      directiveMap.set(d.technique_id, d);
    }

    // 子题材指令覆盖或补充
    for (const d of subGenre) {
      if (directiveMap.has(d.technique_id)) {
        // 合并hint
        const existing = directiveMap.get(d.technique_id)!;
        existing.application_hint += ' ' + d.application_hint;
        if (d.priority === 'high') {
          existing.priority = 'high';
        }
      } else {
        directiveMap.set(d.technique_id, d);
      }
    }

    // 按优先级排序
    return Array.from(directiveMap.values()).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get recommended examples from reference library
   */
  private getRecommendedExamples(
    primaryGenre: GenreTag,
    secondaryGenres: GenreTag[],
    profile: NovelProfile
  ): ReferenceExample[] {
    // 确定要查询的标签
    const genreTags = [primaryGenre, ...secondaryGenres];

    // 子题材标签
    const subGenreTags = profile.subGenres.map(s => s);

    // 基调标签
    const toneTags = profile.tone;

    // 合并所有标签
    const allTags = [...genreTags, ...subGenreTags, ...toneTags];

    // 从参考库检索
    const examples = retrieveReferenceExamples({
      libraryId: 'writing-technique',
      mode: 'hybrid',
      maxExamples: 5,
      tags: allTags,
      minQualityScore: 60,
    });

    // 如果检索结果太少，放宽条件
    if (examples.length < 3) {
      const fallbackExamples = retrieveReferenceExamples({
        libraryId: 'writing-technique',
        mode: 'hybrid',
        maxExamples: 5 - examples.length,
        minQualityScore: 50,
      });
      examples.push(...fallbackExamples);
    }

    return examples;
  }

  /**
   * Get techniques to avoid
   */
  private getAvoidTechniques(genre: GenreTag, profile: NovelProfile): string[] {
    const genreProfile = this.getGenreTechniqueProfile(genre);
    const avoid = [...(genreProfile?.avoidTechniques || [])];

    // 如果基调是"甜宠"，可能避免太虐心技法
    if (profile.tone.includes('甜宠')) {
      avoid.push('心理时间'); // 避免过度沉重的心理描写
    }

    // 爽文避免拖沓
    if (profile.specialTags.includes('爽文')) {
      avoid.push('故作消闲之笔'); // 避免无意义的慢节奏
    }

    return [...new Set(avoid)];
  }

  /**
   * Generate system hints
   */
  private generateSystemHints(genre: GenreTag, profile: NovelProfile): string[] {
    const hints: string[] = [];

    // 添加题材特有的提示
    const genreProfile = this.getGenreTechniqueProfile(genre);
    if (genreProfile?.systemHints) {
      hints.push(...genreProfile.systemHints);
    }

    // 根据子题材添加
    if (profile.subGenres.includes('废柴逆袭')) {
      hints.push('主角初期要足够惨，逆袭要有层次感');
    }
    if (profile.subGenres.includes('系统流')) {
      hints.push('系统规则要有趣，任务设计要巧妙');
    }

    // 根据基调添加
    if (profile.tone.includes('热血')) {
      hints.push('情感表达要饱满有力，不要克制');
    }
    if (profile.tone.includes('虐心')) {
      hints.push('情感描写要深沉，不要轻飘飘');
    }

    // 根据叙事视角添加
    if (profile.narrativePerspective.includes('第一人称主角')) {
      hints.push('用"我"的主观视角，增强代入感');
    }

    // 根据节奏偏好添加
    if (profile.pacingPreference === '快节奏') {
      hints.push('叙事要紧凑，不要过度铺垫');
    }
    if (profile.pacingPreference === '慢热') {
      hints.push('可以慢慢展开世界观，但中后期要加速');
    }

    return hints;
  }

  /**
   * Generate weight hints for prompts
   */
  private generateWeightHints(genre: GenreTag, directives: TechniqueDirectiveTemplate[]): string[] {
    const hints: string[] = [];

    const highPriority = directives.filter(d => d.priority === 'high');
    for (const d of highPriority) {
      hints.push(`【重点】${d.technique_name}：${d.application_hint}`);
    }

    return hints;
  }

  /**
   * Get genre technique profile
   */
  private getGenreTechniqueProfile(genre: GenreTag) {
    return GENRE_TECHNIQUE_MAP[genre] ?? GENRE_TECHNIQUE_MAP['其他'];
  }

  /**
   * Calculate recommendation confidence
   */
  private calculateConfidence(profile: NovelProfile): number {
    let confidence = 0.5;

    // 题材明确加成分
    if (profile.genre.length === 1) {
      confidence += 0.2;
    }

    // 子题材明确加成分
    if (profile.subGenres.length > 0) {
      confidence += 0.1;
    }

    // 有标签加成分
    if (profile.specialTags.length > 0) {
      confidence += 0.1;
    }

    // 有简介加成分
    if (profile.themes.length > 0) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const techniqueRecommender = new TechniqueRecommender();

// ============================================================
// Convenience Functions
// ============================================================

export function recommendTechniques(profile: NovelProfile): TechniqueRecommendation {
  return techniqueRecommender.recommend(profile);
}

export function recommendNarrativeFrameworks(profile: NovelProfile): NarrativeFrameworkRecommendation {
  return techniqueRecommender.recommendNarrativeFrameworks(profile);
}

export function recommendVisualLenses(profile: NovelProfile): VisualLensRecommendation {
  return techniqueRecommender.recommendVisualLenses(profile);
}

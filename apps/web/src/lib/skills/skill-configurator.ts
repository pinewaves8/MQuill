/**
 * Skill Configurator - Configures skills with dynamic recommendations
 *
 * Ties together:
 * - NovelAnalyzer: analyzes novel metadata
 * - TechniqueRecommender: recommends techniques
 * - ReferenceLibraryStore: retrieves examples
 *
 * Produces configured skill inputs with:
 * - Dynamic technique directives
 * - Weighted reference examples
 * - Customized system prompts
 */

import type { NovelProfile } from './novel-analyzer';
import { NovelAnalyzer, analyzeNovel } from './novel-analyzer';
import {
  TechniqueRecommender,
  recommendTechniques,
  recommendNarrativeFrameworks,
  recommendVisualLenses,
  type TechniqueRecommendation,
} from './technique-recommender';
import type { ReferenceExample, TechniqueDirective } from './skill-interface';
import { retrieveReferenceExamples } from './reference-library-store';

// ============================================================
// Skill Configuration
// ============================================================

export interface SkillConfiguration {
  // 项目ID
  projectId: string;

  // 小说档案
  novelProfile: NovelProfile;

  // 推荐结果
  recommendation: TechniqueRecommendation;

  // 叙事骨架推荐
  narrativeFrameworkRecommendation: ReturnType<typeof recommendNarrativeFrameworks>;

  // 画面镜头推荐
  visualLensRecommendation: ReturnType<typeof recommendVisualLenses>;

  // 技能特定配置
  skillConfigs: {
    [skillId: string]: IndividualSkillConfig;
  };
}

export interface IndividualSkillConfig {
  // 是否启用
  enabled: boolean;
  // 注入的技法指令
  techniqueDirectives: TechniqueDirective[];
  // 注入的参考样本
  referenceExamples: ReferenceExample[];
  // 额外的系统提示
  additionalSystemHints: string[];
  // 权重
  weights: Record<string, number>;
}

// ============================================================
// Skill Configurator
// ============================================================

export class SkillConfigurator {
  private analyzer: NovelAnalyzer;
  private recommender: TechniqueRecommender;

  constructor() {
    this.analyzer = new NovelAnalyzer();
    this.recommender = new TechniqueRecommender();
  }

  /**
   * Configure skills based on novel metadata
   */
  configure(params: {
    projectId: string;
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
  }): SkillConfiguration {
    // 1. 分析小说档案
    const novelProfile = this.analyzer.analyze({
      title: params.title,
      description: params.description,
      bookType: params.bookType,
      targetLength: params.targetLength,
      tags: params.tags,
      styleKeywords: params.styleKeywords,
      charter: params.charter,
    });

    // 2. 推荐技法
    const recommendation = this.recommender.recommend(novelProfile);

    // 3. 推荐叙事骨架
    const narrativeFrameworkRecommendation = this.recommender.recommendNarrativeFrameworks(novelProfile);

    // 4. 推荐画面镜头
    const visualLensRecommendation = this.recommender.recommendVisualLenses(novelProfile);

    // 5. 生成各技能配置
    const skillConfigs = this.generateSkillConfigs(novelProfile, recommendation);

    return {
      projectId: params.projectId,
      novelProfile,
      recommendation,
      narrativeFrameworkRecommendation,
      visualLensRecommendation,
      skillConfigs,
    };
  }

  /**
   * Generate individual skill configurations
   */
  private generateSkillConfigs(
    profile: NovelProfile,
    recommendation: TechniqueRecommendation
  ): SkillConfiguration['skillConfigs'] {
    return {
      'bootstrap-skill': {
        enabled: true,
        techniqueDirectives: [],
        referenceExamples: [],
        additionalSystemHints: this.getBootstrapHints(profile),
        weights: {},
      },
      'outline-skill': {
        enabled: true,
        techniqueDirectives: this.getOutlineDirectives(recommendation),
        referenceExamples: recommendation.recommendedExamples.filter(
          ex => ex.category === 'narrative-framework'
        ),
        additionalSystemHints: recommendation.systemHints,
        weights: {},
      },
      'scene-plan-skill': {
        enabled: true,
        techniqueDirectives: this.getScenePlanDirectives(recommendation),
        referenceExamples: recommendation.recommendedExamples.filter(
          ex => ex.category === 'visual-lens'
        ),
        additionalSystemHints: [],
        weights: {},
      },
      'write-skill': {
        enabled: true,
        techniqueDirectives: recommendation.techniqueDirectives,
        referenceExamples: recommendation.recommendedExamples.filter(
          ex => ex.category === 'writing-technique'
        ),
        additionalSystemHints: recommendation.systemHints,
        weights: this.getTechniqueWeights(recommendation),
      },
      'evaluate-skill': {
        enabled: true,
        techniqueDirectives: [],
        referenceExamples: [],
        additionalSystemHints: this.getEvaluateHints(profile),
        weights: {},
      },
      'revision-skill': {
        enabled: true,
        techniqueDirectives: recommendation.techniqueDirectives.slice(0, 3), // 只取最重要的3个
        referenceExamples: recommendation.recommendedExamples.filter(
          ex => ex.category === 'writing-technique'
        ).slice(0, 3),
        additionalSystemHints: [],
        weights: {},
      },
      'publishability-skill': {
        enabled: true,
        techniqueDirectives: recommendation.techniqueDirectives,
        referenceExamples: recommendation.recommendedExamples,
        additionalSystemHints: recommendation.systemHints,
        weights: {},
      },
    };
  }

  /**
   * Get bootstrap-specific hints
   */
  private getBootstrapHints(profile: NovelProfile): string[] {
    const hints: string[] = [];

    // 根据题材添加宪章生成提示
    if (profile.genre.includes('玄幻') || profile.genre.includes('仙侠')) {
      hints.push('生成 Charter 时要包含：修炼体系设定、境界层次划分、金手指设计原则');
    }
    if (profile.genre.includes('都市')) {
      hints.push('生成 Charter 时要包含：社会阶层设定、主角身份背景、都市规则');
    }
    if (profile.genre.includes('武侠')) {
      hints.push('生成 Charter 时要包含：武林门派体系、江湖规矩、武功流派');
    }

    // 根据基调添加
    if (profile.tone.includes('热血')) {
      hints.push('Charter 中的 coreConflict 要有对抗性，主角要有强烈目标');
    }
    if (profile.tone.includes('虐心')) {
      hints.push('Charter 中的 theme 要有深度，能承载情感重量');
    }

    return hints;
  }

  /**
   * Get outline skill directives
   */
  private getOutlineDirectives(recommendation: TechniqueRecommendation): TechniqueDirective[] {
    // 大纲阶段主要关注结构类技法
    const structureTechniques = [
      '大间架法',      // 毛宗岗
      '横云断山法',    // 金圣叹
      '多线并行',      // 金庸
      '层层递进',      // 古典+现代
      '首尾呼应法',    // 张竹坡
    ];

    return recommendation.techniqueDirectives
      .filter(d => structureTechniques.some(t => d.technique_name.includes(t)))
      .slice(0, 3);
  }

  /**
   * Get scene plan skill directives
   */
  private getScenePlanDirectives(recommendation: TechniqueRecommendation): TechniqueDirective[] {
    // 场景规划阶段关注画面和叙事类技法
    const sceneTechniques = [
      '烘云托月法',    // 脂砚斋
      '云龙雾雨',      // 脂砚斋
      '紧张舒缓交替',  // 金庸
      '一击两鸣',      // 金圣叹
    ];

    return recommendation.techniqueDirectives
      .filter(d => sceneTechniques.some(t => d.technique_name.includes(t)))
      .slice(0, 2);
  }

  /**
   * Get evaluation hints
   */
  private getEvaluateHints(profile: NovelProfile): string[] {
    const hints: string[] = [];

    // 根据题材调整评估重点
    if (profile.genre.includes('玄幻') || profile.genre.includes('仙侠')) {
      hints.push('重点评估：修炼逻辑是否自洽、升级是否有层次感、金手指代价是否合理');
    }
    if (profile.genre.includes('都市')) {
      hints.push('重点评估：人物行为是否符合社会逻辑、对话是否接地气、细节是否真实');
    }
    if (profile.genre.includes('武侠')) {
      hints.push('重点评估：武功描写是否有新意、江湖规矩是否有约束力');
    }
    if (profile.genre.includes('悬疑')) {
      hints.push('重点评估：伏笔是否埋设自然、真相揭示是否合理、误导是否巧妙');
    }

    // 根据节奏偏好调整
    if (profile.pacingPreference === '快节奏') {
      hints.push('评估时注意节奏是否紧凑，是否有拖沓的段落');
    }
    if (profile.pacingPreference === '慢热') {
      hints.push('评估时注意慢热部分是否有信息量，后期是否开始加速');
    }

    return hints;
  }

  /**
   * Get technique weights for prompting
   */
  private getTechniqueWeights(recommendation: TechniqueRecommendation): Record<string, number> {
    const weights: Record<string, number> = {};

    for (const directive of recommendation.techniqueDirectives) {
      weights[directive.technique_id] = directive.priority === 'high' ? 1.5 : directive.priority === 'medium' ? 1.0 : 0.5;
    }

    return weights;
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const skillConfigurator = new SkillConfigurator();

// ============================================================
// Convenience Functions
// ============================================================

export function configureSkills(params: {
  projectId: string;
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
}): SkillConfiguration {
  return skillConfigurator.configure(params);
}

/**
 * Quick configure for write skill only (most common use case)
 */
export function configureWriteSkill(params: {
  projectId: string;
  title?: string;
  description?: string;
  bookType?: string;
  tags?: string[];
}): {
  techniqueDirectives: TechniqueDirective[];
  referenceExamples: ReferenceExample[];
  systemHints: string[];
} {
  const config = configureSkills(params);
  const writeConfig = config.skillConfigs['write-skill'];

  return {
    techniqueDirectives: writeConfig.techniqueDirectives,
    referenceExamples: writeConfig.referenceExamples,
    systemHints: writeConfig.additionalSystemHints,
  };
}

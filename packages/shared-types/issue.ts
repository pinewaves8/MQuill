// ============================================================
// Evaluation Issue Types - 8-Dimension Evaluation System
// ============================================================

// Gate layer status
export type GateStatus = 'pass' | 'warn' | 'fail';

// Issue severity (unchanged)
export type IssueSeverity = 'low' | 'medium' | 'high';

// Issue status (unchanged)
export type IssueStatus = 'open' | 'in_revision' | 'fixed' | 'wont_fix';

// 8-Dimension Score Types
export type EvaluationDimension =
  | 'chapter_goal_completion'      // 章节功能完成度 (15分)
  | 'plot_progress_and_causality' // 剧情推进与因果性 (15分)
  | 'conflict_and_tension'         // 冲突与张力 (15分)
  | 'character_and_voice'          // 人物塑造与角色声音 (15分)
  | 'language_and_style'           // 语言与文风质量 (10分)
  | 'continuity_and_consistency'  // 连贯性与一致性 (10分)
  | 'information_and_pacing'       // 信息控制与节奏 (10分)
  | 'ending_hook'                 // 结尾钩子与续读意愿 (10分)
  | 'ai_smell';                    // AI味检测 (特殊维度)

// Score summary for 8 dimensions
export interface EvaluationScoreSummary {
  chapter_goal_completion: number;      // 15分
  plot_progress_and_causality: number; // 15分
  conflict_and_tension: number;         // 15分
  character_and_voice: number;          // 15分
  language_and_style: number;          // 10分
  continuity_and_consistency: number;  // 10分
  information_and_pacing: number;       // 10分
  ending_hook: number;                 // 10分
  total: number;                       // 100分
  ai_smell_severity?: 'low' | 'medium' | 'high'; // AI味严重度
}

// Legacy 6-dimension type (for backward compatibility)
export type LegacyIssueType = 'style' | 'pacing' | 'character' | 'lore' | 'timeline' | 'clarity';
export interface LegacyScoreSummary {
  style: number;
  pacing: number;
  character: number;
  lore: number;
  timeline: number;
  clarity: number;
}

// Gate check results
export interface GateCheckResult {
  status: GateStatus;
  reason: string;
}

export interface GateResults {
  text_completeness: GateCheckResult;        // 文本完整性
  readability_format: GateCheckResult;       // 格式与可读性
  continuity_hard_conflict: GateCheckResult; // 设定硬冲突
  chapter_goal_alignment: GateCheckResult;   // 章节目标对齐度
  ai_template_smell: GateCheckResult;        // 明显AI模板化
}

// Issue tag types (from design doc)
export type IssueTag =
  // 剧情类
  | 'weak_plot_progress'
  | 'causality_gap'
  | 'convenient_plot_device'
  | 'missing_key_event'
  // 冲突类
  | 'low_tension'
  | 'weak_conflict'
  | 'stakes_too_low'
  // 人物类
  | 'flat_character_voice'
  | 'character_out_of_role'
  | 'weak_protagonist_agency'
  | 'tool_like_supporting_cast'
  // 语言风格类
  | 'ai_smell'
  | 'repetitive_expression'
  | 'expository_tone'
  | 'over_abstract_emotion'
  | 'weak_style_alignment'
  // 连贯性类
  | 'continuity_error'
  | 'worldbuilding_conflict'
  | 'timeline_conflict'
  | 'abrupt_transition'
  // 节奏类
  | 'pace_too_slow'
  | 'pace_too_fast'
  | 'info_dump'
  | 'underdeveloped_scene'
  // 章节结构类
  | 'missing_hook'
  | 'chapter_goal_not_met'
  | 'chapter_flat_arc';

// Evaluation decision types
export type EvaluationDecision =
  | 'pass'                    // 通过 (90-100分)
  | 'pass_with_notes'         // 通过但有优化建议 (80-89分)
  | 'partial_rewrite'         // 局部重写 (70-79分)
  | 'full_rewrite'            // 整章重写 (60-69分)
  | 'human_review'            // 转人工审阅 (0-59分)
  | 'gate_fail';              // Gate失败

// Revision suggestion levels
export type RevisionLevel = 'must_fix' | 'should_improve' | 'optional_enhancement';

// Extended Evaluation Issue
export interface EvaluationIssue {
  id: string;
  projectId: string;
  chapterId: string;
  issueType: EvaluationDimension | LegacyIssueType;
  severity: IssueSeverity;
  title: string;
  reason: string;
  locationRef?: string;
  suggestion?: string;
  status: IssueStatus;
  linkedVersionId?: string;
  linkedVersionLabel?: string;
  linkedVersionSummary?: string;
  excerpt?: string;
  paragraphIndex?: number;
  createdAt: Date;
  updatedAt: Date;
  // Extended fields from design doc
  tags?: IssueTag[];                    // 问题标签 (3-8个)
  revisionLevel?: RevisionLevel;         // 修订级别
  aiSmellSeverity?: 'low' | 'medium' | 'high'; // AI味严重度
}

// Full evaluation result
export interface EvaluationResult {
  chapterId: string;
  gate: GateResults;
  scores: EvaluationScoreSummary;
  issueTags: IssueTag[];
  strengths: string[];                  // 亮点
  majorIssues: string[];                 // 主要问题
  revision: {
    must_fix: string[];
    should_improve: string[];
    optional_enhancements: string[];
  };
  decision: EvaluationDecision;
}

// Input/Output interfaces
export interface EvaluateChapterInput {
  projectId: string;
  chapterId: string;
  dimensions?: EvaluationDimension[];
}

export interface EvaluateChapterOutput {
  chapterId: string;
  scoreSummary: EvaluationScoreSummary;
  issues: EvaluationIssue[];
}

export interface CreateRevisionFromIssueInput {
  issueId: string;
  suggestion?: string;
  goals?: string[];
  constraints?: string[];
}

// Metrics for UI display (3-card summary)
export interface EvaluationMetrics {
  readability: number;      // 可读性评分 (from clarity + style)
  rhythm: number;           // 节奏健康度 (from pacing + info_control)
  consistency: number;      // 人物一致性 (from character + continuity)
}

// Status metadata for UI
export const ISSUE_STATUS_META: Record<IssueStatus, { label: string; classes: string }> = {
  open: { label: '待处理', classes: 'bg-blue-50 text-blue-600 border-blue-200' },
  in_revision: { label: '处理中', classes: 'bg-amber-50 text-amber-600 border-amber-200' },
  fixed: { label: '已处理', classes: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  wont_fix: { label: '不修复', classes: 'bg-gray-50 text-gray-500 border-gray-200' },
};

export const SEVERITY_META: Record<IssueSeverity, { label: string; classes: string }> = {
  high: { label: '高优先级', classes: 'bg-red-100 text-red-700 border-red-200' },
  medium: { label: '中优先级', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  low: { label: '低优先级', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
};

// Tag category mapping for UI
export const TAG_CATEGORY_META: Record<string, { label: string; tags: IssueTag[] }> = {
  剧情: {
    label: '剧情',
    tags: ['weak_plot_progress', 'causality_gap', 'convenient_plot_device', 'missing_key_event'],
  },
  冲突: {
    label: '冲突',
    tags: ['low_tension', 'weak_conflict', 'stakes_too_low'],
  },
  人物: {
    label: '人物',
    tags: ['flat_character_voice', 'character_out_of_role', 'weak_protagonist_agency', 'tool_like_supporting_cast'],
  },
  风格: {
    label: '风格',
    tags: ['ai_smell', 'repetitive_expression', 'expository_tone', 'over_abstract_emotion', 'weak_style_alignment'],
  },
  连贯性: {
    label: '连贯性',
    tags: ['continuity_error', 'worldbuilding_conflict', 'timeline_conflict', 'abrupt_transition'],
  },
  节奏: {
    label: '节奏',
    tags: ['pace_too_slow', 'pace_too_fast', 'info_dump', 'underdeveloped_scene'],
  },
  结构: {
    label: '结构',
    tags: ['missing_hook', 'chapter_goal_not_met', 'chapter_flat_arc'],
  },
};

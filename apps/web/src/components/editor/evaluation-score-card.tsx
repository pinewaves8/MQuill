'use client';

import {
  EvaluationScoreCard as ScoreCardType,
  getScoreColor,
  getOverallGrade,
  getGradeLabel,
  SCORE_CARD_WEIGHTS,
} from '@packages/shared-types';

interface EvaluationScoreCardProps {
  scoreCard: ScoreCardType;
}

const DIMENSION_LABELS: Record<string, string> = {
  readability: '可读性',
  rhythm: '节奏健康',
  characterConsistency: '人物一致',
  plotCompleteness: '剧情完整',
  foreshadowRecovery: '伏笔回收',
  aiSmell: '模板化检测',
};

const DIMENSION_DESCRIPTIONS: Record<string, string> = {
  readability: '句子结构、表达清晰度',
  rhythm: '段落长短交替、冲突密度',
  characterConsistency: '对话风格、行为逻辑一致',
  plotCompleteness: '章节目标完成度、伏笔埋入',
  foreshadowRecovery: '已回收伏笔/总伏笔比例',
  aiSmell: 'AI模板化句式浓度（越低越好）',
};

function ScoreBar({ score, color }: { score: number; color: 'green' | 'yellow' | 'red' }) {
  const colorClasses = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-red-500',
  };

  const bgClasses = {
    green: 'bg-emerald-100 border-emerald-200',
    yellow: 'bg-amber-100 border-amber-200',
    red: 'bg-red-100 border-red-200',
  };

  return (
    <div className={`rounded-xl p-3 border ${bgClasses[color]} transition-all`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-lg font-bold ${color === 'green' ? 'text-emerald-700' : color === 'yellow' ? 'text-amber-700' : 'text-red-700'}`}>
          {score}
        </span>
        <span className={`text-xs ${color === 'green' ? 'text-emerald-600' : color === 'yellow' ? 'text-amber-600' : 'text-red-600'}`}>
          {score === 100 ? '完美' : score >= 80 ? '优秀' : score >= 60 ? '良好' : score >= 40 ? '一般' : '较差'}
        </span>
      </div>
      <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClasses[color]}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function OverallScoreDisplay({ score, grade, percentile }: { score: number; grade: ScoreCardType['overallGrade']; percentile: number }) {
  const gradeColorClasses = {
    excellent: 'from-emerald-500 to-emerald-600',
    good: 'from-blue-500 to-blue-600',
    fair: 'from-amber-500 to-amber-600',
    poor: 'from-red-500 to-red-600',
  };

  const gradeBgClasses = {
    excellent: 'bg-emerald-50 border-emerald-200',
    good: 'bg-blue-50 border-blue-200',
    fair: 'bg-amber-50 border-amber-200',
    poor: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`rounded-2xl p-5 border bg-gradient-to-br ${gradeColorClasses[grade]} ${gradeBgClasses[grade]}`}>
      <div className="text-center mb-3">
        <div className="text-4xl font-bold text-gray-900 mb-1">
          {score}
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">{getGradeLabel(grade)}</span>
          {percentile > 0 && ` · 超越 ${percentile}% 的章节`}
        </div>
      </div>

      {/* Score level indicator */}
      <div className="flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((level) => {
          const threshold = level * 20;
          const isActive = score >= threshold;
          const isPartial = score >= threshold - 10 && score < threshold;
          return (
            <div
              key={level}
              className={`h-1.5 rounded-full transition-all ${
                isActive ? 'bg-gray-900' : isPartial ? 'bg-gray-400' : 'bg-gray-200'
              }`}
              style={{ width: `${level <= 3 ? 16 : 12}px` }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function EvaluationScoreCard({ scoreCard }: EvaluationScoreCardProps) {
  const { overall, overallGrade, percentile, dimensions } = scoreCard;

  const dimensionEntries = Object.entries(dimensions).filter(([key]) => key !== 'aiSmell' || dimensions.aiSmell.score > 0);

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <OverallScoreDisplay score={overall} grade={overallGrade} percentile={percentile} />

      {/* Dimension Scores Grid */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(dimensions).map(([key, dim]) => {
          // For AI smell, lower is better - invert the color logic
          const isAiSmell = key === 'aiSmell';
          const displayScore = isAiSmell ? (100 - dim.score) : dim.score;
          const color = isAiSmell
            ? (dim.score <= 15 ? 'green' : dim.score <= 35 ? 'yellow' : 'red')
            : dim.color;

          return (
            <div key={key} className="relative group">
              <ScoreBar score={isAiSmell ? dim.score : dim.score} color={color} />
              <div className="mt-1.5 text-center">
                <span className="text-xs font-medium text-gray-700">
                  {DIMENSION_LABELS[key] || key}
                </span>
              </div>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 whitespace-nowrap">
                {DIMENSION_DESCRIPTIONS[key] || dim.description}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Smell Special Display */}
      {dimensions.aiSmell && dimensions.aiSmell.score > 0 && (
        <div className="mt-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-gray-600">AI模板化程度</span>
              <p className="text-xs text-gray-500 mt-0.5">
                {dimensions.aiSmell.score <= 15 ? '几乎没有AI痕迹' :
                 dimensions.aiSmell.score <= 35 ? '略有AI痕迹' :
                 dimensions.aiSmell.score <= 60 ? 'AI痕迹明显' : '严重AI模板化'}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-lg font-bold ${
                dimensions.aiSmell.score <= 15 ? 'text-emerald-600' :
                dimensions.aiSmell.score <= 35 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {dimensions.aiSmell.score}%
              </span>
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                dimensions.aiSmell.score <= 15 ? 'bg-emerald-500' :
                dimensions.aiSmell.score <= 35 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${dimensions.aiSmell.score}%` }}
            />
          </div>
        </div>
      )}

      {/* Weight Reference */}
      <details className="mt-4">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
          评分权重说明
        </summary>
        <div className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">
          <div>剧情完整度 30% · 人物一致性 25% · 节奏健康 15%</div>
          <div>伏笔回收 10% · 可读性 10% · 模板化检测 10%</div>
        </div>
      </details>
    </div>
  );
}

/**
 * Convert 8-dimension EvaluationScoreSummary to 6-dimension EvaluationScoreCard
 */
export function buildScoreCard(
  scores: {
    chapter_goal_completion: number;
    plot_progress_and_causality: number;
    conflict_and_tension: number;
    character_and_voice: number;
    language_and_style: number;
    continuity_and_consistency: number;
    information_and_pacing: number;
    ending_hook: number;
    ai_smell_severity?: 'low' | 'medium' | 'high';
  },
  foreshadowRecoveryRate: number = 0
): ScoreCardType {
  // Map 8 dimensions to 6 dimensions
  const readability = Math.round((scores.language_and_style + scores.information_and_pacing) / 2);
  const rhythm = Math.round((scores.information_and_pacing + scores.conflict_and_tension) / 2);
  const characterConsistency = Math.round(scores.character_and_voice);
  const plotCompleteness = Math.round(
    (scores.chapter_goal_completion + scores.plot_progress_and_causality + scores.ending_hook) / 3
  );

  // AI smell: convert severity to score (higher = more AI smell)
  const aiSmellScore = scores.ai_smell_severity === 'low' ? 12 :
                       scores.ai_smell_severity === 'medium' ? 28 : 55;

  // Calculate overall weighted score
  const overall = Math.round(
    plotCompleteness * SCORE_CARD_WEIGHTS.plotCompleteness +
    characterConsistency * SCORE_CARD_WEIGHTS.characterConsistency +
    rhythm * SCORE_CARD_WEIGHTS.rhythm +
    foreshadowRecoveryRate * SCORE_CARD_WEIGHTS.foreshadowRecovery +
    readability * SCORE_CARD_WEIGHTS.readability +
    aiSmellScore * SCORE_CARD_WEIGHTS.aiSmell
  );

  // Calculate percentile (mock - in real implementation would compare to historical data)
  const percentile = Math.max(0, Math.min(99, Math.round(overall * 0.8 + Math.random() * 20)));

  const dimensions = {
    readability: {
      name: 'readability',
      label: '可读性',
      score: readability,
      maxScore: 100,
      weight: SCORE_CARD_WEIGHTS.readability,
      color: getScoreColor(readability),
      description: DIMENSION_DESCRIPTIONS.readability,
    },
    rhythm: {
      name: 'rhythm',
      label: '节奏健康',
      score: rhythm,
      maxScore: 100,
      weight: SCORE_CARD_WEIGHTS.rhythm,
      color: getScoreColor(rhythm),
      description: DIMENSION_DESCRIPTIONS.rhythm,
    },
    characterConsistency: {
      name: 'characterConsistency',
      label: '人物一致',
      score: characterConsistency,
      maxScore: 100,
      weight: SCORE_CARD_WEIGHTS.characterConsistency,
      color: getScoreColor(characterConsistency),
      description: DIMENSION_DESCRIPTIONS.characterConsistency,
    },
    plotCompleteness: {
      name: 'plotCompleteness',
      label: '剧情完整',
      score: plotCompleteness,
      maxScore: 100,
      weight: SCORE_CARD_WEIGHTS.plotCompleteness,
      color: getScoreColor(plotCompleteness),
      description: DIMENSION_DESCRIPTIONS.plotCompleteness,
    },
    foreshadowRecovery: {
      name: 'foreshadowRecovery',
      label: '伏笔回收',
      score: foreshadowRecoveryRate,
      maxScore: 100,
      weight: SCORE_CARD_WEIGHTS.foreshadowRecovery,
      color: getScoreColor(foreshadowRecoveryRate),
      description: DIMENSION_DESCRIPTIONS.foreshadowRecovery,
    },
    aiSmell: {
      name: 'aiSmell',
      label: '模板化',
      score: aiSmellScore,
      maxScore: 100,
      weight: SCORE_CARD_WEIGHTS.aiSmell,
      color: (aiSmellScore <= 15 ? 'green' : aiSmellScore <= 35 ? 'yellow' : 'red') as 'green' | 'yellow' | 'red',
      description: DIMENSION_DESCRIPTIONS.aiSmell,
    },
  };

  return {
    overall,
    overallGrade: getOverallGrade(overall),
    percentile,
    dimensions,
  };
}

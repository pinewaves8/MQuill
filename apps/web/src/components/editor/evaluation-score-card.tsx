'use client';

import {
  EvaluationScoreCard as ScoreCardType,
  getOverallGrade,
  SCORE_CARD_WEIGHTS,
} from '@packages/shared-types';

interface EvaluationScoreCardProps {
  scoreCard: ScoreCardType;
}

type ScoreColor = 'green' | 'yellow' | 'red';

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
  plotCompleteness: '章节目标完成度、伏笔埋设',
  foreshadowRecovery: '已回收伏笔占比',
  aiSmell: 'AI 模板化句式浓度，越低越好',
};

const GRADE_LABELS: Record<ScoreCardType['overallGrade'], string> = {
  excellent: '优秀',
  good: '良好',
  fair: '一般',
  poor: '较差',
};

function getScoreColor(score: number): ScoreColor {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}

function getRiskColor(score: number): ScoreColor {
  if (score <= 15) return 'green';
  if (score <= 35) return 'yellow';
  return 'red';
}

function getOverallTone(score: number): {
  ring: string;
  badge: string;
  accent: string;
  progress: string;
  pager: string;
} {
  if (score >= 85) {
    return {
      ring: 'text-emerald-500',
      badge: 'border-emerald-100 bg-emerald-50 text-emerald-600',
      accent: 'text-emerald-500',
      progress: 'bg-emerald-400',
      pager: 'bg-emerald-400',
    };
  }

  if (score >= 70) {
    return {
      ring: 'text-amber-500',
      badge: 'border-amber-100 bg-amber-50 text-amber-600',
      accent: 'text-amber-500',
      progress: 'bg-amber-400',
      pager: 'bg-amber-400',
    };
  }

  return {
    ring: 'text-rose-500',
    badge: 'border-rose-100 bg-rose-50 text-rose-600',
    accent: 'text-rose-500',
    progress: 'bg-rose-400',
    pager: 'bg-rose-400',
  };
}

function getMetricTone(score: number): {
  card: string;
  label: string;
  value: string;
  track: string;
  fill: string;
} {
  if (score >= 80) {
    return {
      card: 'border-emerald-100 bg-emerald-50',
      label: 'text-emerald-700',
      value: 'text-emerald-600',
      track: 'bg-emerald-200',
      fill: 'bg-emerald-500',
    };
  }

  if (score >= 60) {
    return {
      card: 'border-amber-100 bg-amber-50',
      label: 'text-amber-700',
      value: 'text-amber-600',
      track: 'bg-amber-200',
      fill: 'bg-amber-500',
    };
  }

  return {
    card: 'border-slate-100 bg-slate-50',
    label: 'text-slate-600',
    value: 'text-rose-500',
    track: 'bg-slate-200',
    fill: 'bg-rose-400',
  };
}

function OverallScoreHeader({
  score,
  grade,
  percentile,
}: {
  score: number;
  grade: ScoreCardType['overallGrade'];
  percentile: number;
}) {
  const tone = getOverallTone(score);
  const circumference = 100;
  const dashOffset = circumference - (Math.max(0, Math.min(score, 100)) / 100) * circumference;
  const pagerIndex = Math.min(4, Math.max(0, Math.floor(score / 20)));

  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0">
          <svg className="-rotate-90 h-14 w-14" viewBox="0 0 36 36">
            <path
              className="text-slate-100"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className={`${tone.ring} transition-all duration-700 ease-out`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-slate-800">{score}</span>
          </div>
        </div>

        <div>
          <div className="mb-0.5 flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">章节质量评估</h2>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tone.badge}`}>
              {GRADE_LABELS[grade]}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {percentile > 0 ? `超越 ${percentile}% 的章节` : '百分位校准中'}
          </p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`h-1.5 w-6 rounded-full ${index === pagerIndex ? tone.pager : 'bg-slate-300'}`}
          />
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  score,
  emphasize = false,
}: {
  label: string;
  score: number;
  emphasize?: boolean;
}) {
  const tone = emphasize
    ? {
        card: 'border-amber-100 bg-amber-50',
        label: 'text-amber-700',
        value: 'text-amber-600',
        track: 'bg-amber-200',
        fill: 'bg-amber-500',
      }
    : getMetricTone(score);

  return (
    <div className={`rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm ${tone.card}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className={`text-xs font-medium ${tone.label}`}>{label}</span>
        <span className={`text-xs font-semibold ${tone.value}`}>{score}</span>
      </div>
      <div className={`h-2 overflow-hidden rounded-full ${tone.track}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${tone.fill}`}
          style={{ width: `${Math.max(0, Math.min(score, 100))}%` }}
        />
      </div>
    </div>
  );
}

function AiSummaryCard({ score }: { score: number }) {
  const riskColor = getRiskColor(score);
  const tone =
    riskColor === 'green'
      ? {
          value: 'text-emerald-600',
          fill: 'bg-emerald-500',
        }
      : riskColor === 'yellow'
        ? {
            value: 'text-amber-600',
            fill: 'bg-amber-500',
          }
        : {
            value: 'text-rose-500',
            fill: 'bg-rose-400',
          };
  const description =
    score <= 15 ? '几乎没有 AI 痕迹' : score <= 35 ? '略有 AI 痕迹' : score <= 60 ? 'AI 痕迹明显' : '高度模板化';

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">AI模板化程度</h3>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
        <div className={`text-right text-2xl font-bold ${tone.value}`}>{score}%</div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${tone.fill}`}
          style={{ width: `${Math.max(0, Math.min(score, 100))}%` }}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
        <span>自然</span>
        <span>高度模板化</span>
      </div>
    </div>
  );
}

export function EvaluationScoreCard({ scoreCard }: EvaluationScoreCardProps) {
  const { overall, overallGrade, percentile, dimensions } = scoreCard;
  const displayDimensions = [
    { key: 'readability', label: DIMENSION_LABELS.readability, score: dimensions.readability.score },
    { key: 'rhythm', label: DIMENSION_LABELS.rhythm, score: dimensions.rhythm.score },
    {
      key: 'characterConsistency',
      label: DIMENSION_LABELS.characterConsistency,
      score: dimensions.characterConsistency.score,
    },
    {
      key: 'plotCompleteness',
      label: DIMENSION_LABELS.plotCompleteness,
      score: dimensions.plotCompleteness.score,
    },
    {
      key: 'foreshadowRecovery',
      label: DIMENSION_LABELS.foreshadowRecovery,
      score: dimensions.foreshadowRecovery.score,
    },
    { key: 'aiSmell', label: DIMENSION_LABELS.aiSmell, score: dimensions.aiSmell.score, emphasize: true },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <OverallScoreHeader score={overall} grade={overallGrade} percentile={percentile} />

      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
        {displayDimensions.map((dimension) => (
          <MetricCard
            key={dimension.key}
            label={dimension.label}
            score={dimension.score}
            emphasize={dimension.emphasize}
          />
        ))}
      </div>

      <div className="px-4 pb-4">
        <AiSummaryCard score={dimensions.aiSmell.score} />
      </div>

      <div className="px-4 pb-4 text-center">
        <p className="text-xs text-slate-400">评分越高表示质量越好 · 满分 100 分制</p>
      </div>
    </div>
  );
}

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
  const chapterGoalCompletion = normalizeScore(scores.chapter_goal_completion, 15);
  const plotProgressAndCausality = normalizeScore(scores.plot_progress_and_causality, 15);
  const conflictAndTension = normalizeScore(scores.conflict_and_tension, 15);
  const characterConsistency = normalizeScore(scores.character_and_voice, 15);
  const languageAndStyle = normalizeScore(scores.language_and_style, 10);
  const informationAndPacing = normalizeScore(scores.information_and_pacing, 10);
  const endingHook = normalizeScore(scores.ending_hook, 10);
  const readability = Math.round((languageAndStyle + informationAndPacing) / 2);
  const rhythm = Math.round((informationAndPacing + conflictAndTension) / 2);
  const plotCompleteness = Math.round(
    (chapterGoalCompletion + plotProgressAndCausality + endingHook) / 3
  );

  const aiSmellScore = mapAiSmellSeverityToRisk(scores.ai_smell_severity);
  const aiNaturalness = 100 - aiSmellScore;

  const totalWeight =
    SCORE_CARD_WEIGHTS.plotCompleteness +
    SCORE_CARD_WEIGHTS.characterConsistency +
    SCORE_CARD_WEIGHTS.rhythm +
    SCORE_CARD_WEIGHTS.readability +
    SCORE_CARD_WEIGHTS.aiSmell;

  const overall = Math.round(
    (
      plotCompleteness * SCORE_CARD_WEIGHTS.plotCompleteness +
      characterConsistency * SCORE_CARD_WEIGHTS.characterConsistency +
      rhythm * SCORE_CARD_WEIGHTS.rhythm +
      readability * SCORE_CARD_WEIGHTS.readability +
      aiNaturalness * SCORE_CARD_WEIGHTS.aiSmell
    ) / totalWeight
  );

  const percentile = 0;

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
      label: '模板化检测',
      score: aiSmellScore,
      maxScore: 100,
      weight: SCORE_CARD_WEIGHTS.aiSmell,
      color: getRiskColor(aiSmellScore),
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

function normalizeScore(value: number, maxScore: number): number {
  if (!Number.isFinite(value) || maxScore <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / maxScore) * 100)));
}

function mapAiSmellSeverityToRisk(severity?: 'low' | 'medium' | 'high'): number {
  if (severity === 'low') return 12;
  if (severity === 'high') return 55;
  return 28;
}

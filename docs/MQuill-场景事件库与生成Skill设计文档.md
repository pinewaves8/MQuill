# MQuill 场景事件库与生成 Skill 设计文档

## 一、设计目标

构建一套**场景事件库 + 生成 Skill 系统**，实现"检索增强 + 结构化改写 + 风格适配"的场景事件生成能力。

核心理念：小说生成的强大不在于"让模型凭空编"，而在于：

> 先从高质量、结构化的**叙事素材库**中检索"场景元素 + 事件原型 + 冲突机制 + 情绪轨迹 + 类型约束"，再由 Skill 进行**重组、改写、升级、去模板化**，最终生成服务于当前小说的原创场景事件。

---

## 二、现有架构分析

### 2.1 Skill 系统架构

现有 Skill 系统位于 `apps/web/src/lib/skills/`，结构如下：

```
skills/
├── index.ts                    # 导出入口
├── skill-interface.ts           # 核心类型定义
├── skill-registry.ts            # Skill 注册表
├── skill-executor.ts           # Skill 执行器
├── skill-orchestrator.ts       # 流程编排器
├── skill-loop-controller.ts    # 循环控制器
├── skill-configurator.ts        # 动态配置器
├── reference-library-store.ts   # 参考样本库（现有 3 类库）
├── novel-analyzer.ts           # 小说元数据分析
├── technique-recommender.ts     # 技法推荐引擎
└── skills/                     # 具体 Skill 实现
    ├── bootstrap-skill.ts
    ├── outline-skill.ts
    ├── scene-plan-skill.ts      # 现有场景规划 Skill
    ├── write-skill.ts
    ├── evaluate-skill.ts
    ├── revision-skill.ts
    └── publishability-skill.ts
```

### 2.2 现有参考库

现有 `reference-library-store.ts` 提供三类参考库：

| 库 ID | 类型 | 内容 |
|--------|------|------|
| `narrative-framework` | 叙事骨架 | 大纲、梗概、叙事结构（史诗、成长小说、循环时间等） |
| `visual-lens` | 视觉镜头 | 场景、细节、画面感、感官描写（意境、氛围、动作描写等） |
| `writing-technique` | 笔法技法 | 冰山理论、意识流、草蛇灰线等中西技法 |

---

## 三、整体架构设计

### 3.1 新增四库

在 `reference-library-store.ts` 基础上新增四类参考库：

| 库 ID | 类型 | 说明 |
|--------|------|------|
| `scene-library` | 场景库 | 叙事容器原型（环境、氛围、空间结构） |
| `event-library` | 事件库 | 叙事动作原型（冲突、信息揭示、关系变化） |
| `scene-event-pattern` | 场景-事件组合模板库 | 高适配经典组合 |
| `scene-event-example` | 场景事件案例库 | 参考案例与变体 |

### 3.2 新增四 Skill

| Skill ID | 名称 | 职责 |
|----------|------|------|
| `scene-retrieval-skill` | 场景检索 Skill | 根据需求检索最合适的场景原型 |
| `event-retrieval-skill` | 事件检索 Skill | 根据叙事功能检索最合适的事件原型 |
| `scene-event-composer-skill` | 场景事件组合 Skill | 融合场景 + 事件 + 人物状态 + 章节目标，生成场景事件卡 |
| `scene-event-polish-skill` | 场景事件打磨 Skill | 去套路化、风格统一、节奏优化、悬念强化 |

### 3.3 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Skill Orchestrator                             │
│              (场景事件生成流程编排)                                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Scene        │     │  Event        │     │  Pattern      │
│  Retrieval    │     │  Retrieval    │     │  Retrieval    │
│  Skill        │     │  Skill        │     │  Skill        │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Scene Library │     │ Event Library │     │ Pattern Lib   │
│ (场景原型库)  │     │ (事件原型库)  │     │ (经典组合库)  │
└───────────────┘     └───────────────┘     └───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   SceneEvent Composer Skill   │
              │   (场景事件组合生成)            │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   SceneEvent Polish Skill     │
              │   (去套路化 & 风格适配)        │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │     Scene Event Card          │
              │     (结构化场景事件卡)          │
              └───────────────────────────────┘
```

---

## 四、数据结构设计

### 4.1 场景原型 (SceneTemplate)

```typescript
interface SceneTemplate {
  id: string;
  name: string;
  description: string;

  // 标签体系
  genre_tags: string[];           // 武侠、悬疑、都市、科幻等
  era_tags: string[];             // 古代、近代、现代、未来、架空等
  location_type: string;          // 码头、客栈、战场、医院等
  time_type: string;              // 白天、夜晚、黎明、黄昏等
  weather: string;               // 晴天、雨天、雾天、雪天等
  space_structure: string;        // 开阔、封闭、半开放、垂直等
  mood_tags: string[];            // 压抑、欢快、紧张、神秘等

  // 空间属性
  public_private_level: number;   // 1-10，公开/私密程度
  danger_level: number;          // 1-10，危险程度
  secrecy_level: number;         // 1-10，隐秘程度
  sensory_features: string[];    // 潮声、木板湿滑、灯火摇晃等
  social_rules: string[];        // 人流杂、身份混杂、容易潜伏等

  // 叙事属性
  affordances: string[];          // 适合发生的互动类型：偶遇、跟踪、伏击、离别等
  constraints: string[];         // 空间带来的限制
  typical_characters: string[];  // 典型出场人物
  common_conflicts: string[];    // 常见冲突类型
  common_functions: string[];    // 常见叙事功能：引入主角、埋钩子、升级冲突等

  // 质量指标
  fit_score?: number;            // 组合适配分
  cliché_risk?: number;           // 1-10，套路风险
  originality_score?: number;     // 1-10，原创性

  // 来源
  reference_examples?: string[];  // 参考案例
  source_work?: string;          // 来源作品
}

interface ReferenceExample {
  id: string;
  title: string;
  category: 'scene-library' | 'event-library' | 'scene-event-pattern' | 'scene-event-example';
  content: string;
  technique_tags?: string[];
  source_author?: string;
  source_work?: string;
  quality_score?: number; // 0-100
}
```

### 4.2 事件原型 (EventTemplate)

```typescript
interface EventTemplate {
  id: string;
  name: string;
  description: string;

  // 标签体系
  genre_tags: string[];
  event_type: EventType;

  // 触发条件
  trigger_conditions: string[];
  participants: string[];         // 主角、旧识、敌人、旁观者等
  participant_count: number;      // 参与人数

  // 叙事属性
  core_conflict: string;         // 核心冲突
  stakes: string;                 // 赌注/利害关系
  information_role: string;       // 信息角色：揭示线索、隐藏真相、误导等
  emotion_curve: string[];        // 情绪曲线：平静→紧张→爆发
  intensity: number;              // 1-10，强度
  reversibility: number;          // 1-10，可逆转程度（低=不可逆影响大）

  // 内容属性
  dialogue_density: 'low' | 'medium' | 'high';
  action_density: 'low' | 'medium' | 'high';
  pace_impact: 'slow' | 'steady' | 'fast';

  // 变体
  common_outcomes: string[];      // 常见结果
  twist_options: string[];        // 可反转点

  // 质量指标
  cliché_risk?: number;
  originality_score?: number;
}

type EventType =
  | 'encounter'           // 相遇
  | 'revelation'          // 揭示
  | 'confrontation'        // 对峙
  | 'pursuit'              // 追逃
  | 'discovery'            // 发现
  | 'betrayal'             // 背叛
  | 'sacrifice'            // 牺牲
  | 'transformation'       // 转变
  | 'conflict_escalation'  // 冲突升级
  | 'relationship_shift'   // 关系变化
  | 'information_exchange' // 信息交换
  | 'identity_reveal'      // 身份揭露
  | 'trap'                 // 陷阱
  | 'escape'               // 逃脱
  | 'negotiation'          // 谈判
  | 'ceremony'             // 仪式
  | 'accident'             // 意外
  | 'secret_meeting'      // 密会
  | 'departure'            // 离别
  | 'reunion';             // 重逢
```

### 4.3 场景-事件组合模板 (SceneEventPattern)

```typescript
interface SceneEventPattern {
  id: string;
  name: string;
  description: string;

  // 关联的原型
  scene_id: string;
  event_id: string;

  // 适配性评估
  fit_score: number;             // 0-10，组合适配度
  why_it_works: string;          // 为什么有效

  // 使用指导
  typical_usage: string[];       // 典型用法：主角初登场、旧案重开、引出敌方监视等
  tone_variants: string[];       // 调性变体：冷峻、宿命、惊险、哀伤

  // 风险控制
  cliché_risk: number;           // 1-10，套路风险
  subversion_options: string[];  // 反套路方法
  upgrade_methods: string[];     // 升级方法

  // 示例
  example_outline: string;       // 示例大纲

  // 质量指标
  effectiveness_score?: number;   // 有效性评分
  originality_score?: number;     // 原创性评分
}
```

### 4.4 结构化场景事件卡 (SceneEventCard)

这是 Skill 的核心输出格式：

```typescript
interface SceneEventCard {
  // 基础信息
  id: string;
  title: string;
  narrative_function: NarrativeFunction[];

  // 场景设定
  location: {
    type: string;
    atmosphere: string;
    sensory_details: string[];
    time: string;
    weather?: string;
  };

  // 参与者
  participating_characters: Array<{
    character_id: string;
    role: 'protagonist' | 'antagonist' | 'supporting' | 'incidental';
    viewpoint: boolean;
    emotional_state: string;
  }>;

  // 叙事结构
  objective: string;              // 本场目标
  external_conflict: string;       // 外部冲突
  internal_conflict: string;      // 内部冲突（心理层面）

  // 事件进展
  event_trigger: string;          // 事件触发点
  event_progression: string[];    // 事件发展步骤
  key_turning_point: string;      // 关键转折

  // 信息管理
  information_revealed: string[]; // 揭露的信息
  information_hidden: string[];    // 隐藏的信息（后续揭露）

  // 情绪节奏
  emotional_arc: string[];        // 情绪弧线
  pacing_notes: string;           // 节奏提示

  // 结尾
  ending_hook: string;            // 钩子（为下一场铺垫）
  tension_level: number;          // 1-10，张力等级

  // 质量控制
  cliché_risk_assessment: number; // 套路风险评估
  originality_elements: string[];  // 原创性元素
  upgrade_applied: string[];      // 已应用的升级策略
}

type NarrativeFunction =
  | 'introduce_character'    // 引入角色
  | 'establish_setting'      // 建立设定
  | '制造悬念'               // create_hook
  | '制造冲突'               // escalate_conflict
  | '制造反转'               // create_reversal
  | '揭示信息'               // reveal_information
  | '推进关系'               // advance_relationship
  | '制造危机'               // create_crisis
  | '埋设伏笔'               // plant_foreshadowing
  | '回收伏笔'               // payoff_foreshadowing
  | '制造高潮'               // build_climax
  | '情绪缓冲'               // emotional_beat
  | '关系转变'               // shift_relationship'
  | '揭示真相'               // reveal_truth;
```

---

## 五、Skill 详细设计

### 5.1 Scene Retrieval Skill

**Skill ID**: `scene-retrieval-skill`

**职责**: 根据当前写作需求，检索最合适的场景原型

**输入**:
```typescript
interface SceneRetrievalSkillInput extends SkillInputSchema {
  projectId: string;

  // 需求描述
  narrative_function?: NarrativeFunction[];  // 需要的叙事功能
  genre?: string;                           // 题材
  era?: string;                              // 时代
  intensity?: number;                        // 需要的张力等级 1-10
  tone?: string;                             // 调性要求

  // 约束
  required_affordances?: string[];          // 必须的场景能力
  forbidden_location_types?: string[];        // 禁用的场景类型

  // 人物状态
  character_count?: number;                  // 参与人物数量
  protagonist_emotional_state?: string;       // 主角情绪状态

  // 偏好
  novelty_weight?: number;                   // 原创性权重 0-1
  retrieval_mode?: 'semantic' | 'keyword' | 'hybrid';
  max_results?: number;
}
```

**输出**:
```typescript
interface SceneRetrievalSkillOutput extends SkillOutputSchema {
  deliverable: {
    scenes: SceneTemplate[];
    retrieval_reasoning: string;             // 检索理由
    match_scores: Record<string, number>;    // 各场景匹配分
  };
}
```

### 5.2 Event Retrieval Skill

**Skill ID**: `event-retrieval-skill`

**职责**: 根据叙事功能需求，检索最合适的事件原型

**输入**:
```typescript
interface EventRetrievalSkillInput extends SkillInputSchema {
  projectId: string;

  // 需求描述
  narrative_function?: NarrativeFunction[];  // 需要的叙事功能
  event_type?: EventType[];                   // 事件类型偏好
  genre?: string;

  // 强度控制
  intensity?: number;                         // 需要的强度 1-10
  pace_impact?: 'slow' | 'steady' | 'fast';

  // 信息需求
  information_role?: string;                  // 需要揭示/隐藏什么

  // 约束
  participant_count?: number;                 // 参与人数
  forbidden_event_types?: EventType[];         // 禁用的事件类型

  // 连续性
  previous_event_id?: string;                  // 上一场事件（避免重复）

  // 偏好
  novelty_weight?: number;
  retrieval_mode?: 'semantic' | 'keyword' | 'hybrid';
  max_results?: number;
}
```

**输出**:
```typescript
interface EventRetrievalSkillOutput extends SkillOutputSchema {
  deliverable: {
    events: EventTemplate[];
    retrieval_reasoning: string;
    match_scores: Record<string, number>;
  };
}
```

### 5.3 SceneEvent Composer Skill

**Skill ID**: `scene-event-composer-skill`

**职责**: 把场景 + 事件 + 人物状态 + 章节目标融合，生成多个候选场景事件卡

**输入**:
```typescript
interface SceneEventComposerSkillInput extends SkillInputSchema {
  projectId: string;

  // 上下文
  chapter_goal: string;                       // 章节目标
  scene_goal: string;                          // 本场目标
  required_functions: NarrativeFunction[];       // 必须完成的叙事功能

  // 已检索的素材（可选）
  candidate_scenes?: SceneTemplate[];
  candidate_events?: EventTemplate[];
  candidate_patterns?: SceneEventPattern[];

  // 人物状态
  character_states: Record<string, {
    emotional_state: string;
    relationship_states: Record<string, string>;
    hidden_secrets: string[];
    goals: string[];
  }>;

  // 约束
  tone_style?: string;                         // 调性风格
  intensity_target?: number;                    // 目标张力 1-10
  forbidden_cliches?: string[];                // 禁用的套路
  must_include_elements?: string[];           // 必须包含的元素
  must_avoid_elements?: string[];             // 必须避免的元素

  // 输出控制
  word_budget?: number;                        // 字数预算
  candidate_count?: number;                    // 生成的候选数量，默认 3
}
```

**输出**:
```typescript
interface SceneEventComposerSkillOutput extends SkillOutputSchema {
  deliverable: {
    candidates: SceneEventCard[];              // 多个候选方案
    selected_variant: 'conservative' | 'dramatic' | 'literary' | 'anti-cliché';
    combination_reasoning: string;             // 组合理由
    pattern_usage: Array<{                     // 使用的模板
      pattern_id: string;
      adaptation_notes: string;
    }>;
  };
}
```

### 5.4 SceneEvent Polish Skill

**Skill ID**: `scene-event-polish-skill`

**职责**: 去套路化、风格统一、节奏优化、悬念强化

**输入**:
```typescript
interface SceneEventPolishSkillInput extends SkillInputSchema {
  projectId: string;

  // 待打磨的场景事件卡
  scene_event_card: SceneEventCard;

  // 打磨方向
  polish_goals: Array<{
    goal: 'reduce_cliché' | 'enhance_originality' | 'adjust_tone' | 'strengthen_hook' | 'improve_pacing';
    priority: 'high' | 'medium' | 'low';
    specific_guidance?: string;
  }>;

  // 当前小说上下文
  novel_style_keywords?: string[];
  forbidden_expressions?: string[];           // 禁止的表达方式
  required_style_elements?: string[];         // 必须的风格元素

  // 类型约束
  genre?: string;
  intensity_adjustment?: number;              // 张力微调 +/-3
}
```

**输出**:
```typescript
interface SceneEventPolishSkillOutput extends SkillOutputSchema {
  deliverable: {
    polished_card: SceneEventCard;
    applied_polish: Array<{
      original_aspect: string;
      polished_aspect: string;
      technique_used: string;
    }>;
    cliché_mitigation: string[];             // 已规避的套路
    originality_boost: string[];              // 增强的原创性元素
  };
}
```

---

## 六、参考库初始化数据

### 6.1 第一期支持类型

| 类型 | 场景数 | 事件数 | 组合模板数 |
|------|--------|--------|-----------|
| 武侠 | 30 | 50 | 40 |
| 悬疑 | 30 | 50 | 40 |
| 都市 | 30 | 50 | 40 |
| 科幻 | 30 | 50 | 40 |
| 侦探 | 30 | 50 | 40 |

### 6.2 场景库初始数据示例

```typescript
// 武侠 - 江湖码头夜雾
const scene_jianghu_dock_night: SceneTemplate = {
  id: 'scene_wuxia_dock_night',
  name: '江湖码头夜雾',
  description: '薄雾笼罩的江湖码头，潮声与船楫声交织，人流混杂身份难辨',
  genre_tags: ['武侠', '江湖', '悬疑'],
  era_tags: ['古代', '架空'],
  location_type: '码头',
  time_type: '夜晚',
  weather: '薄雾',
  space_structure: '开阔但有货栈遮挡',
  mood_tags: ['漂泊', '压抑', '杀机潜伏'],
  public_private_level: 6,
  danger_level: 7,
  secrecy_level: 6,
  sensory_features: ['潮声', '木板湿滑', '灯火摇晃', '船楫声'],
  social_rules: ['人流杂', '身份混杂', '容易潜伏'],
  affordances: ['偶遇', '跟踪', '接头', '伏击', '离别'],
  constraints: ['视线受雾影响', '人多易掩护', '逃跑路线复杂'],
  typical_characters: ['江湖客', '船家', '商旅', '潜伏者'],
  common_conflicts: ['埋伏', '旧识重逢', '情报交换'],
  common_functions: ['引入主角', '埋钩子', '制造危险'],
  cliché_risk: 6,
  originality_score: 4,
};

// 悬疑 - 医院抢救室外走廊
const scene_hospital_corridor: SceneTemplate = {
  id: 'scene_suspense_hospital_corridor',
  name: '医院抢救室外走廊',
  description: '惨白灯光下的医院走廊，等候的家属神情焦虑，护士匆匆往来',
  genre_tags: ['悬疑', '都市', '现实'],
  era_tags: ['现代'],
  location_type: '医院走廊',
  time_type: '深夜',
  weather: '室内',
  space_structure: '封闭狭长',
  mood_tags: ['紧张', '焦虑', '未知'],
  public_private_level: 5,
  danger_level: 4,
  secrecy_level: 3,
  sensory_features: ['消毒水味', '脚步声回荡', '心电监护仪声'],
  social_rules: ['禁止喧哗', '家属等候'],
  affordances: ['等待消息', '偷听', '身份掩护', '观察'],
  constraints: ['公共空间', '可能有监控'],
  typical_characters: ['家属', '医生', '警察', '可疑者'],
  common_conflicts: ['生死未卜', '秘密交易', '身份接近'],
  common_functions: ['制造悬念', '揭示信息', '关系推进'],
  cliché_risk: 4,
  originality_score: 6,
};
```

### 6.3 事件库初始数据示例

```typescript
// 事件 - 旧识递来残缺线索
const event_old_acquaintance_delivers_note: EventTemplate = {
  id: 'event_suspense_old_acquaintance_note',
  name: '旧识之仆递来残笺',
  description: '一个看似普通的信使带来一封残缺的信件或纸条，内容指向关键线索',
  genre_tags: ['悬疑', '武侠', '权谋'],
  event_type: 'revelation',
  trigger_conditions: ['主角独处或半独处', '周围可有旁人掩护'],
  participants: ['主角', '信使', '潜在监视者'],
  participant_count: 3,
  core_conflict: '主角是否接信、是否暴露与旧识的关系',
  stakes: '旧案重开、身份暴露、被敌方盯上',
  information_role: '抛出新线索',
  emotion_curve: ['平静', '微疑', '紧张'],
  intensity: 4,
  reversibility: 3,
  dialogue_density: 'medium',
  action_density: 'low',
  pace_impact: 'steady',
  common_outcomes: ['主角收信', '暗中观察', '转入追杀'],
  twist_options: ['信是伪造', '送信者被灭口', '信中内容不完整'],
  cliché_risk: 5,
  originality_score: 5,
};

// 事件 - 当众身份揭露
const event_public_identity_reveal: EventTemplate = {
  id: 'event_drama_public_identity_reveal',
  name: '当众身份揭露',
  description: '在公开场合，主角的真实身份或秘密被当众揭穿，引发连锁反应',
  genre_tags: ['武侠', '权谋', '都市'],
  event_type: 'identity_reveal',
  trigger_conditions: ['公开场合', '有敌人在场', '有第三方观察者'],
  participants: ['主角', '揭穿者', '观众'],
  participant_count: 4,
  core_conflict: '身份崩塌后的信任危机',
  stakes: '社会关系破裂、敌人确认、盟友立场动摇',
  information_role: '强制揭露',
  emotion_curve: ['平静', '震惊', '混乱', '爆发'],
  intensity: 9,
  reversibility: 2,
  dialogue_density: 'high',
  action_density: 'medium',
  pace_impact: 'fast',
  common_outcomes: ['公开对峙', '关系破裂', '意外盟友出现'],
  twist_options: ['揭露是误解', '揭穿者有更大目的', '观众中有人暗中相助'],
  cliché_risk: 7,
  originality_score: 3,
};
```

---

## 七、实现计划

### 7.1 第一阶段：基础设施

1. **扩展 `skill-interface.ts`**
   - 添加 `ReferenceLibraryType` 新增四种库类型
   - 添加 `SceneTemplate`、`EventTemplate`、`SceneEventPattern` 接口
   - 添加四个新 Skill 的输入输出类型

2. **扩展 `reference-library-store.ts`**
   - 新增四库数据结构
   - 实现 `registerSceneTemplate`、`registerEventTemplate`、`registerPattern` 方法
   - 实现 `retrieveSceneTemplates`、`retrieveEventTemplates`、`retrievePatterns` 方法
   - 实现种子数据加载函数

### 7.2 第二阶段：检索 Skill

3. **实现 `scene-retrieval-skill.ts`**
   - 基于标签和语义的场景检索
   - 与 `grounding-pack` 集成获取项目上下文

4. **实现 `event-retrieval-skill.ts`**
   - 基于叙事功能的事件检索
   - 考虑连续性（避免重复）

### 7.3 第三阶段：组合与打磨 Skill

5. **实现 `scene-event-composer-skill.ts`**
   - 多阶段生成流程
   - 候选方案多样性（保守、戏剧、文学、反套路）
   - 输出结构化 `SceneEventCard`

6. **实现 `scene-event-polish-skill.ts`**
   - 套路检测与规避
   - 原创性增强
   - 风格适配

### 7.4 第四阶段：注册与集成

7. **在 `skill-registry.ts` 中注册新 Skill**

8. **在 `skill-configurator.ts` 中添加场景事件相关配置**

9. **更新 `skill-orchestrator.ts` 支持新 Skill 流程**

### 7.5 文件清单

| 文件路径 | 改动类型 |
|----------|----------|
| `apps/web/src/lib/skills/skill-interface.ts` | 扩展类型 |
| `apps/web/src/lib/skills/reference-library-store.ts` | 扩展库 |
| `apps/web/src/lib/skills/skills/scene-retrieval-skill.ts` | 新建 |
| `apps/web/src/lib/skills/skills/event-retrieval-skill.ts` | 新建 |
| `apps/web/src/lib/skills/skills/scene-event-composer-skill.ts` | 新建 |
| `apps/web/src/lib/skills/skills/scene-event-polish-skill.ts` | 新建 |
| `apps/web/src/lib/skills/skill-registry.ts` | 注册新 Skill |
| `apps/web/src/lib/skills/skill-configurator.ts` | 添加配置 |
| `apps/web/src/lib/skills/skill-orchestrator.ts` | 流程集成 |

---

## 八、使用流程

### 8.1 完整场景事件生成流程

```
用户/Agent 请求场景事件生成
           │
           ▼
┌──────────────────────────────┐
│   Scene Retrieval Skill      │◄── 项目上下文 (grounding-pack)
│   检索候选场景               │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   Event Retrieval Skill      │◄── 章节目标、叙事功能需求
│   检索候选事件               │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   Pattern Retrieval          │◄── 场景+事件组合
│   读取经典组合模板           │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  SceneEvent Composer Skill    │
│  组合生成多个候选方案         │
│  (保守/戏剧/文学/反套路)      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   SceneEvent Polish Skill     │
│   去套路化 & 风格适配         │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     SceneEventCard            │
│     结构化场景事件卡输出       │
└──────────────────────────────┘
```

### 8.2 与现有 Skill 的衔接

```
outline-skill
      │
      ▼
scene-event-composer-skill  ◄──►  scene-retrieval-skill
      │                              event-retrieval-skill
      │                              scene-event-polish-skill
      ▼
scene-plan-skill
      │
      ▼
write-skill
```

---

## 九、验证方式

### 9.1 单元测试

- 场景检索：给定需求，返回符合标签/语义匹配的候选场景
- 事件检索：给定叙事功能，返回符合条件的事件原型
- 组合生成：给定上下文，生成包含多候选的场景事件卡

### 9.2 集成测试

- 完整流程：从章节目标到场景事件卡
- 与现有 Skill 衔接：从 outline-skill 到 scene-event-composer-skill 到 write-skill

### 9.3 人工评估

- 生成的质量：原创性、去套路化、贴合上下文
- 库的覆盖度：5 类题材的支持情况
- 候选多样性：是否提供足够的变体选择

下面直接给出可开工版本。

# 《MQuill v1 可开工设计文档》

## 0. 文档目标

`MQuill v1` 的目标不是一次做完“工业级世界模拟小说操作系统”，而是在你现有 UI 骨架和前面两版规划的基础上，落出一个**真实可开发、可迭代、可验证**的第一版：
先把“项目创建 → 场景规划 → 正文编辑 → 修订审阅 → 版本比较 → 评估问题回流”这条主链路跑通，再把检索、记忆、一致性和多 Agent 逐步加深。这个取舍符合旧稿里“优先建设工件系统、编辑系统和版本系统”“以中篇作为第一阶段核心验证对象”的建议，也吸收了正式版中多 Agent、检索基座和一致性校验的工程骨架。  

---

## 1. v1 产品范围

### 1.1 v1 必做范围

MQuill v1 只做 6 个核心能力：

1. 项目创建与作品总览
2. 三栏创作工作台
3. SceneCard 规划与管理
4. 正文编辑与局部修订
5. 版本记录与 diff 比较
6. 评估问题单与修订回流

这个范围直接对应你现有 HTML 已经显式存在的能力：总览页、创建新书、AI 场景助手、场景状态管理、修订模态、版本比较、评估问题联动、UI 状态记忆。   

### 1.2 v1 暂不做

以下内容进入 v1.1 或 v2：

* 完整世界模拟沙盘
* 复杂人物关系图
* 自动伏笔回收大盘
* Skill 自进化自动晋升
* 多卷长篇全量时间线治理
* 社区 / 灵感库 / 多人协作

这样可以避免正式版里“后台过重、前台落地不足”的问题。

---

## 2. 页面清单

## 2.1 P0 我的作品页

**路由**：`/app`
**目标**：项目资产入口、回流页、快速新建。
**核心模块**：

* 顶部品牌与用户区
* 顶部导航：我的作品 / 灵感库 / 社区（后两者可先占位）
* 欢迎区与进行中作品统计
* 新建作品卡
* 作品列表卡片：状态、简介、章节数、更新时间、字数

这是现有 HTML 首页的直接产品化。

**主要动作**：

* 创建新书
* 打开作品
* 搜索/筛选作品（v1 可做简单版）
* 删除/归档作品（可后置）

---

## 2.2 P1 创建新书弹窗

**入口**：P0 点击“创建新书”
**目标**：生成 `Project` 和 `ProjectCharter` 初始数据。
**现有字段**：

* 书名
* 书籍类型
* 语言
* 分类标签
* 内容描述
* 封面色调
* AI 全自动模式开关 

**v1 新增字段**：

* 目标篇幅：短 / 中 / 长
* 创作模式：全自动 / 共创 / 作者主导
* 叙事视角：第一 / 第三 / 多视角
* 目标读者：通用 / 男频 / 女频 / 文学 / 青少年
* 风格关键词：克制 / 华丽 / 冷峻 / 轻快 等

**提交后行为**：

* 创建 `Project`
* 创建 `ProjectCharter`
* 若为全自动模式，进入自动生成进度页
* 若为共创模式，进入编辑器并先生成创意包/场景草案

---

## 2.3 P2 自动生成进度弹窗

**目标**：把 Agent 编排显式化，而不是黑盒 loading。
**阶段**：

1. 创意提炼
2. 世界/设定草案
3. 角色/剧情骨架
4. SceneCard 生成
5. 正文初稿
6. 质量评估

你现有 HTML 已经展示了大纲设计、章节场景、正文撰写、质量评估的阶段化进度，v1 可以扩成上面 6 步。 

**支持动作**：

* 取消
* 暂停并进入共创
* 查看阶段输出摘要

---

## 2.4 P3 创作工作台

**路由**：`/app/projects/:projectId/editor`
**布局**：三栏。

### 左栏：项目与章节导航

* 项目标题
* 模式与状态
* 卷/章树
* 快速过滤：全部 / 草稿 / 待修订 / 已完成
* 项目入口：大纲、角色、设定、评估、版本

### 中栏：正文编辑主区

* 顶部工具条：保存、生成、修订、评估、比较版本
* 当前章节标题
* 正文编辑器
* 选区工具条：润色 / 扩写 / 压缩 / 改语气 / 生成候选

### 右栏：AI 场景助手

* SceneCard 列表
* 场景数量
* 拖拽调整顺序
* 状态标记：草稿 / 已确认 / 已生成 / 已废弃
* 收起/展开
* 收起状态持久化

这些都直接来自 HTML。  

---

## 2.5 P4 Scene 编辑弹窗

**目标**：把 SceneCard 从“提示卡片”升级为正式工件。
**字段**：

* 场景标题
* 场景摘要
* 视角角色
* 目标
* 冲突
* 预期结果
* 状态
* 备注
* 来源（AI / 人工 / 混合）

**动作**：

* 保存
* AI 重生成
* 删除
* 复制为新场景
* 生成正文

HTML 已经有 scene-edit-modal，因此这页不需要重新发明。

---

## 2.6 P5 修订弹窗

**目标**：把“批注重写”做成结构化任务。
**输入区**：

* 原文
* 修改建议
* 修订目标
* 保持不变
* 候选稿

**输出区**：

* 候选稿预览
* 原文 vs 候选 diff
* 评审标签
* 应用方式：替换 / 追加 / 分支版本

旧稿明确要求“自然语言批注转结构化修订任务”，HTML 里也已经体现候选稿、review、apply mode。 

---

## 2.7 P6 版本比较页 / 面板

**目标**：让版本成为决策工具，不是备份仓。
**模块**：

* 版本列表卡
* 左右版本选择器
* diff 视图
* 版本来源
* 分支信息
* 关联评估问题
* 恢复此版本
* 另存为分支版本
* 加入比较

这些能力已在 HTML 版本逻辑中出现。 

---

## 2.8 P7 评估问题面板

**目标**：质量问题结构化、可修复、可追踪。
**问题类型**：

* 风格偏移
* 节奏拖沓
* 信息重复
* 角色 OOC
* 设定冲突
* 时间线冲突
* 伏笔未回收
* 表达过直白

**动作**：

* 跳转到正文定位
* 一键创建修订任务
* 标记已解决
* 关联到某个版本

这个设计来自旧稿的评测/修订闭环，以及你现有版本记录里已经保留的 `evaluationIssueIds` 和 `evaluationIssueTitle`。 

---

## 3. 核心表结构

以下按“v1 必建表”给。

## 3.1 projects

```sql
create table projects (
  id uuid primary key,
  title varchar(200) not null,
  book_type varchar(32) not null,         -- novel/short/series
  target_length varchar(16) not null,     -- short/mid/long
  language varchar(16) not null,
  mode varchar(16) not null,              -- auto/co_create/author_driven
  status varchar(24) not null,            -- draft/active/paused/completed/archived
  description text,
  cover_tone varchar(32),
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

## 3.2 project_tags

```sql
create table project_tags (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  tag varchar(64) not null
);
```

## 3.3 project_charters

```sql
create table project_charters (
  id uuid primary key,
  project_id uuid unique not null references projects(id) on delete cascade,
  theme text,
  core_conflict text,
  target_audience varchar(64),
  viewpoint varchar(32),
  style_keywords jsonb not null default '[]',
  forbidden_rules jsonb not null default '[]',
  writing_goals jsonb not null default '[]',
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

## 3.4 chapters

```sql
create table chapters (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  parent_volume_id uuid null,
  sort_order int not null,
  title varchar(200) not null,
  summary text,
  status varchar(24) not null,            -- planned/drafting/revising/done
  word_count int not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

## 3.5 scene_cards

正式版里 `Scene` 只有 `sim_result/text/version/state`，v1 需要把它升级成真正的计划工件。

```sql
create table scene_cards (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  sort_order int not null,
  title varchar(200) not null,
  summary text,
  viewpoint_character_id uuid null,
  goal text,
  conflict text,
  expected_outcome text,
  source varchar(16) not null,            -- ai/manual/hybrid
  status varchar(24) not null,            -- draft/confirmed/generated/discarded
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

## 3.6 draft_segments

正文建议不要只存整章全文，还要支持局部修订定位。

```sql
create table draft_segments (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  scene_id uuid null references scene_cards(id),
  segment_index int not null,
  content text not null,
  source varchar(16) not null,            -- ai/manual/hybrid
  is_locked boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

## 3.7 revision_tasks

```sql
create table revision_tasks (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  target_scope varchar(24) not null,      -- selection/segment/chapter
  target_ref_id uuid null,
  suggestion text not null,
  goals jsonb not null default '[]',
  constraints jsonb not null default '[]',
  apply_mode varchar(16) not null,        -- replace/append/branch
  status varchar(24) not null,            -- draft/running/reviewed/applied/rejected
  linked_issue_id uuid null,
  created_by varchar(16) not null,        -- user/agent
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

## 3.8 revision_candidates

```sql
create table revision_candidates (
  id uuid primary key,
  revision_task_id uuid not null references revision_tasks(id) on delete cascade,
  original_text text not null,
  candidate_text text not null,
  diff_payload jsonb,
  score numeric(5,2),
  review_notes text,
  created_at timestamptz not null
);
```

## 3.9 version_records

HTML 已经明确有 `source`、`branchName`、`evaluationIssueIds`、`summary`、`parentId` 等元数据，建议原样固化。 

```sql
create table version_records (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  label varchar(120) not null,
  type varchar(32) not null,              -- autosave/manual/revision/branch/current
  source varchar(64) not null,
  summary text,
  parent_id uuid null references version_records(id),
  branch_name varchar(120),
  snapshot_content text not null,
  word_count int not null,
  is_current boolean not null default false,
  created_at timestamptz not null
);
```

## 3.10 evaluation_issues

```sql
create table evaluation_issues (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  issue_type varchar(32) not null,        -- style/pacing/character/lore/timeline/clarity
  severity varchar(16) not null,          -- low/medium/high
  title varchar(200) not null,
  reason text not null,
  location_ref varchar(128),
  suggestion text,
  status varchar(24) not null,            -- open/in_revision/fixed/wont_fix
  linked_version_id uuid null references version_records(id),
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

## 3.11 memories

旧稿与正式版都强调记忆分层，v1 先做简化版。 

```sql
create table memories (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  memory_type varchar(24) not null,       -- canon/world/narrative/style/user
  key varchar(200) not null,
  content jsonb not null,
  priority int not null default 50,
  source varchar(16) not null,            -- user/agent/system
  updated_at timestamptz not null
);
```

## 3.12 agent_runs

```sql
create table agent_runs (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  chapter_id uuid null references chapters(id),
  scene_id uuid null references scene_cards(id),
  agent_name varchar(64) not null,
  trigger_type varchar(32) not null,      -- create_project/generate_scene/revise/evaluate
  input_payload jsonb not null,
  output_payload jsonb,
  status varchar(24) not null,            -- queued/running/success/failed
  started_at timestamptz,
  finished_at timestamptz
);
```

## 3.13 retrieval_logs

正式版强调检索是基础设施，v1 需要最小留痕。

```sql
create table retrieval_logs (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  run_id uuid null references agent_runs(id),
  retriever_name varchar(64) not null,
  query_text text not null,
  result_refs jsonb not null default '[]',
  usefulness_score numeric(5,2),
  created_at timestamptz not null
);
```

---

## 4. 状态机

## 4.1 项目状态机

```text
draft -> bootstrapping -> active -> paused -> completed -> archived
```

**说明**：

* `draft`：刚创建未生成
* `bootstrapping`：正在跑创意/结构/场景初始化
* `active`：正常创作中
* `paused`：用户暂停
* `completed`：完稿
* `archived`：归档

---

## 4.2 章节状态机

```text
planned -> drafting -> revising -> approved -> done
```

**触发条件**：

* 创建章节：`planned`
* 生成正文/人工开始写：`drafting`
* 创建评估问题或修订任务：`revising`
* 无 open issue 且作者确认：`approved`
* 最终定稿：`done`

---

## 4.3 SceneCard 状态机

这个基本沿用你现在 HTML 里“草稿 / 已确认 / 已生成 / 已废弃”的定义。

```text
draft -> confirmed -> generated -> discarded
```

**状态解释**：

* `draft`：草案，待确认
* `confirmed`：保留并准备生成
* `generated`：已用于正文生成
* `discarded`：废弃，不参与默认流程

**关键规则**：

* 只有 `confirmed` 才允许批量生成正文
* `generated` 可退回 `confirmed`
* `discarded` 不删除，只隐藏

---

## 4.4 修订任务状态机

```text
draft -> running -> reviewed -> applied
                   \-> rejected
```

**规则**：

* 创建任务时是 `draft`
* Agent 执行中是 `running`
* 生成候选后进入 `reviewed`
* 用户接受候选则 `applied`
* 用户放弃则 `rejected`

---

## 4.5 评估问题状态机

```text
open -> in_revision -> fixed
    \-> wont_fix
```

**规则**：

* 新评估发现：`open`
* 建立修订任务：`in_revision`
* 修订被接受且复检通过：`fixed`
* 用户忽略：`wont_fix`

---

## 4.6 版本状态机

版本不是流程状态，而是对象类型：

* `current`
* `autosave`
* `manual`
* `revision`
* `branch`

**规则**：

* 每章只能有一个 `is_current = true`
* 从修订接受生成 `revision`
* 从已有版本分叉生成 `branch`
* 比较器可任意选择两个非空版本

---

## 5. Agent API

v1 不追求一次把所有 Agent 都服务化。
建议拆成两层：

* **同步 API**：用户点击按钮立即返回
* **异步任务 API**：生成、评估、修订走队列

## 5.1 项目相关

### POST `/api/projects`

创建项目。

```json
{
  "title": "长安十二时辰",
  "book_type": "novel",
  "target_length": "mid",
  "language": "zh",
  "mode": "co_create",
  "tags": ["历史", "悬疑"],
  "description": "上元灯会前夕的长安阴谋",
  "cover_tone": "amber",
  "viewpoint": "third_person_limited",
  "target_audience": "general",
  "style_keywords": ["克制", "紧张"]
}
```

### GET `/api/projects/:id`

返回项目详情、统计、当前阶段。

### GET `/api/projects/:id/overview`

返回总览页数据包：

```json
{
  "project": {},
  "chapters_summary": [],
  "scene_stats": {},
  "issue_stats": {},
  "latest_versions": []
}
```

---

## 5.2 Bootstrap / 创意相关

### POST `/api/agents/bootstrap`

根据项目表单生成 `ProjectCharter` 初稿。

```json
{
  "project_id": "uuid"
}
```

返回：

```json
{
  "charter": {
    "theme": "秩序与牺牲",
    "core_conflict": "八个时辰内找出潜伏者",
    "writing_goals": ["强时限", "多线并进"],
    "forbidden_rules": ["不要网文化对白"]
  }
}
```

### POST `/api/agents/idea`

延续正式版 `IdeaAgent`。

```json
{
  "project_id": "uuid",
  "user_prompt": "string"
}
```

---

## 5.3 Scene 相关

### POST `/api/agents/scene-plan`

输入章节，生成 SceneCard 列表。

```json
{
  "project_id": "uuid",
  "chapter_id": "uuid",
  "mode": "outline_to_scene"
}
```

返回：

```json
{
  "scenes": [
    {
      "title": "靖安司召见",
      "summary": "主角被卷入危机",
      "goal": "抛出任务",
      "conflict": "信息不透明",
      "expected_outcome": "接受潜入"
    }
  ]
}
```

### PUT `/api/scenes/:id`

手动修改场景。

### POST `/api/scenes/reorder`

拖拽排序。

```json
{
  "chapter_id": "uuid",
  "scene_ids": ["uuid1", "uuid2", "uuid3"]
}
```

### POST `/api/scenes/:id/generate-draft`

从单个 Scene 生成正文片段。

### POST `/api/chapters/:id/generate-from-scenes`

从全部 `confirmed` 场景顺序生成章节正文。

---

## 5.4 Writer / 修订相关

### POST `/api/agents/write`

正式版 `WriterAgent` 的 v1 简化版。

```json
{
  "project_id": "uuid",
  "chapter_id": "uuid",
  "scene_ids": ["uuid"],
  "style": "project_default"
}
```

### POST `/api/revision-tasks`

创建修订任务。

```json
{
  "project_id": "uuid",
  "chapter_id": "uuid",
  "target_scope": "selection",
  "target_ref_id": "segment-uuid",
  "suggestion": "这里太直白，改得更克制",
  "goals": ["减少解释", "增加暗示感"],
  "constraints": ["保留剧情", "保留人物立场"],
  "apply_mode": "branch"
}
```

### POST `/api/agents/revise`

执行修订任务，生成候选稿。

```json
{
  "revision_task_id": "uuid"
}
```

返回：

```json
{
  "candidate_id": "uuid",
  "original_text": "....",
  "candidate_text": "....",
  "diff_payload": {}
}
```

### POST `/api/revision-candidates/:id/apply`

```json
{
  "mode": "replace"
}
```

效果：

* 更新正文
* 创建 `version_record`
* 更新相关 issue 状态

---

## 5.5 评估相关

### POST `/api/agents/evaluate`

对章节执行评估。

```json
{
  "project_id": "uuid",
  "chapter_id": "uuid",
  "dimensions": ["style", "pacing", "character", "lore"]
}
```

返回：

```json
{
  "score_summary": {
    "style": 7.8,
    "pacing": 6.9
  },
  "issues": [
    {
      "issue_type": "pacing",
      "severity": "medium",
      "title": "首段铺垫偏长",
      "reason": "冲突出现较晚",
      "location_ref": "paragraph:1-2",
      "suggestion": "提前引出威胁"
    }
  ]
}
```

### POST `/api/issues/:id/create-revision`

从问题单一键创建修订任务。

---

## 5.6 版本相关

### GET `/api/chapters/:id/versions`

返回版本列表。

### POST `/api/chapters/:id/versions/snapshot`

手动保存版本。

```json
{
  "label": "版本 1.2",
  "summary": "压缩首段铺垫并提前引出风险"
}
```

### POST `/api/versions/:id/restore`

恢复版本为当前草稿。

### POST `/api/versions/:id/branch`

创建分支版本。

### POST `/api/versions/compare`

```json
{
  "left_version_id": "uuid",
  "right_version_id": "uuid"
}
```

---

## 5.7 一致性与记忆相关

### POST `/api/agents/consistency`

吸收正式版 `ConsistencyJudge`。

```json
{
  "project_id": "uuid",
  "chapter_id": "uuid"
}
```

### POST `/api/memories/upsert`

写入 Canon / Narrative / Style / User memory。

### GET `/api/memories/query`

按类型和 key 查询记忆。

---

## 6. Repo 目录结构

下面这版是适合 Next.js + API Route / Server Actions + Postgres + 队列 Worker 的 v1 目录。

```text
mquill/
├─ apps/
│  └─ web/
│     ├─ app/
│     │  ├─ (dashboard)/
│     │  │  ├─ page.tsx                         # 我的作品页
│     │  │  └─ projects/
│     │  │     ├─ [projectId]/
│     │  │     │  ├─ page.tsx                   # 项目总览
│     │  │     │  ├─ editor/
│     │  │     │  │  └─ page.tsx                # 创作工作台
│     │  │     │  ├─ versions/
│     │  │     │  │  └─ page.tsx                # 版本比较页
│     │  │     │  └─ settings/
│     │  │     │     └─ page.tsx
│     │  ├─ api/
│     │  │  ├─ projects/
│     │  │  ├─ chapters/
│     │  │  ├─ scenes/
│     │  │  ├─ revisions/
│     │  │  ├─ versions/
│     │  │  ├─ issues/
│     │  │  ├─ memories/
│     │  │  └─ agents/
│     │  └─ layout.tsx
│     ├─ components/
│     │  ├─ layout/
│     │  │  ├─ app-shell.tsx
│     │  │  ├─ left-sidebar.tsx
│     │  │  ├─ editor-header.tsx
│     │  │  └─ scene-panel.tsx
│     │  ├─ project/
│     │  │  ├─ project-card.tsx
│     │  │  ├─ create-project-modal.tsx
│     │  │  └─ project-overview.tsx
│     │  ├─ editor/
│     │  │  ├─ chapter-tree.tsx
│     │  │  ├─ text-editor.tsx
│     │  │  ├─ selection-toolbar.tsx
│     │  │  ├─ scene-card.tsx
│     │  │  ├─ scene-edit-modal.tsx
│     │  │  ├─ revision-modal.tsx
│     │  │  ├─ evaluation-panel.tsx
│     │  │  └─ version-history-drawer.tsx
│     │  ├─ version/
│     │  │  ├─ compare-toolbar.tsx
│     │  │  ├─ version-card.tsx
│     │  │  └─ diff-viewer.tsx
│     │  └─ common/
│     ├─ lib/
│     │  ├─ db/
│     │  │  ├─ schema/
│     │  │  │  ├─ projects.ts
│     │  │  │  ├─ chapters.ts
│     │  │  │  ├─ scenes.ts
│     │  │  │  ├─ revisions.ts
│     │  │  │  ├─ versions.ts
│     │  │  │  ├─ issues.ts
│     │  │  │  └─ memories.ts
│     │  │  ├─ client.ts
│     │  │  └─ queries/
│     │  ├─ agents/
│     │  │  ├─ bootstrap-agent.ts
│     │  │  ├─ idea-agent.ts
│     │  │  ├─ scene-planner-agent.ts
│     │  │  ├─ writer-agent.ts
│     │  │  ├─ critic-agent.ts
│     │  │  ├─ consistency-agent.ts
│     │  │  └─ repair-agent.ts
│     │  ├─ retrieval/
│     │  │  ├─ concept-retriever.ts
│     │  │  ├─ lore-retriever.ts
│     │  │  ├─ narrative-retriever.ts
│     │  │  ├─ style-retriever.ts
│     │  │  ├─ fact-retriever.ts
│     │  │  └─ grounding-pack.ts
│     │  ├─ workflows/
│     │  │  ├─ create-project.ts
│     │  │  ├─ bootstrap-project.ts
│     │  │  ├─ generate-scenes.ts
│     │  │  ├─ generate-chapter-from-scenes.ts
│     │  │  ├─ create-revision-candidate.ts
│     │  │  ├─ evaluate-chapter.ts
│     │  │  └─ apply-revision.ts
│     │  ├─ diff/
│     │  │  ├─ word-diff.ts
│     │  │  └─ block-diff.ts
│     │  ├─ state/
│     │  │  ├─ ui-state-keys.ts
│     │  │  ├─ editor-store.ts
│     │  │  ├─ scene-store.ts
│     │  │  ├─ revision-store.ts
│     │  │  └─ version-store.ts
│     │  └─ validation/
│     ├─ styles/
│     └─ tests/
│
├─ packages/
│  ├─ shared-types/
│  │  ├─ project.ts
│  │  ├─ chapter.ts
│  │  ├─ scene.ts
│  │  ├─ revision.ts
│  │  ├─ version.ts
│  │  └─ issue.ts
│  ├─ prompt-templates/
│  │  ├─ bootstrap.ts
│  │  ├─ scene-plan.ts
│  │  ├─ write.ts
│  │  ├─ evaluate.ts
│  │  └─ revise.ts
│  └─ ui/
│     └─ reusable components
│
├─ workers/
│  ├─ agent-worker/
│  │  ├─ src/
│  │  │  ├─ jobs/
│  │  │  │  ├─ bootstrap.job.ts
│  │  │  │  ├─ generate-scenes.job.ts
│  │  │  │  ├─ write-scene.job.ts
│  │  │  │  ├─ evaluate.job.ts
│  │  │  │  └─ revise.job.ts
│  │  │  └─ index.ts
│
├─ infra/
│  ├─ docker/
│  ├─ migrations/
│  └─ seed/
│
└─ docs/
   ├─ mquill-v1-design.md
   ├─ api-contracts.md
   ├─ db-schema.md
   └─ state-machines.md
```

---

## 7. 前后端模块分工

### 前端

* 项目总览与新建
* 工作台布局与状态持久化
* Scene 拖拽、收起、筛选
* 正文编辑与选区工具条
* 修订候选审阅
* 版本 diff 与比较
* 问题面板与跳转定位

### 后端

* 项目/章节/场景 CRUD
* Agent 编排与任务队列
* 版本快照
* 评估结果入库
* 检索日志
* 记忆读写

### Worker

* Scene 批量生成
* 正文生成
* 评估
* 修订候选生成
* 一致性校验

---

## 8. v1 实施顺序

### Phase 1：前台骨架

* P0 我的作品
* P1 创建新书
* P3 工作台静态版
* SceneCard 列表
* 正文编辑器
* 基础版本保存

### Phase 2：Scene 驱动写作

* Scene CRUD
* Scene 拖拽排序
* Scene 生成正文
* 章节合成正文
* Scene 状态流转

### Phase 3：修订与版本

* 修订任务
* 候选稿与 diff
* 版本快照
* 恢复/分支/比较

### Phase 4：评估与回流

* 评估问题生成
* 从问题创建修订任务
* 修订后关闭问题
* 基础一致性校验

### Phase 5：检索与记忆最小闭环

* Narrative / Lore / Style 三类检索
* GroundingPack
* Memory upsert
* Agent run / retrieval log

---

## 9. v1 验收标准

MQuill v1 可以视为“可开工且可验收”，当且仅当满足以下条件：

1. 用户能从首页创建一个项目并进入工作台。
2. 用户能创建、编辑、排序、确认 SceneCard，并从 Scene 生成正文。
3. 用户能选中正文创建修订任务，生成候选稿并选择替换/追加/分支。
4. 系统能自动保存版本，并支持两个版本的 diff 比较与恢复。
5. 系统能生成至少一类评估问题，并将问题转成修订任务。
6. 人工修改优先、锁定内容不可覆盖。
7. 右栏场景助手收起状态在章节切换后仍保持。

最后一条直接来自你当前 HTML 的交互优化方向，应该写进验收而不是只留在 UI 细节。

---

## 10. 最后的设计判断

这版 `MQuill v1` 的核心，不是“先把最先进 Agent 全接上”，而是先把**工作台主链路**做扎实：

**Project → Scene → Draft → Revision → Version → Issue**

这条链一旦通了，后面的检索、记忆、一致性和多 Agent 才有稳定承载面。
这也正好把旧稿的产品优先级、正式版的工程骨架、以及你当前 HTML 的真实交互能力，合成了一版真正可以让团队开工的设计。  

下一步最自然的是把它继续落成：

**《MQuill v1 TASKLIST.md》**
按前端 / 后端 / Agent / DB migration 四条线拆到文件级。

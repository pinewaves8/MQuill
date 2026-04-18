下面直接给出可执行版本。

# `MQuill v1 TASKLIST.md`

> 目标：将《MQuill v1 可开工设计文档》落为第一阶段工程任务清单。
> 原则：先打通主链路，再做增强。主页面一定要完全对齐c_modified_v17.html。
> 主链路：`Project -> Scene -> Draft -> Revision -> Version -> Issue`

---

## 0. 里程碑

### Milestone 1：项目入口与工作台骨架

* 我的作品页可用
* 创建新书可用
* 进入编辑器页
* 三栏布局稳定
* 基础项目/章节读取可用

### Milestone 2：Scene 驱动写作

* SceneCard CRUD
* Scene 排序
* Scene 状态流转
* 从 Scene 生成正文
* 章节正文渲染可用

### Milestone 3：修订与版本

* 修订任务创建
* 候选稿生成
* diff 比较
* 应用修订
* 自动生成版本快照

### Milestone 4：评估闭环

* 章节评估
* 问题面板
* 从问题创建修订
* 问题状态回流

### Milestone 5：最小检索与记忆

* Narrative/Lore/Style retrieval
* GroundingPack
* Memory upsert
* Agent run / retrieval log

---

## 1. 前端任务线

## 1.1 Dashboard / 项目入口

### `apps/web/app/(dashboard)/page.tsx`

* [ ] 实现“我的作品”首页
* [ ] 接入项目列表查询
* [ ] 渲染欢迎区、作品统计、作品卡列表
* [ ] 接入“创建新书”按钮
* [ ] 处理空状态

**验收**

* 能看到项目列表
* 点击作品卡进入对应项目
* 无项目时显示空状态

---

### `apps/web/components/project/project-card.tsx`

* [ ] 抽离项目卡片组件
* [ ] 支持显示：标题、状态、简介、章节数、更新时间、字数
* [ ] 支持点击跳转
* [ ] 支持 hover 状态

**验收**

* 首页所有项目卡都通过本组件渲染

---

### `apps/web/components/project/create-project-modal.tsx`

* [ ] 实现创建新书弹窗
* [ ] 表单字段：

  * 书名
  * 书籍类型
  * 目标篇幅
  * 语言
  * 分类标签
  * 内容描述
  * 封面色调
  * 创作模式
  * 叙事视角
  * 目标读者
  * 风格关键词
  * AI 自动模式
* [ ] 表单校验
* [ ] 提交 API
* [ ] 提交成功后跳转逻辑
* [ ] 自动模式时进入 bootstrapping

**验收**

* 表单完整提交
* 创建成功后可进入编辑页或生成进度页

---

### `apps/web/components/project/project-overview.tsx`

* [ ] 实现项目总览组件
* [ ] 渲染章节统计、scene 统计、issue 统计、最新版本
* [ ] 在项目详情页复用

---

## 1.2 编辑器主工作台

### `apps/web/app/(dashboard)/projects/[projectId]/editor/page.tsx`

* [ ] 搭建编辑器主页面
* [ ] 读取 projectId
* [ ] 拉取项目、章节、当前章节、scene、draft、issues
* [ ] 三栏布局装配：

  * 左栏：章节树/项目导航
  * 中栏：正文编辑器
  * 右栏：ScenePanel
* [ ] 实现首次进入默认选中第一章

**验收**

* 进入页面后可看到三栏结构
* 切换章节时数据联动

---

### `apps/web/components/layout/app-shell.tsx`

* [ ] 抽离编辑器外层 shell
* [ ] 支持顶部工具栏、主内容区域、响应式布局
* [ ] 保持与现有 HTML 风格一致

---

### `apps/web/components/layout/left-sidebar.tsx`

* [ ] 实现左栏布局
* [ ] 挂载章节树
* [ ] 挂载项目入口按钮（概览/版本/评估/设置）

---

### `apps/web/components/layout/editor-header.tsx`

* [ ] 实现编辑器顶部工具条
* [ ] 按钮：

  * 保存
  * 从 Scene 生成
  * 创建修订
  * 运行评估
  * 查看版本
  * 一致性检查
* [ ] 接入 loading 状态

---

## 1.3 章节与正文

### `apps/web/components/editor/chapter-tree.tsx`

* [ ] 渲染章节树
* [ ] 支持切换当前章节
* [ ] 支持显示章节状态
* [ ] 支持新增章节按钮（v1 可简单）

**验收**

* 可切换章节
* 切换时 editor 与 scene 联动刷新

---

### `apps/web/components/editor/text-editor.tsx`

* [ ] 接入正文编辑器
* [ ] 支持渲染 draft segments
* [ ] 支持手动编辑
* [ ] 支持锁定段落
* [ ] 支持保存
* [ ] 支持段落定位锚点（供 issue 跳转）

**验收**

* 用户能直接改正文
* 改动能保存
* 锁定段落不会被后续应用修订覆盖

---

### `apps/web/components/editor/selection-toolbar.tsx`

* [ ] 实现选区工具条
* [ ] 动作：

  * 润色
  * 扩写
  * 压缩
  * 改语气
  * 创建修订任务
* [ ] 获取选中文本并传给 revision modal

**验收**

* 选中文本后工具条出现
* 点击可进入修订流程

---

## 1.4 Scene 侧栏

### `apps/web/components/layout/scene-panel.tsx`

* [ ] 实现右栏场景面板
* [ ] 支持场景列表
* [ ] 支持折叠/展开
* [ ] 接入本地持久化状态
* [ ] 章节切换时保留折叠状态

**验收**

* 折叠状态可记住
* 切换章节后不自动展开

---

### `apps/web/components/editor/scene-card.tsx`

* [ ] 渲染单个 SceneCard
* [ ] 显示：标题、摘要、状态、来源、标签
* [ ] 支持选中
* [ ] 支持拖拽排序
* [ ] 支持状态切换
* [ ] 支持“编辑 / 生成正文 / 废弃”

**验收**

* SceneCard 可排序、可点开、可切状态

---

### `apps/web/components/editor/scene-edit-modal.tsx`

* [ ] 实现场景编辑弹窗
* [ ] 字段：

  * 标题
  * 摘要
  * 视角角色
  * 目标
  * 冲突
  * 预期结果
  * 备注
  * 状态
* [ ] 保存与关闭
* [ ] AI 重生成入口

**验收**

* Scene 可人工编辑并保存

---

## 1.5 修订与评估

### `apps/web/components/editor/revision-modal.tsx`

* [ ] 实现修订弹窗
* [ ] 展示原文
* [ ] 输入：

  * 修改建议
  * 修订目标
  * 保持不变
  * 应用方式
* [ ] 调用 revision API
* [ ] 展示候选稿与 diff
* [ ] 支持替换 / 追加 / 分支

**验收**

* 可完整跑通一次修订候选生成并应用

---

### `apps/web/components/editor/evaluation-panel.tsx`

* [ ] 实现问题面板
* [ ] 显示问题类型、严重级别、标题、建议
* [ ] 支持点击跳转正文定位
* [ ] 支持一键创建修订任务
* [ ] 支持标记 fixed / wont_fix

**验收**

* 章节评估结果能完整展示
* 每个 issue 可进入修订流程

---

## 1.6 版本系统

### `apps/web/app/(dashboard)/projects/[projectId]/versions/page.tsx`

* [ ] 实现版本比较页面
* [ ] 左右版本选择
* [ ] diff 渲染
* [ ] 恢复版本
* [ ] 创建分支版本

---

### `apps/web/components/editor/version-history-drawer.tsx`

* [ ] 实现编辑器内版本侧抽屉
* [ ] 显示当前章节版本列表
* [ ] 支持快速比较
* [ ] 支持手动保存快照

---

### `apps/web/components/version/version-card.tsx`

* [ ] 抽离版本卡片
* [ ] 显示 label / source / summary / created_at / branch

---

### `apps/web/components/version/compare-toolbar.tsx`

* [ ] 实现比较工具条
* [ ] 选择 left / right version
* [ ] 切换 diff mode

---

### `apps/web/components/version/diff-viewer.tsx`

* [ ] 渲染 block diff
* [ ] 渲染 inline diff
* [ ] 支持只看变化
* [ ] 支持滚动同步（可后置）

**验收**

* 任意两个版本可比较

---

## 1.7 前端状态管理

### `apps/web/lib/state/editor-store.ts`

* [ ] 管理当前 project / chapter / selected text / loading 状态
* [ ] 暴露章节切换、保存、刷新动作

### `apps/web/lib/state/scene-store.ts`

* [ ] 管理 scene list
* [ ] 管理排序、当前选中 scene
* [ ] 管理 scene panel collapsed 状态

### `apps/web/lib/state/revision-store.ts`

* [ ] 管理 revision modal 输入态
* [ ] 管理 revision candidate 列表与当前选中

### `apps/web/lib/state/version-store.ts`

* [ ] 管理版本列表
* [ ] 管理 compare selection
* [ ] 管理 diff mode

### `apps/web/lib/state/ui-state-keys.ts`

* [ ] 统一 localStorage key
* [ ] 约定 project-scoped UI state key 格式

---

## 2. 后端任务线

## 2.1 Project / Overview API

### `apps/web/app/api/projects/route.ts`

* [ ] `POST /api/projects` 创建项目
* [ ] `GET /api/projects` 返回项目列表
* [ ] 参数校验
* [ ] 创建默认章节（可选）
* [ ] 创建默认 charter

---

### `apps/web/app/api/projects/[projectId]/route.ts`

* [ ] `GET /api/projects/:id`
* [ ] `PATCH /api/projects/:id`
* [ ] 基础权限检查

---

### `apps/web/app/api/projects/[projectId]/overview/route.ts`

* [ ] 返回 overview 聚合数据：

  * project
  * chapters summary
  * scene stats
  * issue stats
  * latest versions

---

## 2.2 Chapter API

### `apps/web/app/api/chapters/route.ts`

* [ ] `POST /api/chapters` 新建章节

### `apps/web/app/api/chapters/[chapterId]/route.ts`

* [ ] `GET /api/chapters/:id`
* [ ] `PATCH /api/chapters/:id`

### `apps/web/app/api/chapters/[chapterId]/draft/route.ts`

* [ ] 返回章节 draft segments
* [ ] 保存章节 draft segments

### `apps/web/app/api/chapters/[chapterId]/generate-from-scenes/route.ts`

* [ ] 从已确认 scene 批量生成正文
* [ ] 入队 worker job
* [ ] 记录 agent_run

---

## 2.3 Scene API

### `apps/web/app/api/scenes/route.ts`

* [ ] `POST /api/scenes` 创建 scene
* [ ] `GET /api/scenes?chapterId=...` 查询章节 scenes

### `apps/web/app/api/scenes/[sceneId]/route.ts`

* [ ] `GET /api/scenes/:id`
* [ ] `PATCH /api/scenes/:id`
* [ ] `DELETE /api/scenes/:id` 软删除/置 discarded

### `apps/web/app/api/scenes/reorder/route.ts`

* [ ] 批量更新 sort_order

### `apps/web/app/api/scenes/[sceneId]/generate-draft/route.ts`

* [ ] 单个 scene 生成正文
* [ ] 入队 write-scene job

---

## 2.4 Revision API

### `apps/web/app/api/revisions/route.ts`

* [ ] `POST /api/revisions` 创建 revision_task
* [ ] `GET /api/revisions?chapterId=...`

### `apps/web/app/api/revisions/[revisionId]/route.ts`

* [ ] `GET /api/revisions/:id`
* [ ] `PATCH /api/revisions/:id`

### `apps/web/app/api/revisions/[revisionId]/run/route.ts`

* [ ] 执行 revise agent
* [ ] 创建 revision_candidate
* [ ] 更新 revision_task.status = reviewed

### `apps/web/app/api/revision-candidates/[candidateId]/apply/route.ts`

* [ ] 应用修订候选
* [ ] 支持 replace / append / branch
* [ ] 创建 version_record
* [ ] 更新 issue 状态
* [ ] 更新 memories（必要时）

---

## 2.5 Version API

### `apps/web/app/api/versions/compare/route.ts`

* [ ] 接收 left/right version id
* [ ] 返回 diff payload

### `apps/web/app/api/versions/[versionId]/restore/route.ts`

* [ ] 恢复为当前版本
* [ ] 写回 draft
* [ ] 更新 current version

### `apps/web/app/api/versions/[versionId]/branch/route.ts`

* [ ] 从现有版本创建 branch

### `apps/web/app/api/chapters/[chapterId]/versions/route.ts`

* [ ] 返回章节版本列表
* [ ] 手动保存版本快照

---

## 2.6 Evaluation / Issue API

### `apps/web/app/api/agents/evaluate/route.ts`

* [ ] 接收章节评估请求
* [ ] 入队 evaluate job
* [ ] 返回 run id

### `apps/web/app/api/issues/route.ts`

* [ ] 查询 issue 列表
* [ ] 支持按 chapterId / status / severity 过滤

### `apps/web/app/api/issues/[issueId]/route.ts`

* [ ] 更新 issue 状态

### `apps/web/app/api/issues/[issueId]/create-revision/route.ts`

* [ ] 从 issue 创建 revision_task
* [ ] 自动填 suggestion / goals / constraints

---

## 2.7 Memory API

### `apps/web/app/api/memories/route.ts`

* [ ] `GET /api/memories`
* [ ] `POST /api/memories/upsert`

### `apps/web/app/api/memories/query/route.ts`

* [ ] 按 memory_type + key 查询

---

## 2.8 后端共用模块

### `apps/web/lib/db/client.ts`

* [ ] 初始化 DB client

### `apps/web/lib/db/queries/*`

* [ ] 为 project / chapter / scene / revision / version / issue / memory 实现 query helpers

### `apps/web/lib/validation/*`

* [ ] 定义 zod schema
* [ ] API 入参校验
* [ ] 共享 DTO

### `apps/web/lib/diff/word-diff.ts`

* [ ] 输出 inline diff payload

### `apps/web/lib/diff/block-diff.ts`

* [ ] 输出 block diff payload

### `apps/web/lib/workflows/*`

* [ ] 封装服务端 workflow：

  * create-project
  * bootstrap-project
  * generate-scenes
  * generate-chapter-from-scenes
  * create-revision-candidate
  * evaluate-chapter
  * apply-revision

---

## 3. Agent 任务线

## 3.1 Bootstrap / Idea

### `apps/web/lib/agents/bootstrap-agent.ts`

* [ ] 输入 project form
* [ ] 输出 ProjectCharter 初稿
* [ ] 生成：

  * theme
  * core_conflict
  * writing_goals
  * forbidden_rules
  * target_audience
* [ ] 写入 `project_charters`

---

### `apps/web/lib/agents/idea-agent.ts`

* [ ] 处理额外创意生成
* [ ] 支持从用户 prompt 生成更详细创意包
* [ ] 产出 theme / conflict / mood / patterns

---

## 3.2 Scene 规划

### `apps/web/lib/agents/scene-planner-agent.ts`

* [ ] 输入：

  * project
  * charter
  * chapter summary
  * relevant memories
* [ ] 输出 SceneCard 数组：

  * title
  * summary
  * goal
  * conflict
  * expected_outcome
* [ ] 支持：

  * outline_to_scene
  * regenerate_scene
  * expand_scenes

**验收**

* 同一章节可生成结构合理的一组 scenes

---

## 3.3 Writer

### `apps/web/lib/agents/writer-agent.ts`

* [ ] 输入：

  * project
  * chapter
  * scene
  * grounding pack
* [ ] 输出：

  * segment text
  * style notes
* [ ] 不允许私自改世界设定
* [ ] respect locked draft segments

---

## 3.4 Critic / Evaluate

### `apps/web/lib/agents/critic-agent.ts`

* [ ] 输入章节全文
* [ ] 输出 issue list
* [ ] issue 至少覆盖：

  * style
  * pacing
  * character
  * lore
  * clarity
* [ ] 输出 severity / title / reason / suggestion / location_ref

---

## 3.5 Consistency

### `apps/web/lib/agents/consistency-agent.ts`

* [ ] 检查 lore / timeline / character consistency
* [ ] v1 先做基础规则：

  * 同名角色身份冲突
  * 前后叙述视角冲突
  * 时间顺序明显错误
  * 已锁定设定被改写
* [ ] 输出一致性 issue

---

## 3.6 Repair / Revise

### `apps/web/lib/agents/repair-agent.ts`

* [ ] 输入 revision_task + original_text + grounding_pack
* [ ] 输出 candidate_text
* [ ] 强制遵守 constraints
* [ ] 支持 apply_mode hint

---

## 3.7 Retrieval

### `apps/web/lib/retrieval/concept-retriever.ts`

* [ ] 为 bootstrap/idea 提供题材与创作范式检索

### `apps/web/lib/retrieval/lore-retriever.ts`

* [ ] 从 memories 中检索 canon/world 相关内容

### `apps/web/lib/retrieval/narrative-retriever.ts`

* [ ] 检索当前章节与前文章节事件、伏笔、已知信息

### `apps/web/lib/retrieval/style-retriever.ts`

* [ ] 检索项目风格约束、禁忌项、叙事视角

### `apps/web/lib/retrieval/fact-retriever.ts`

* [ ] v1 做 stub/adapter，先保留接口
* [ ] 历史/现实题材可后续接外部知识源

### `apps/web/lib/retrieval/grounding-pack.ts`

* [ ] 统一构造 grounding pack：

  * facts
  * lore
  * memory
  * style
  * constraints
* [ ] 给 writer / revise / evaluate 复用

---

## 3.8 Prompt 模板

### `packages/prompt-templates/bootstrap.ts`

* [ ] 定义 bootstrap prompt

### `packages/prompt-templates/scene-plan.ts`

* [ ] 定义 scene planner prompt

### `packages/prompt-templates/write.ts`

* [ ] 定义 writer prompt

### `packages/prompt-templates/evaluate.ts`

* [ ] 定义 critic/evaluate prompt

### `packages/prompt-templates/revise.ts`

* [ ] 定义 revise/repair prompt

---

## 3.9 Worker Jobs

### `workers/agent-worker/src/jobs/bootstrap.job.ts`

* [ ] 执行 bootstrap-agent
* [ ] 写入 charter
* [ ] 更新 project 状态

### `workers/agent-worker/src/jobs/generate-scenes.job.ts`

* [ ] 执行 scene planner
* [ ] 批量写入 scenes

### `workers/agent-worker/src/jobs/write-scene.job.ts`

* [ ] 执行 writer agent
* [ ] 写入 draft_segments
* [ ] 更新 chapter word_count

### `workers/agent-worker/src/jobs/evaluate.job.ts`

* [ ] 执行 critic + consistency
* [ ] 写入 evaluation_issues

### `workers/agent-worker/src/jobs/revise.job.ts`

* [ ] 执行 repair-agent
* [ ] 写入 revision_candidates

### `workers/agent-worker/src/index.ts`

* [ ] 注册全部 jobs
* [ ] 统一错误处理
* [ ] run status 回写

---

## 4. DB Migration 任务线

## 4.1 Schema 文件

### `apps/web/lib/db/schema/projects.ts`

* [ ] 定义 `projects`
* [ ] 定义 `project_tags`
* [ ] 定义 `project_charters`

### `apps/web/lib/db/schema/chapters.ts`

* [ ] 定义 `chapters`
* [ ] 定义 `draft_segments`

### `apps/web/lib/db/schema/scenes.ts`

* [ ] 定义 `scene_cards`

### `apps/web/lib/db/schema/revisions.ts`

* [ ] 定义 `revision_tasks`
* [ ] 定义 `revision_candidates`

### `apps/web/lib/db/schema/versions.ts`

* [ ] 定义 `version_records`

### `apps/web/lib/db/schema/issues.ts`

* [ ] 定义 `evaluation_issues`

### `apps/web/lib/db/schema/memories.ts`

* [ ] 定义 `memories`

### `apps/web/lib/db/schema/agent_runs.ts`

* [ ] 定义 `agent_runs`
* [ ] 定义 `retrieval_logs`

---

## 4.2 Migration 文件

### `infra/migrations/0001_init_projects.sql`

* [ ] 创建 projects / project_tags / project_charters

### `infra/migrations/0002_init_chapters.sql`

* [ ] 创建 chapters / draft_segments

### `infra/migrations/0003_init_scenes.sql`

* [ ] 创建 scene_cards

### `infra/migrations/0004_init_revisions.sql`

* [ ] 创建 revision_tasks / revision_candidates

### `infra/migrations/0005_init_versions.sql`

* [ ] 创建 version_records

### `infra/migrations/0006_init_issues.sql`

* [ ] 创建 evaluation_issues

### `infra/migrations/0007_init_memories.sql`

* [ ] 创建 memories

### `infra/migrations/0008_init_agent_runs.sql`

* [ ] 创建 agent_runs / retrieval_logs

### `infra/migrations/0009_indexes.sql`

* [ ] 为常用查询建立索引：

  * projects.updated_at
  * chapters.project_id + sort_order
  * scene_cards.chapter_id + sort_order
  * draft_segments.chapter_id + segment_index
  * revision_tasks.chapter_id + status
  * version_records.chapter_id + created_at
  * evaluation_issues.chapter_id + status + severity
  * memories.project_id + memory_type + key
  * agent_runs.project_id + agent_name + status

---

## 4.3 Seed 数据

### `infra/seed/dev_seed.ts`

* [ ] 插入 demo project
* [ ] 插入 demo chapters
* [ ] 插入 demo scenes
* [ ] 插入 demo draft
* [ ] 插入 demo versions
* [ ] 插入 demo issues

**验收**

* 本地启动后能直接进入带样例数据的编辑器

---

## 5. 共享类型与契约

### `packages/shared-types/project.ts`

* [ ] Project DTO
* [ ] ProjectOverview DTO
* [ ] CreateProjectInput

### `packages/shared-types/chapter.ts`

* [ ] Chapter DTO
* [ ] DraftSegment DTO

### `packages/shared-types/scene.ts`

* [ ] SceneCard DTO
* [ ] UpdateSceneInput
* [ ] ReorderScenesInput

### `packages/shared-types/revision.ts`

* [ ] RevisionTask DTO
* [ ] RevisionCandidate DTO
* [ ] CreateRevisionInput

### `packages/shared-types/version.ts`

* [ ] VersionRecord DTO
* [ ] CompareVersionsInput / Output

### `packages/shared-types/issue.ts`

* [ ] EvaluationIssue DTO
* [ ] EvaluateChapterInput / Output

---

## 6. 依赖顺序

### 先做

1. DB schema + migrations
2. project / chapter / scene CRUD API
3. dashboard + editor skeleton
4. scene panel + chapter tree + text editor

### 再做

5. scene planner agent
6. writer agent + generate draft
7. revision flow
8. version flow

### 最后做

9. evaluation flow
10. consistency flow
11. memories + retrieval logs
12. fact retriever adapter

---

## 7. 最小联调顺序

### 联调链路 A：创建与进入

* [ ] 创建项目
* [ ] 创建默认章节
* [ ] 打开编辑器
* [ ] 展示空 scene / 空 draft

### 联调链路 B：Scene 到正文

* [ ] 生成 scenes
* [ ] 编辑 scene
* [ ] 确认 scene
* [ ] 从 scenes 生成 draft

### 联调链路 C：修订到版本

* [ ] 选中文本创建 revision
* [ ] 生成 candidate
* [ ] apply revision
* [ ] 自动生成 version
* [ ] 版本比较成功

### 联调链路 D：评估到回流

* [ ] 运行评估
* [ ] 生成 issues
* [ ] 从 issue 创建 revision
* [ ] 修订后关闭 issue

---

## 8. Definition of Done

一个任务完成，必须满足：

* 代码已提交
* 类型通过
* 基础测试通过
* 空状态/异常状态处理完成
* 与设计字段对齐
* 不破坏主链路
* 有最小 demo 数据可验证

---

## 9. 建议第一周切法

### 前端

* `page.tsx`
* `create-project-modal.tsx`
* `editor/page.tsx`
* `chapter-tree.tsx`
* `scene-panel.tsx`
* `text-editor.tsx`

### 后端

* `projects API`
* `chapters API`
* `scenes API`
* `draft API`

### DB

* `0001 ~ 0003 migrations`
* `schema/projects.ts`
* `schema/chapters.ts`
* `schema/scenes.ts`

### Agent

* `bootstrap-agent.ts`
* `scene-planner-agent.ts`
* `writer-agent.ts` stub

---

## 10. 建议第二周切法

### 前端

* `revision-modal.tsx`
* `evaluation-panel.tsx`
* `version-history-drawer.tsx`
* `diff-viewer.tsx`

### 后端

* `revisions API`
* `versions API`
* `issues API`

### DB

* `0004 ~ 0006 migrations`

### Agent

* `repair-agent.ts`
* `critic-agent.ts`
* `consistency-agent.ts`

---

## 11. 建议第三周切法

### 后端 / Agent

* `memories API`
* `retrieval_logs`
* `grounding-pack.ts`
* `lore/narrative/style retriever`

### DB

* `0007 ~ 0009 migrations`

### 联调

* 全链路回归
* 状态机校验
* 样例项目验证

---
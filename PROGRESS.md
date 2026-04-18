# 项目动态进度（由 Claude 负责维护更新）

## 🎯 当前核心目标

- MQuill v1 功能完善阶段，持续优化 UI 和功能

## 📝 最新进度记录（倒序，最新的在最上面）

- **2026-04-18**：完成引导项目 Charter
  - bootstrap-agent.ts：新增引导 Agent，生成项目 Charter 和初始记忆（世界观、人物、风格指南）
  - api/agents/bootstrap/[projectId]/route.ts：新增引导 API 路由
  - api/projects/[projectId]/charter/route.ts：新增获取 Charter 的 API
  - charter-panel.tsx：完善 Charter 面板 UI，支持：
    - 查看/编辑 AI 生成的世界观、人物、风格设定
    - 添加新记忆（支持5种类型：世界/叙事/风格/事实/用户）
    - 编辑/删除已有记忆
  - outline-view.tsx：集成了 Charter 面板，大纲页可点击"Charter 设定"按钮查看/编辑设定
  - 创建书后（AI 全自动模式）自动调用引导 API 生成 Charter 设定
  - auto-gen-progress-modal.tsx：新增自动生成进度弹窗，显示大纲设计/章节场景/正文撰写/质量评估四个阶段进度
  - create-project-modal.tsx：集成自动生成模式，选择"AI全自动"模式后显示进度弹窗
  - revision-store.ts：支持 setSelectedText、setSelectionRange action
  - 核心文件：`components/editor/selection-toolbar.tsx`, `components/project/auto-gen-progress-modal.tsx`, `components/project/create-project-modal.tsx`, `lib/state/revision-store.ts`
  - scene-card.tsx：增加合并选择、颜色标签、废弃/恢复/恢复分支、演化记录显示
  - text-editor.tsx：增加专注模式(word count header, Ctrl+B 切换)、保存状态指示器
  - revision-modal.tsx：增加逐段审阅 diff view、per-paragraph choice、diff 渲染
  - evaluation-panel.tsx：增加评估指标(可读性/节奏/一致性)、筛选标签、痕迹面板
  - scene-panel.tsx：增加确认场景按钮、场景合并工具栏、废弃/恢复功能
  - globals.css：增加 suggestion-chip, segment-pill, review-card, diff-inline, focus-mode 等样式
  - shared-types：SceneCard 增加 tag/color/mergedFrom/mergedInto/branchFromSceneId；EvaluationIssue 增加 linkedVersionLabel/excerpt/paragraphIndex
  - 核心文件：`components/editor/scene-card.tsx`, `components/editor/text-editor.tsx`, `components/editor/revision-modal.tsx`, `components/editor/evaluation-panel.tsx`, `components/layout/scene-panel.tsx`, `app/globals.css`, `packages/shared-types/`
  - 数据持久化：store 改为 JSON 文件持久化（`.data/store.json`），解决热重载数据丢失问题
  - 功能增强：项目删除（带确认弹窗）、搜索框（按标题/描述过滤）、状态筛选下拉
  - UI 完善：ScenePanel 生成状态显示、场景卡片 loading 动画
  - 错误处理：添加 Toast 通知组件（success/error/info），生成成功/失败显示通知
  - 核心文件：`lib/db/file-storage.ts`, `lib/db/projects-store.ts`, `components/ui/toast.tsx`, `app/page.tsx`, `components/project/project-card.tsx`

- **2026-04-18**：完成 Agent 存根修复
  - 创建 `lib/llm/client.ts` - OpenAI 兼容 API 调用
  - 升级 `writer-agent.ts` - 真实 LLM 调用生成正文
  - 升级 `scene-planner-agent.ts` - 真实 LLM 调用生成场景规划
  - 升级 `critic-agent.ts` - 真实 LLM 调用进行章节评估
  - 核心文件：`lib/llm/client.ts`, `lib/agents/*.ts`

- **2026-04-18**：完成 3 个进阶功能
  - 完善左栏"版本"标签页（点击打开版本历史抽屉）
  - 添加自动保存功能（2秒 debounce，显示保存状态）
  - 实现自动生成目录功能（ProjectOverview 中的 AI 生成目录按钮）
  - 核心文件：`editor/page.tsx`, `text-editor.tsx`, `project-overview.tsx`

- **2026-04-18**：完成四个进阶功能
  - EvaluationPanel 集成到编辑器（点击"评估"标签）
  - project-overview 组件（显示章节统计、项目信息）
  - Agent + grounding pack 集成（3个 Agent 都接入检索上下文）
  - 版本比较页面（`/projects/[projectId]/versions`）
  - 核心文件：`components/editor/evaluation-panel.tsx`, `components/project/project-overview.tsx`, `lib/agents/*.ts`, `projects/[projectId]/versions/page.tsx`

- **2026-04-18**：建立双文件记忆系统 (CLAUDE.md + PROGRESS.md)，制定防上下文漂移机制

- **2026-04-18**：完成 Milestone 4 & 5
  - issues CRUD API + evaluation-panel 组件
  - critic-agent 评估 Agent
  - memories API + grounding-pack
  - lore/narrative/style/fact-retriever 检索组件
  - 核心文件：`api/issues/`, `components/editor/evaluation-panel.tsx`, `lib/agents/critic-agent.ts`, `lib/retrieval/`, `lib/db/projects-store.ts`

- **2026-04-18**：完成 Milestone 3
  - 修订任务 CRUD + revision-modal 完善
  - 版本历史 API + diff-viewer + version-history-drawer
  - 核心文件：`api/revisions/`, `api/revision-candidates/`, `api/versions/`, `components/version/`

- **2026-04-18**：完成 Milestone 2
  - scene-planner-agent + writer-agent 存根
  - scene-card 拖拽（@dnd-kit）+ scene-edit-modal + selection-toolbar
  - 核心文件：`lib/agents/`, `components/editor/scene-card.tsx`, `components/layout/scene-panel.tsx`

- **2026-04-18**：完成 Milestone 1
  - 项目结构 + Projects/Chapters/Scenes CRUD API
  - Dashboard + 三栏编辑器骨架 + Zustand stores
  - 核心文件：`api/projects/`, `app/projects/[projectId]/editor/`, `lib/state/`

- **2026-04-18**：初始化项目，建立记忆系统，读取 MQuill v1 文档并制定实现计划

## 🚧 当前功能清单

### 已完成的 API 端点 (24个)

| 端点 | 说明 |
|------|------|
| POST/GET /api/projects | 项目创建/列表 |
| GET/PATCH/DELETE /api/projects/:id | 项目详情/更新/删除 |
| GET /api/projects/:id/chapters | 章节列表 |
| POST /api/chapters | 创建章节 |
| GET/PUT /api/chapters/:id/draft | 正文获取/保存 |
| GET /api/chapters/:id/versions | 版本历史 |
| POST /api/scenes | 创建场景 |
| GET/PATCH/DELETE /api/scenes/:id | 场景 CRUD |
| POST /api/scenes/reorder | 场景拖拽排序 |
| POST /api/scenes/:id/generate-draft | 从场景生成正文 |
| POST /api/revisions | 创建修订任务 |
| GET /api/revisions | 查询修订任务 |
| POST /api/revisions/:id/run | 运行修订 |
| POST /api/revision-candidates/:id/apply | 应用修订候选 |
| GET/POST /api/issues | 问题查询/创建 |
| PATCH /api/issues/:id | 更新问题状态 |
| POST /api/issues/:id/create-revision | 从问题创建修订 |
| GET/POST /api/memories | 记忆查询/创建 |
| PATCH/DELETE /api/memories/:id | 记忆更新/删除 |
| POST /api/versions/compare | 版本比较 |
| POST /api/versions/:id/restore | 恢复版本 |
| POST /api/agents/evaluate/:chapterId | 评估章节 |

### 已完成的 Agent (3个)

- `scene-planner-agent` - 场景规划
- `writer-agent` - 写作生成
- `critic-agent` - 章节评估

### 已完成的检索组件

- `grounding-pack.ts` - AI 上下文组装
- `lore-retriever.ts` - 世界设定检索
- `narrative-retriever.ts` - 叙事/人物检索
- `style-retriever.ts` - 风格指南检索
- `fact-retriever.ts` - 事实核查

### 已完成的页面

- `/` - Dashboard 主页（搜索/筛选/删除）
- `/projects/[projectId]/editor` - 三栏编辑器
- `/projects/[projectId]/versions` - 版本比较页面
- `/projects/[projectId]/settings` - 项目设置页面
- `/projects/[projectId]/editor` (大纲视图) - 章节/场景树形结构

### 已完成的 UI 组件

- `tag-manager.tsx` - 标签管理组件
- `outline-view.tsx` - 大纲视图组件
- `toast.tsx` - Toast 通知组件
- `project-card.tsx` - 项目卡片（带删除菜单）

## 🚫 当前避坑指南/临时约束

- **API 路径参数必须 await params** - Next.js 14 中 params 是 Promise
- **Zustand store 的 openModal 默认值** - 使用 `undefined` 而非 `null`
- **DraftSource 类型** - 只能是 'ai' | 'manual' | 'hybrid'，不能自定义
- **z.record() 必须双参数** - `z.record(z.string(), z.any())`
- **MemoryType 枚举值** - 'canon' | 'world' | 'narrative' | 'style' | 'user'
- **context 参数在 useEffect 中使用** - 避免闭包陷阱

## 📋 下一步计划

- 完善编辑器富文本功能（字数统计、格式工具栏）✅
- 接入真实 LLM API（需配置 LLM_API_KEY 环境变量）✅
- 性能优化（大章节虚拟滚动）✅
- 添加用户认证（可选）

## 🆕 最新完成

- **2026-04-18**：完成大章节虚拟滚动性能优化
  - 新增 `@tanstack/react-virtual` 依赖
  - 新增 `virtualized-editor.tsx` - 基于段落虚拟滚动的编辑器组件
  - EditorHeader 新增"连续/分段"模式切换按钮
  - 分段模式：内容按段落分组，只渲染可见段落，支持点击编辑单个段落
  - 连续模式：保持原有 textarea 编辑体验
  - 核心文件：`components/editor/virtualized-editor.tsx`, `components/layout/editor-header.tsx`, `app/projects/[projectId]/editor/page.tsx`

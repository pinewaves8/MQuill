# 项目规范与约束（静态规则，锁死禁止随意修改）

## 核心法则
- **先问再做，杜绝猜测**：当需求不明确时，AI必须主动询问用户，而不是自行脑补一个复杂方案。它要学会提供选项，让用户做决策。
- **大道至简，拒绝过度工程**：只实现被要求的功能，不为一次性代码创建抽象层，不添加无人问津的“灵活性”。一切以简洁为最高准则。
- **精准手术，禁止随意重构**：修改代码时，严格限定在指定范围内。必须遵循项目现有的代码风格，对于无关区域的问题，只可指出，不可擅自改动。
- **目标驱动，而非步骤驱动**：与其告诉AI“如何做”，不如告诉它“做成什么样”。通过定义清晰的验收标准（如测试用例），让AI自主探索实现路径，最大化其自主工作能力。

## 技术栈

- **前端框架**: Next.js 14 (App Router) + React 18 + TypeScript
- **状态管理**: Zustand (with localStorage persistence)
- **样式方案**: Tailwind CSS
- **数据验证**: Zod
- **拖拽库**: @dnd-kit/core + @dnd-kit/sortable
- **数据库**: In-memory store (v1)，生产环境为 Postgres + Drizzle ORM
- **包管理**: npm workspaces (monorepo)

## 核心目录说明

```
apps/web/src/
├── app/                    # Next.js App Router 页面
│   ├── api/               # REST API Route Handlers
│   │   ├── projects/      # 项目相关 API
│   │   ├── chapters/      # 章节相关 API
│   │   ├── scenes/        # 场景相关 API
│   │   ├── revisions/     # 修订相关 API
│   │   ├── issues/        # 问题相关 API
│   │   ├── memories/      # 记忆相关 API
│   │   ├── versions/      # 版本相关 API
│   │   ├── agents/        # Agent API
│   │   └── revision-candidates/  # 修订候选 API
│   └── projects/[projectId]/  # 项目子页面
├── components/            # React 组件
│   ├── layout/           # 布局组件 (AppShell, LeftSidebar, ScenePanel, EditorHeader)
│   ├── editor/            # 编辑器组件 (TextEditor, SceneCard, RevisionModal, SelectionToolbar, EvaluationPanel)
│   ├── project/           # 项目组件 (ProjectCard, CreateProjectModal)
│   └── version/           # 版本组件 (DiffViewer, VersionHistoryDrawer)
└── lib/                   # 库文件
    ├── agents/            # Agent 实现 (scene-planner-agent, writer-agent, critic-agent)
    ├── db/                # 数据库层 (projects-store 内存存储)
    ├── retrieval/         # 检索组件 (grounding-pack, lore/narrative/style/fact-retriever)
    ├── state/             # Zustand stores (editor-store, scene-store, revision-store)
    └── validation/         # Zod schemas

packages/shared-types/      # 共享 TypeScript 类型定义
infra/migrations/          # 数据库迁移 SQL 文件 (0001-0009)
```

## 绝对禁忌（防漂移重点）

- **禁止使用 `any` 类型** - 必须使用具体类型或 `unknown` + 类型守卫
- **禁止修改 `infra/migrations/` 目录下的 SQL 文件** - 迁移文件是只读的
- **API 响应格式必须统一** - 使用 `{ data }` 或 `{ error }` 包装
- **Zustand store 必须使用 `persist` 中间件** - 确保状态可持久化到 localStorage
- **Agent 文件放在 `src/lib/agents/`** - 检索器放在 `src/lib/retrieval/`
- **所有 API 端点必须对应迁移文件** - 参照 `infra/migrations/` 中的表结构
- **前端组件使用 `use client` 指令** - 交互组件必须声明为客户端组件

## 项目架构约束

- **核心链路**: `Project → Scene → Draft → Revision → Version → Issue`
- **状态机字段必须使用 CHECK 约束**:
  - `projects.status`: draft|bootstrapping|active|paused|completed|archived
  - `chapters.status`: planned|drafting|revising|approved|done
  - `scene_cards.status`: draft|confirmed|generated|discarded
  - `revision_tasks.status`: draft|running|reviewed|applied|rejected
  - `evaluation_issues.status`: open|in_revision|fixed|wont_fix

## 代码风格

- **文件命名**: 组件用 PascalCase，工具函数用 camelCase，API 路由用 kebab-case
- **导入顺序**: React → 外部库 → 内部类型 → 内部组件/函数
- **禁止 console.log** - 使用 `console.error` 配合错误处理

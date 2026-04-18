# 项目动态进度（由 Claude 负责维护更新）

---

## 🔄 交接文档（上下文清空前必读）

### 📍 当前 Git 状态

```
分支：
- master (root-commit 8b00764) - 初始提交快照
- develop - 当前开发分支

重要文件：
- .env.example 已提交（模板，非真实 key）
- .env 在 .gitignore 中，不会被提交
```

### 🗂️ 项目结构

```
c:/tao/MQuill/
├── apps/web/                 # Next.js 14 主应用
│   └── src/
│       ├── app/             # App Router 页面 + API Routes
│       ├── components/      # React 组件
│       │   ├── editor/      # TextEditor, VirtualizedEditor, RevisionModal...
│       │   ├── layout/      # LeftSidebar, ScenePanel, EditorHeader
│       │   ├── project/     # ProjectCard, CharterPanel, OutlineView
│       │   ├── version/      # DiffViewer, VersionHistoryDrawer
│       │   └── ui/          # Toast, TagManager
│       └── lib/
│           ├── agents/      # BootstrapAgent, WriterAgent, CriticAgent...
│           ├── db/          # FileStorage, ProjectsStore (JSON 持久化)
│           ├── retrieval/   # GroundingPack, LoreRetriever...
│           ├── state/       # Zustand stores (editor, scene, revision)
│           └── llm/          # LLM client (OpenAI 兼容)
├── packages/shared-types/   # TypeScript 类型定义
└── infra/migrations/        # SQL 迁移文件 (0001-0009)
```

### ✅ 已完成的核心功能

| 模块 | 状态 | 说明 |
|------|------|------|
| 项目/章节/场景 CRUD | ✅ | 24 个 API 端点 |
| 三栏编辑器 | ✅ | 连续模式 + 分段虚拟滚动模式 |
| 修订流程 | ✅ | RevisionModal + DiffViewer |
| 版本历史 | ✅ | 比较、恢复、分支 |
| 评估系统 | ✅ | CriticAgent + EvaluationPanel |
| 记忆管理 | ✅ | Charter + 5种类型记忆 |
| Bootstrap Agent | ✅ | 自动生成项目设定 |
| 3 个 Writer Agent | ✅ | scene-planner/writer/critic |
| 虚拟滚动 | ✅ | 大章节性能优化 |

### ⚙️ 环境配置

```bash
# apps/web/.env 需要配置
OPENAI_API_KEY=your_api_key
OPENAI_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
MODEL=qwen-turbo

# 本地开发
cd apps/web && npm run dev
```

### 🚫 避坑指南（必须遵守）

1. **API params 必须 await** - Next.js 14 中 `params` 是 Promise
   ```typescript
   export async function GET(request: Request, { params }: RouteParams) {
     const { projectId } = await params; // ❌ 不能省略 await
   }
   ```

2. **Zustand openModal 默认值** - 用 `undefined` 而非 `null`

3. **MemoryType 枚举值** - `'canon' | 'world' | 'narrative' | 'style' | 'user'`

4. **z.record() 双参数** - `z.record(z.string(), z.any())`

5. **context 在 useEffect 中使用** - 避免闭包陷阱

6. **Agent 文件位置** - `src/lib/agents/`（不是 `src/app/`）

7. **检索文件位置** - `src/lib/retrieval/`

### 🧱 架构决策记录

| 决策 | 理由 |
|------|------|
| JSON 文件持久化 (.data/store.json) | 开发阶段简单，热重载不丢数据 |
| 分段/连续双编辑器模式 | 满足不同写作习惯 |
| Bootstrap 在创建项目后自动触发 | AI 全自动模式需要 |
| Charter + 5种类型记忆 | 支持多维度创作约束 |

### 📦 未完成/可改进项

1. ~~**用户认证**~~ - ✅ 已实现（基础版本）
2. ~~**富文本格式**~~ - ✅ 已实现（Tiptap 可视化编辑器）
3. ~~**导出功能**~~ - ✅ 已实现（Markdown/PDF/EPUB）
4. ~~**写作进度追踪**~~ - ✅ 已实现
5. **虚拟滚动段落高度估算** - 当前用固定 150px，可优化动态计算

### 🔧 故障排除

- **Bootstrap API 404** - 确认路由在 `[projectId]/route.ts`，不是 `route.ts`
- **Store 数据丢失** - 确认 `.data/` 目录存在
- **TypeScript 报错** - 先运行 `npx tsc --noEmit` 检查

### 📝 续记规范

每次开始新会话时：
1. 先读 `PROGRESS.md` 了解当前状态
2. 再读 `CLAUDE.md` 了解项目规范
3. 检查 git 分支：`git branch`（应在 develop）

---

## 📝 最新进度记录（倒序，最新的在最上面）

- **2026-04-18**：接通 repair-agent + 修订流程
  - 创建 `lib/agents/repair-agent.ts` - 实现真正的 AI 修订代理
  - 修订代理接收 revision task + 原文 + grounding pack，生成改进版本
  - 支持 applyMode（replace/append/branch）指令
  - 强制遵守 constraints 约束，参考 style/lore/narrative 上下文
  - 更新 `api/revisions/[revisionId]/run/route.ts` - 替换 stub 为真实 AI 调用
  - 移除 2 秒模拟延迟，改为真实 LLM 调用
  - 核心文件：`lib/agents/repair-agent.ts`, `app/api/revisions/[revisionId]/run/route.ts`

- **2026-04-18**：修复设置页面滚动问题 + PDF 中文导出
  - 修复 Root layout `overflow-hidden` 封锁滚动的问题
  - 设置页面改为 `h-screen flex flex-col overflow-hidden` 实现独立滚动
  - 导出 API 的 `Content-Disposition` header 中文文件名需要 `encodeURIComponent()`
  - PDF 导出使用 `jsPDF.addFileToVFS()` 嵌入 SimHei 字体解决中文乱码
  - 提交：`d491ad1`

- **2026-04-18**：完成导出功能
  - Export API 路由（/api/export/[projectId]）- 支持 markdown/pdf/epub 三种格式
  - Markdown 导出 - 直接拼接章节内容
  - PDF 导出 - 使用 jsPDF 库（后续修复了中文嵌入问题）
  - EPUB 导出 - 生成标准 EPUB 结构
  - 项目设置页面添加导出按钮（Markdown/PDF/EPUB）
  - 核心文件：`app/api/export/[projectId]/route.ts`

- **2026-04-18**：完成写作进度追踪
  - User 类型定义（packages/shared-types/user.ts）
  - AuthStore 实现（lib/db/auth-store.ts）- 注册/登录/登出/会话管理
  - Auth API 路由：/api/auth/login, /api/auth/logout, /api/auth/register, /api/auth/me
  - AuthModal 组件（components/auth/auth-modal.tsx）- 登录/注册模态框
  - Dashboard 集成用户状态显示
  - 核心文件：`lib/db/auth-store.ts`, `app/api/auth/`, `components/auth/auth-modal.tsx`, `app/page.tsx`

- **2026-04-18**：完成写作进度追踪
  - WritingProgress 类型定义（packages/shared-types/progress.ts）
  - WritingProgressStore 实现 - 追踪每日写作字数、连续天数、统计数据
  - Progress API 路由（/api/projects/[projectId]/progress）- 获取/记录写作进度
  - 项目设置页面显示进度：进度条、目标字数、连续天数、日均字数、写作天数
  - 核心文件：`packages/shared-types/progress.ts`, `lib/db/projects-store.ts`, `app/api/projects/[projectId]/progress/route.ts`, `app/projects/[projectId]/settings/page.tsx`

- **2026-04-18**：完成导出功能
  - Export API 路由（/api/export/[projectId]）- 支持 markdown/pdf/epub 三种格式
  - Markdown 导出 - 直接拼接章节内容
  - PDF 导出 - 使用 jsPDF 库
  - EPUB 导出 - 生成标准 EPUB 结构（包含 toc.ncx, content.opf, nav.xhtml）
  - 项目设置页面添加导出按钮（Markdown/PDF/EPUB）
  - 核心文件：`app/api/export/[projectId]/route.ts`, `app/projects/[projectId]/settings/page.tsx`

- **2026-04-18**：完成富文本编辑器
  - 安装 Tiptap 依赖（@tiptap/react, @tiptap/starter-kit, @tiptap/extension-placeholder, @tiptap/extension-highlight）
  - 创建 `rich-text-editor.tsx` - 基于 Tiptap 的富文本编辑器组件
  - 实现可视化格式工具栏（FloatingToolbar）：加粗、斜体、二/三级标题、引用、无序列表
  - 支持 Markdown 快捷键（Ctrl+B 加粗、Ctrl+I 斜体、Ctrl+S 保存）
  - 选中文本时自动显示格式工具栏
  - 支持专注模式、自动保存（2秒 debounce）
  - 保留 markdown 格式存储（与现有 draft_segments 兼容）
  - 移除 continuous/paragraph 双模式切换，统一使用 RichTextEditor
  - 清理 editor-header.tsx 中的 editorMode 相关代码
  - 核心文件：`components/editor/rich-text-editor.tsx`

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
- **Next.js 开发服务器端口** - 可能不在 3000，检查 `netstat -ano | grep LISTENING | grep 300`
- **git checkout 会丢失未提交修改** - 重要文件修改后不要随意 checkout
- **PDF 中文乱码** - jsPDF 默认不支持中文，必须用 `addFileToVFS()` 嵌入 TTF 字体
- **Root layout overflow-hidden** - 全局 `h-screen overflow-hidden` 会封锁所有页面滚动

## 📋 下一步计划

- 虚拟滚动段落高度估算优化
- 其他优化项（待规划）

## 🆕 最新完成

- **2026-04-19**：完成全自动小说生成链条 + AI场景助手对齐
  - 提交：`2b80727`，5 files changed, 394 insertions(+)
  - **全自动生成链条打通**：
    - 创建测试脚本 `scripts/generate-novel.ts` - 端到端测试完整流程
    - 修复 `/api/agents/outline` 不保存大纲的 bug（现改为生成后自动保存）
    - 修复 `/api/projects/:id/scenes/from-outline` 章节标题匹配问题（支持"第一章"匹配"第一章：虫洞之外"）
    - 添加 `outlines` 到 `file-storage.ts` 的 StoreData 接口
    - **测试结果**：成功生成约24,000字短篇小说《星际迷途》，2卷12章，39个场景，耗时4分钟
  - **AI场景助手对齐 c_modified_v17.html**：
    - "新增场景"按钮 → "一键生成所有场景正文"（紫色按钮）
    - "重新生成"按钮 → "生成场景"（根据大纲章节信息生成2-3个场景）
    - 添加场景锁定状态提示
    - 生成正文后触发 `draft-refresh` 事件实时刷新编辑器
  - **侧边栏三段式布局**：
    - Header（返回按钮+项目信息）- 固定顶部
    - Navigation+目录 - 可滚动，目录头 sticky
    - User（作者信息）- 固定底部
    - `overflow-hidden` 防止撑开，结构更稳定
  - 核心文件：`scripts/generate-novel.ts`, `api/agents/outline/route.ts`, `api/projects/:id/scenes/from-outline/route.ts`, `left-sidebar.tsx`, `scene-panel.tsx`, `file-storage.ts`

- **2026-04-18**：完成富文本编辑器、导出功能和写作进度追踪
  - 提交：`d491ad1`，18 files changed, 2034 insertions(+)
  - 富文本编辑器：基于 Tiptap 实现，支持加粗、斜体、标题、引用等格式
  - 导出功能：Markdown/PDF/EPUB，PDF 嵌入 SimHei 中文字体
  - 写作进度追踪：目标字数、连续天数、日均字数等统计
  - 用户认证：登录/注册/登出，cookie session
  - 核心文件：`rich-text-editor.tsx`, `auth-modal.tsx`, `export/route.ts`, `progress/route.ts`

- **2026-04-18**：完成 MQuill v1 初始提交
  - 113 files changed, 23535 insertions
  - master 分支：初始快照；develop 分支：开发分支
  - 虚拟滚动性能优化（@tanstack/react-virtual）
  - 双编辑器模式：连续（textarea）和分段（虚拟滚动）

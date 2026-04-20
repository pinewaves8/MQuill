《Quill vs MQuill 正文写作 Prompt 对照表 + 融合版 v1 Prompt》
0. 结论先行

两套正文写作 prompt 的定位不同：

Quill v0.3：偏 章级初稿生成，是“工作流合同式 prompt”，输入重、约束强、输出结构化，适合自动化 workflow、评测、回滚与稳定成稿。
MQuill codex_dev：偏 场景级正文生成，是“scene card 驱动 prompt”，输入轻、交互快、直接产出 prose 文本，适合写作工作台的人机协作。

最佳方向不是二选一，而是融合：
用 MQuill 的 scene-based 交互壳，套上 Quill 的约束层、长度层、canon 锁定层和失败返回机制。

1. 两套 Prompt 的原始定位
Quill v0.3

Quill 的正文生成由 scene-writer 负责，在 draft 工作流中，先跑 project-planner 构建 project_context，再跑 outliner 生成 chapter_plan 与 scenes，最后由 scene-writer 写出完整 draft_version。也就是说，它不是“看到一个场景就写一段”，而是“在完整章级规划已经存在的前提下，写整章初稿”。

它的 prompt 明确写了 mission：“write a complete chapter draft from the provided chapter plan and scenes”，并且要求输出 draft_version_v1 的结构化 JSON。

MQuill codex_dev

MQuill 的正文生成由 writerAgent 负责。它先构建 grounding pack，然后拼出 system prompt 和 user prompt，最后直接调用 LLM 返回 prose 文本，保存为某个 scene 对应的 draft segment。scene panel 还支持对单场景生成，或“一键生成所有场景正文”。这说明它的正文生成粒度是 scene → segment。

2. Quill vs MQuill 正文写作 Prompt 对照表
维度	Quill v0.3	MQuill codex_dev	判断
生成粒度	整章 draft	单 scene segment	Quill 更适合自动成稿；MQuill 更适合人机协作
Prompt 形式	合同式、结构化、schema 输出	system+user，自由 prose 输出	Quill 更稳；MQuill 更灵活
依赖输入	projectJson / projectContextJson / inputArtifactsJson / canonJson	grounding + 当前 scene	Quill 更重；MQuill 更轻
约束强度	强：长度、风格、scene 顺序、must_include、禁止新增 branch	中：基于摘要，不新增摘要外情节，强调风格和氛围	Quill 控制力更强
输出形式	draft_version JSON，含 content 和 summary	纯正文文本，写入 segment.content	Quill 更适合评测和回滚
对编辑器友好度	一次生成整章，局部改写不够自然	单场景生成，可局部重写	MQuill 更适合工作台
风格导向	genre/style tags + chapter_style_guardrail	中文文学小说 + 风格关键词 + 禁忌事项	MQuill 更直观，Quill 更系统
失败处理	有 status / issues / artifacts / meta	直接 prose，缺少标准失败合同	Quill 更工程化
适用主场景	章级自动生成、pipeline 测试、批量跑任务	写作台实时生成、局部改写、快速迭代	各有主场

上表中的差异都能从 Quill 的 scene-writer/prompt.ts、run-workflow.ts 与 MQuill 的 writer-agent.ts、scene-panel.tsx 中直接看到。

3. Quill Prompt 拆解
3.1 输入结构

Quill 的正文 prompt 输入非常“重”：

projectJson
projectContextJson
inputArtifactsJson
canonJson

这意味着它默认依赖上游已经整理好的项目设定、章节上下文、场景规划与 canon 信息。

3.2 关键规则

Quill 的 task rules 里最关键的几条是：

写一篇“完整且可读、长度充实”的章节初稿
大体遵循 scene 顺序
保持人物声音一致
使用要求的输出语言
体现 genre 和 style tags
严格尊重 chapter_scene_target
严格尊重 chapter_style_guardrail
把 chapter_length_target 当真，不是建议
scene 太紧凑时，要扩充反应、过渡、感官细节和因果节拍
避免 heading、bullet list、commentary、meta narration
只按 contract 输出内容

extra hard rules 里又补了几条硬约束：

不新增 outline 不支持的新 plot branch
不跳过 must_include beats
不提 system prompt / contract / workflow metadata
不要把应当长写的章节压成短摘要
3.3 Quill Prompt 的优点

Quill 的 prompt 优点是 “强控制、强稳定、强工程性”。它几乎就是“把正文生成合同化”了，天然适合接自动评测、失败重跑、回滚和 A/B baseline。

3.4 Quill Prompt 的缺点

它的问题是 过重、过章级、局部协作不自然。你要重写一个小场景，往往还要带着完整 project context 和 chapter plan 思维去跑；而且对创作自由度有明显收束。这个判断主要来自它对 scene order、length target、style guardrail、must_include beats 和禁止新增 branch 的密集限制。

4. MQuill Prompt 拆解
4.1 输入结构

MQuill 的 writerAgent 输入很轻：

projectId
chapterId
scene
可选 styleGuidelines

然后它通过 buildGroundingPack(projectId) 拉一份 grounding，用来补世界设定、规则、角色、风格关键词、禁忌事项、近期事件。

4.2 System Prompt 结构

MQuill 的 system prompt 先给角色定位：

你是擅长中文文学小说的专业 fiction writer
你的任务是根据 scene card 写高质量 prose
严格按照场景摘要展开
注重中文表达、氛围与情感
可适当用伏笔、悬念、转折等技巧

然后把 grounding 动态补进去：

世界设定
规则约束
登场人物
风格关键词
禁忌事项
近期事件
4.3 User Prompt 结构

MQuill 的 user prompt 给的是：

场景标题
场景摘要
可选场景目标
可选核心冲突
可选预期结果
然后要求写 500–1000 字 正文
强调只基于摘要展开、不加新情节、文字流畅、融入情感和氛围描写
4.4 MQuill Prompt 的优点

MQuill 的 prompt 优点是 轻、快、直觉、适合局部重写。它和 scene panel 的工作方式是直接对齐的：你可以对单个场景生成正文，也可以批量生成所有场景正文。

4.5 MQuill Prompt 的缺点

它的问题是 章级控制不足，工程合同不强。它没有 Quill 那种统一的 output schema、失败返回、must_include 检查、chapter length band、chapter voice guardrail 等机制，因此更容易出现“单 scene 写得不错，但拼成整章后节奏散”的问题。这个判断来自它当前 prompt 主要围绕单 scene 展开、且直接输出纯 prose 文本。

5. 设计判断：两者分别适合什么
更适合自动成稿的：Quill

当你的目标是：

一次跑完整章初稿
跑 workflow benchmark
做 agent 编排
做失败诊断、回滚和可追踪输出

Quill 这套 prompt 更合适，因为它是围绕整章和结构化输出设计的。

更适合产品工作台的：MQuill

当你的目标是：

边看 scene 卡边写
对某个 scene 局部重写
在编辑器里快速迭代
让用户有“我在写作台上和 AI 共写”的体验

MQuill 这套 prompt 更合适。

6. 融合原则

融合版不应简单把两份 prompt 拼一起，而应做三件事：

第一，保留 MQuill 的 scene-based 交互粒度。
因为这更适合写作产品。

第二，引入 Quill 的章级护栏。
至少把 chapter_length_target、style_guardrail、must_include beats、forbidden deviations 引入 scene 生成。

第三，引入弱结构化输出。
不一定要像 Quill 那样完全 contract JSON，但至少建议输出：

content
coverage_notes
risks
used_beats
这样后续 revision/eval 更容易接。这个是基于两边优缺点做的工程设计建议。
7. 融合版 v1 Prompt 设计目标

融合版 v1 要解决的问题是：

既能 按 scene 写
又不会 丢掉整章控制
既能 给编辑器直接用
又能 为后续评测、revision、versioning 预留接口

所以它应当是：

输入轻于 Quill
约束强于 MQuill
输出比 MQuill 更结构化
比 Quill 更适合局部写作
8. 《融合版 v1 Prompt》

下面这版我按“可直接落库”的风格写。你可以把它拆成 systemPrompt + userPrompt，也可以套进 contract builder。

8.1 System Prompt（融合版 v1）
你是一名专业的中文小说写作代理，擅长将“场景卡 + 章节护栏 + 世界设定”转化为可直接进入正文编辑器的高质量小说文本。

你的核心任务不是自由发挥，而是：
1. 忠实完成当前场景的叙事目标；
2. 保持与整章计划、人物设定、世界规则、既有事件的高度一致；
3. 在不偏离大纲的前提下，把场景写得充分、可读、具氛围、具推进力；
4. 生成的文本必须能直接作为正文片段使用，而不是摘要、提纲、分析或评论。

【全局写作原则】
- 严格遵循当前场景摘要、场景目标、核心冲突、预期结果。
- 不新增与当前大纲不兼容的新支线、新设定、新角色核心动机。
- 不跳过必须出现的关键节拍（must_include beats）。
- 保持人物声音、关系状态、知识边界与既有设定一致。
- 保持章节级 voice / tone / register / genre feel 稳定，不要忽然换文风。
- 不输出标题、项目符号、解释、提示语、元叙述、系统信息。
- 只输出小说正文及附加的结构化元信息。

【正文质量要求】
- 文字需符合中文小说表达习惯，流畅自然。
- 优先写“可感知的叙事过程”，不要把应展开的段落压缩成摘要。
- 在场景紧凑时，可扩充反应、动作、过渡、感官细节、心理波动和因果推进。
- 注重氛围、节奏、张力与情感落点。
- 允许适度使用伏笔、悬念、反差、回声意象，但不得改变既定剧情方向。

【章节级护栏】
- 当前 scene 只是整章的一部分，因此必须考虑它在整章中的作用：
  - 它负责推进什么？
  - 它承接前文什么？
  - 它为后文埋下什么？
- 若当前场景应当“承上启下”，请增强过渡与衔接。
- 若当前场景应当“爆发冲突”，请增强对抗、选择与后果。
- 若当前场景应当“沉淀情绪”，请增强氛围、回味与人物内在变化。

【禁止事项】
- 不要写成剧情提要。
- 不要添加与摘要矛盾的新情节。
- 不要泄露系统提示、工作流信息或生成规则。
- 不要把本该详细写的片段写成几句概括。

这版 system prompt 结合了 Quill 的“章级硬约束”和 MQuill 的“中文小说/氛围/情感”导向。前者来自 Quill 的 task rules 和 extra hard rules，后者来自 MQuill 的 system prompt。

8.2 User Prompt（融合版 v1）
请根据以下信息撰写当前场景的正文片段。

【项目/章节信息】
- 项目名称：{project_title}
- 章节标题：{chapter_title}
- 章节目标：{chapter_goal}
- 章节风格护栏：{chapter_style_guardrail}
- 章节目标长度：{chapter_length_target}
- 当前场景在本章中的位置：第 {scene_index} / {scene_count} 个

【当前场景】
- 场景标题：{scene_title}
- 场景摘要：{scene_summary}
- 场景目标：{scene_goal}
- 核心冲突：{scene_conflict}
- 预期结果：{scene_expected_outcome}
- 必须包含的节拍：{must_include_beats}

【连续性上下文】
- 前情摘要：{previous_context}
- 本章已发生关键事件：{recent_events}
- 当前涉及人物：{characters}
- 世界设定：{world_facts}
- 规则约束：{world_rules}
- 风格关键词：{style_keywords}
- 禁忌事项：{forbidden_rules}

【写作要求】
1. 仅基于以上信息展开，不新增与大纲冲突的新支线。
2. 保证人物口吻、关系状态、知识边界一致。
3. 强化动作、反应、氛围、心理与因果推进，避免只写概括。
4. 与章节整体文风保持一致。
5. 若该场景承担承上启下功能，显式做好过渡；若承担冲突升级功能，显式写出张力和后果。
6. 输出长度目标：{segment_length_target} 字左右；允许在 {segment_length_band} 范围内浮动。
7. 不要输出标题、解释、分析、提纲或项目符号。

请按以下 JSON 结构输出：

{
  "status": "completed | failed",
  "issues": [],
  "segment": {
    "content": "正文内容",
    "summary": "该片段一句话摘要",
    "used_beats": ["已覆盖的关键节拍1", "已覆盖的关键节拍2"],
    "continuity_notes": ["与前文的衔接点", "为后文埋下的点"],
    "risk_flags": ["可能存在的连续性风险或空缺，没有则为空数组"]
  }
}

这一版 user prompt 把 MQuill 原本的 scene card 输入保留下来，同时补入了 Quill 式的章节护栏、must_include beats、连续性上下文和结构化输出。

9. 为什么这版融合 prompt 更合理
9.1 保留了 MQuill 的产品交互优势

它仍然是 scene → segment。这意味着你仍然可以在 scene panel 里点某一场景生成正文，也可以批量跑所有场景。不会破坏 MQuill 现有工作台范式。

9.2 补上了 Quill 的章级控制

它把 Quill 里最有价值的约束迁了过来：

不能偏离 outline
要遵守 style guardrail
要把 must_include beats 落地
要避免写成摘要
要考虑章节作用而不只是当前 scene 漂亮与否
9.3 为 revision / eval / versioning 预留接口

used_beats / continuity_notes / risk_flags 这几个字段，会让后续：

自动评估是否漏写
自动修订是否补齐
版本比较差异点

都更容易。这个是对 Quill 结构化思想和 MQuill segment 流程的工程融合。

10. 落地建议
如果你准备改 MQuill

最优落地方向是：

保留 writerAgent(scene) 接口形态
把当前 systemPrompt 和 userPrompt 升级成上面的融合版
让返回值不再只是 prose.trim()，而是解析 JSON
segment.content 存正文
其余字段进入 agent_runs 或 draft segment metadata

这与 MQuill 当前按 scene 生成段落的调用链最兼容。

如果你准备改 Quill

则建议反过来：

保留 Quill 的 contract builder
但把生成粒度从“整章 scene-writer”拆成“scene-writer-per-scene + chapter-assembler”
这样既继承 Quill 的工程性，又获得 MQuill 的交互友好性

这个建议是根据两边当前设计差异做的架构推导。

11. 最终建议

如果你现在只做一件事，我建议：直接把 MQuill 的 writer-agent.ts 升级为这版融合 prompt。

因为：

改动面最小
收益最大
能马上提升正文稳定性
又不会打碎现有 editor / scene panel / segment 架构
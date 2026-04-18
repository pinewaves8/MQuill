# Quill v2 工业级小说生成Agent系统
## 正式设计文档（可交付版）
**版本**：v2.0.0
**日期**：2026-04-15
**定位**：小说世界模拟 + 自进化写作系统（可对接Hermes/AutoDev-OS/Athena）
**核心**：世界模拟为核心，文本为渲染层，Agent协作为骨架，自进化为动力

---

## 目录
1. 项目总览
2. 系统架构
3. 核心Agent设计（含接口+Prompt模板）
4. 数据模型字典（全量Schema）
5. 记忆与持久化系统
6. Skill体系与进化机制
7. API接口全定义
8. UI工作台规范
9. 创作工作流
10. 评测体系
11. 部署与集成
12. 交付物清单

---

# 1. 项目总览
## 1.1 核心定义
Quill v2 是工业级叙事模拟引擎，基于「世界模拟+多Agent协作」实现全流程小说生成，文本仅为世界状态的投影，支持长篇一致性、可控生成、技能自进化。

## 1.2 核心能力
- 世界动态模拟：地理/规则/势力/经济实时运行
- 角色自主行为：动机驱动决策，非被动剧情
- 双创作模式：规划型(大纲) / 生长型(模拟)
- 全流程闭环：模拟→生成→批评→校验→进化
- 工业级稳定：长期记忆+全局一致性+无崩坏

## 1.3 适用范围
- 篇幅：短篇 / 中篇 / 长篇 / 多卷连载
- 题材：武侠/奇幻/科幻/悬疑/爱情/现实/历史
- 模式：全自动 / 人机共创 / 作者主导

---

# 2. 系统架构
## 2.1 顶层Agent流水线
用户意图 -> IdeaAgent -> WorldArchitect -> CharacterEngine -> PlotPlanner
循环：SceneSimulator -> WriterAgent -> CriticEditor -> ConsistencyJudge -> Memory更新
EvolutionAgent -> 回流全系统

## 2.2 七层内核架构
1. Simulation Core（模拟内核）
2. Narrative Core（叙事内核）
3. Form Layer（篇幅层）
4. Genre Layer（题材层）
5. Style Layer（风格层）
6. Skill Layer（技能层）
7. Evaluation Layer（评测层）

## 2.3 系统边界
- 不生成涉政、色情、暴力违规内容
- 不替代作者核心创意，保留最高控制权
- 自进化可人工中断，避免不可控漂移

---

# 3. 核心Agent设计（接口 + Prompt模板）

## 3.1 IdeaAgent（灵感生成）
### 功能
从用户意图提炼主题、冲突、题材、情绪、基调

### 输入接口
{
  "user_prompt": "string",
  "genre_prefer": "string",
  "length": "short|mid|long",
  "style": "string"
}

### 输出接口
{
  "theme": "string",
  "core_conflict": "string",
  "genre": "string",
  "tone": "string",
  "target_audience": "string",
  "core_imagery": "string"
}

### Prompt模板（可直接使用）
你是顶级创作策划师，模仿村上春树、托尔斯泰、乔治·马丁的灵感提炼方式。
输入：用户创作意图、题材偏好、篇幅、风格要求
输出：结构化JSON，包含：主题、核心冲突、题材、情绪基调、目标受众、核心意象。
要求：主题深刻、冲突尖锐、意象可视觉化。

---

## 3.2 WorldArchitect（世界构建）
### 功能
构建自洽世界：地理、经济、权力、规则、时间线

### 输入接口
{
  "theme": "string",
  "genre": "string",
  "core_conflict": "string",
  "length": "string"
}

### 输出接口
{
  "world_name": "string",
  "geography": "string",
  "economy": "string",
  "power_system": "string",
  "rules": ["string"],
  "factions": [{"name": "string", "traits": "string"}],
  "timeline_baseline": "string"
}

### Prompt模板
你是世界架构师，模仿托尔金、乔治·马丁。
根据主题、题材、核心冲突，生成可运行的虚拟世界：
- 地理
- 经济体系
- 权力/魔法/科技规则
- 势力阵营
- 基础时间线
要求：规则自洽、可模拟、无矛盾。

---

## 3.3 CharacterEngine（角色引擎）
### 功能
生成带动机、秘密、关系、行为逻辑的自主角色

### 输入接口
{
  "world_id": "string",
  "core_conflict": "string",
  "cast_size": "int"
}

### 输出接口
{
  "characters": [
    {
      "char_id": "string",
      "name": "string",
      "age": "int",
      "personality": "string",
      "goals": ["string"],
      "secrets": ["string"],
      "relationships": [{"target": "string", "type": "string"}],
      "behavior_logic": "string"
    }
  ]
}

### Prompt模板
你是角色设计师，角色必须具备自主行为能力，而非工具人。
为当前世界生成核心角色：
- 目标（欲望）
- 性格
- 秘密
- 关系网
- 行为决策逻辑
要求：角色动机强烈、行为可预测、可产生自然冲突。

---

## 3.4 PlotPlanner（剧情规划）
### 功能
支持大纲模式 / 生长模拟模式

### 输入接口
{
  "world_id": "string",
  "char_ids": ["string"],
  "core_conflict": "string",
  "mode": "outline|emergent",
  "length": "string"
}

### 输出接口
{
  "arcs": ["string"],
  "key_events": ["string"],
  "turning_points": ["string"],
  "foreshadowing_plan": ["string"],
  "pacing_curve": "string"
}

### Prompt模板
你是剧情总策划，支持两种模式：
1. 大纲模式：完整结构、分卷、关键节点
2. 生长模式：仅核心冲突，由模拟自然生成
输出：故事弧光、关键事件、转折点、伏笔规划、节奏曲线。

---

## 3.5 SceneSimulator（场景模拟）【核心】
### 功能
世界状态+角色→推演场景结果（不生成文本）

### 输入接口
{
  "world_state": "object",
  "characters": ["object"],
  "trigger": "string"
}

### 输出接口
{
  "scene_id": "string",
  "simulation_log": ["string"],
  "outcome": "string",
  "world_state_updates": "object",
  "char_state_updates": "object",
  "emotion_beat": "string"
}

### Prompt模板
你是世界模拟器，只做因果推演，不写散文。
根据当前世界状态、角色状态、触发事件，模拟：
- 角色行动
- 互动结果
- 世界变化
- 情绪节点
输出：模拟日志、结果、世界/角色更新、情绪节拍。

---

## 3.6 WriterAgent（文本渲染）
### 功能
将模拟结果渲染为文学文本（仅渲染，不创造逻辑）

### 输入接口
{
  "scene_sim": "object",
  "style": "string",
  "pacing": "string",
  "viewpoint": "string"
}

### 输出接口
{
  "text": "string",
  "word_count": "int",
  "viewpoint_char": "string",
  "style_notes": "string"
}

### Prompt模板
你是文学渲染师，只把场景模拟结果写成文本，不改变剧情逻辑。
要求：
- 风格统一
- 视角稳定
- 情绪到位
- 符合题材语感

---

## 3.7 CriticEditor（批评编辑）
### 功能
审稿、压缩、润色、强化节奏与情绪

### 输入接口
{
  "text": "string",
  "style": "string",
  "pacing": "string",
  "notes": "string"
}

### 输出接口
{
  "revised_text": "string",
  "critique": "string",
  "changes": ["string"],
  "score": "float"
}

### Prompt模板
你是资深编辑，模仿海明威修改原则：删减冗余、强化张力、节奏紧凑。
输出：修改后文本、批评意见、修改点、质量评分。
要求：不破坏设定与角色一致性。

---

## 3.8 ConsistencyJudge（一致性校验）
### 功能
校验世界、角色、时间线、伏笔、规则

### 输入接口
{
  "world_state": "object",
  "characters": ["object"],
  "text": "string",
  "timeline": "object"
}

### 输出接口
{
  "is_consistent": "bool",
  "errors": [{"type": "string", "content": "string", "location": "string"}],
  "fix_suggestions": ["string"]
}

### Prompt模板
你是一致性法官，检查：
- 世界规则是否冲突
- 角色是否OOC
- 时间线是否矛盾
- 伏笔是否可回收
输出：错误清单、严重等级、修复建议。

---

## 3.9 EvolutionAgent（技能进化）
### 功能
从成功案例挖掘技能→评测→入库

### 输入接口
{
  "successful_cases": ["object"],
  "revision_history": ["object"],
  "skill_library": ["object"]
}

### 输出接口
{
  "new_skills": ["object"],
  "updated_skills": ["object"],
  "deprecated_skills": ["string"],
  "eval_report": "object"
}

### Prompt模板
你是技能进化师，从优秀章节与修订案例中挖掘可复用技能。
输出：新技能、升级技能、废弃技能、评测报告。

---

# 4. 数据模型字典（全量Schema）

## 4.1 Project（项目）
{
  "project_id": "string",
  "title": "string",
  "genre": "string",
  "length": "short|mid|long",
  "mode": "outline|emergent",
  "create_time": "datetime",
  "current_phase": "idea|world|char|plot|writing|revision"
}

## 4.2 World（世界）
{
  "world_id": "string",
  "project_id": "string",
  "name": "string",
  "geography": "string",
  "economy": "string",
  "power_system": "string",
  "rules": ["string"],
  "factions": ["object"],
  "timeline_baseline": "string",
  "state": "object"
}

## 4.3 Character（角色）
{
  "char_id": "string",
  "project_id": "string",
  "name": "string",
  "age": "int",
  "personality": "string",
  "goals": ["string"],
  "secrets": ["string"],
  "relationships": ["object"],
  "behavior_logic": "string",
  "state": "object"
}

## 4.4 Plot（剧情）
{
  "plot_id": "string",
  "project_id": "string",
  "arcs": ["string"],
  "key_events": ["string"],
  "turning_points": ["string"],
  "foreshadowing": ["object"],
  "pacing": "string"
}

## 4.5 Scene（场景）
{
  "scene_id": "string",
  "project_id": "string",
  "chapter_id": "string",
  "sim_result": "object",
  "text": "string",
  "version": "int",
  "state": "draft|revised|final"
}

## 4.6 Memory（记忆）
{
  "memory_id": "string",
  "project_id": "string",
  "type": "canon|world|narrative|user",
  "content": "object",
  "priority": "int",
  "update_time": "datetime"
}

## 4.7 Skill（技能）
{
  "skill_id": "string",
  "name": "string",
  "type": "base|composite|genre|meta",
  "genre": "string",
  "length": "string",
  "prompt": "string",
  "score": "float",
  "status": "draft|candidate|validated|core|deprecated"
}

---

# 5. 记忆与持久化系统
## 5.1 四层记忆
1. Canonical Memory（最高优先级）
2. World State Memory（实时运行态）
3. Narrative Memory（事件/伏笔/关系）
4. User Intent Memory（作者偏好）

## 5.2 持久化
- 关系型：项目、角色、世界、章节、技能
- 时序型：时间线、模拟日志、版本历史
- 向量库：风格 embedding、情节相似度检索

## 5.3 同步规则
- 人工修改 > Agent生成
- 锁定内容不可覆盖
- 世界变更自动触发全文档校验

---

# 6. Skill体系与进化机制
## 6.1 技能分类
- 基础模拟Skill
- 基础写作Skill
- 复合Skill
- 题材Skill
- 元写作Skill

## 6.2 进化路径
Skill Mining -> Candidate -> Offline Eval -> Promotion -> Deprecation

## 6.3 技能元数据
- 输入/输出
- 依赖技能
- 适用题材/篇幅/风格
- 失败模式
- 评测得分

---

# 7. API接口全定义
## 7.1 项目管理
- POST /project/create
- GET /project/{id}
- PUT /project/{id}/update

## 7.2 Agent调用
- POST /agent/idea
- POST /agent/world
- POST /agent/character
- POST /agent/plot
- POST /agent/simulate
- POST /agent/write
- POST /agent/critic
- POST /agent/consistency
- POST /agent/evolve

## 7.3 读写记忆
- POST /memory/write
- GET /memory/read
- POST /memory/update

## 7.4 版本管理
- GET /version/list
- POST /version/rollback

---

# 8. UI工作台规范
## 8.1 核心页面
1. 项目总览
2. 世界模拟器（可视化）
3. 角色行为控制台
4. 大纲/剧情编辑器
5. 正文编辑+版本对比
6. 一致性仪表盘
7. 技能管理面板

## 8.2 交互原则
- 一键模拟
- 批注重写
- 锁定文本
- 多版本并排
- 冲突可视化

---

# 9. 创作工作流
## 9.1 全自动模式
灵感->世界->角色->模拟循环->生成->定稿

## 9.2 共创模式
作者干预关键节点->Agent模拟与生成->修订->确认

## 9.3 作者主导
作者写剧情点->Agent模拟->校验->润色

---

# 10. 评测体系
## 10.1 自动指标
- 一致性得分
- 角色稳定度
- 节奏合理度
- 风格统一度
- 伏笔回收率

## 10.2 人工指标
- 作者评分
- 阅读流畅度
- 情感共鸣
- 追读意愿

---

# 11. 部署与集成
## 11.1 可对接系统
- Hermes
- AutoDev-OS
- Athena
- SimWorld/UE5/OSM

## 11.2 部署方式
- 容器化部署
- 微服务Agent架构
- 支持分布式推演

---

# 12. 交付物清单
1. Quill v2 正式设计文档
2. 全Agent接口定义
3. Agent Prompt模板（可直接运行）
4. 全量数据模型字典
5. API文档
6. 代码Repo结构
7. UI原型规范
8. 部署架构图

---
**文档状态**：已完成，可直接进入开发



------------------增加检索功能--------
# Quill v2 正式设计文档（最终可交付版）
**已完整融合：分层知识检索基础设施 + 全链路检索工作流 + 接口 / Prompt / 数据模型**
定位：**工业级小说生成Agent系统 = 世界模拟 + 自进化写作 + 分层检索基座**

---

# 0. 文档信息
- 文档版本：Quill v2.0 Final
- 适用系统：Hermes / AutoDev-OS / Athena
- 核心定位：**检索不是增强，是基础设施**
- 检索原则：该真实则真实、该一致则一致、该虚构则规则虚构
- 检索分层：Idea / 世界 / 角色 / 剧情 / 场景 / 审校 六层全接入

---

# 1. 系统总架构（含检索基座）
```
User Intent
   ↓
1. IdeaAgent → ConceptRetriever
   ↓
2. WorldArchitect → ResearchAgent + WorldGroundingLayer
   ↓
3. CharacterEngine → CharacterRetriever
   ↓
4. PlotPlanner → ConstraintRetriever
   ↓
LOOP:
  5. SceneSimulator → NarrativeMemoryRetriever
  6. WriterAgent → GroundingPack
  7. CriticEditor → StyleRetriever
  8. ConsistencyJudge → LoreRetriever + FactRetriever
  9. RepairAgent → RevisionRetriever
  ↓
10. MemoryUpdater → LoreDB
  ↓
11. EvolutionAgent → SkillMining
```

## 1.1 四大检索基座（核心基础设施）
1. **外部事实检索**：历史/地理/制度/职业/科技/军事
2. **内部Lore检索**：世界规则/角色/势力/时间线/术语
3. **叙事记忆检索**：前文事件/伏笔/关系/线索
4. **风格约束检索**：语体/节奏/叙述视角/句法

---

# 2. 全Agent接口定义（输入 → 检索 → 输出）
所有接口均为**JSON Schema**，可直接开发。

## 2.1 IdeaAgent + ConceptRetriever
**功能**：灵感生成 + 题材/背景检索
**输入**
```json
{
  "user_prompt": "string",
  "genre": "string",
  "setting": "string"
}
```
**检索调用**
- ConceptRetriever：题材母题、时代背景、社会结构、经典范式
**输出**
```json
{
  "theme": "string",
  "core_conflict": "string",
  "world_type": "string",
  "mood": "string",
  "background_facts": ["string"],
  "reference_patterns": ["string"]
}
```

## 2.2 WorldArchitect + ResearchAgent + WorldGroundingLayer
**功能**：世界构建 + 事实/规则检索
**输入**
```json
{
  "idea": {},
  "genre": "string",
  "era": "string",
  "world_type": "string"
}
```
**检索调用**
- 历史/地理/制度/经济/军事/文化事实
- 世界结构模板、规则自洽性参考
**输出**
```json
{
  "world_bible": "string",
  "geography": "string",
  "economy": "string",
  "power_system": "string",
  "rules": ["string"],
  "factions": [],
  "timeline_base": []
}
```

## 2.3 CharacterEngine + CharacterRetriever
**功能**：角色生成 + 职业/阶层/时代检索
**输入**
```json
{
  "world_bible": {},
  "role": "string",
  "identity": "string",
  "era": "string"
}
```
**检索调用**
- 职业行为、阶层逻辑、时代语言、生活方式
**输出**
```json
{
  "character_id": "string",
  "name": "string",
  "goal": "string",
  "personality": ["string"],
  "background": "string",
  "speech_style": "string",
  "behavior_constraints": ["string"]
}
```

## 2.4 PlotPlanner + ConstraintRetriever
**功能**：剧情规划 + 规则/因果检索
**输入**
```json
{
  "world_bible": {},
  "characters": [],
  "core_conflict": "string"
}
```
**检索调用**
- 世界规则约束、角色能力约束、时间线前置事件
**输出**
```json
{
  "arcs": [],
  "key_events": [],
  "turning_points": [],
  "foreshadowing_plan": [],
  "pacing_curve": []
}
```

## 2.5 SceneSimulator + NarrativeMemoryRetriever
**功能**：场景模拟 + 前文记忆检索
**输入**
```json
{
  "chapter_id": "string",
  "scene_id": "string",
  "characters": ["string"],
  "location": "string"
}
```
**检索调用**
- 角色状态、场景信息、前文事件、已知信息
**输出**
```json
{
  "scene_state": "string",
  "character_states": [],
  "dialogue_intent": [],
  "conflict": "string",
  "outcome": "string"
}
```

## 2.6 WriterAgent（渲染层）
**输入**
```json
{
  "scene_state": {},
  "style": "string",
  "grounding_pack": {
    "facts": [],
    "lore": [],
    "memory": []
  }
}
```
**输出**
```json
{
  "content": "string",
  "language_style": "string",
  "pacing_score": "number"
}
```

## 2.7 ConsistencyJudge + 全量检索
**功能**：一致性校验（核心防崩）
**检索调用**
- LoreRetriever / FactRetriever / TimelineRetriever / CharacterRetriever
**输入**
```json
{
  "draft": "string",
  "world_bible": {},
  "characters": [],
  "timeline": []
}
```
**输出**
```json
{
  "errors": [
    {
      "type": "fact|lore|timeline|character",
      "location": "string",
      "reason": "string",
      "suggestion": "string"
    }
  ],
  "consistency_score": "number"
}
```

## 2.8 RepairAgent
**输入**
```json
{
  "draft": "string",
  "errors": [],
  "grounding_pack": {}
}
```
**输出**
```json
{
  "revised_content": "string",
  "change_log": ["string"]
}
```

## 2.9 EvolutionAgent + Skill库
**输入**
```json
{
  "revisions": [],
  "evaluations": [],
  "success_cases": []
}
```
**输出**
```json
{
  "new_skills": [],
  "updated_skills": [],
  "deprecated_skills": []
}
```

---

# 3. 可直接使用的 Agent System Prompt 模板

## 3.1 IdeaAgent Prompt
```
你是Quill v2的创意总监Agent。
从用户意图中提取：主题、核心冲突、世界类型、情绪基调。
调用ConceptRetriever获取背景事实与题材范式。
输出结构化JSON，不闲聊。
```

## 3.2 WorldArchitect Prompt
```
你是世界架构师。
根据时代/题材构建自洽世界：地理、经济、权力、规则、势力。
必须依赖ResearchAgent返回的事实资料，不编造不可信设定。
输出world bible。
```

## 3.3 CharacterEngine Prompt
```
你是角色设计师。
角色必须符合：时代背景、阶层、职业、性格逻辑。
调用CharacterRetriever获取行为与语言约束。
输出可自主行动的角色档案。
```

## 3.4 PlotPlanner Prompt
```
你是剧情策划。
支持大纲模式/生长模式。
必须遵守ConstraintRetriever返回的世界规则与因果约束。
输出故事弧光与关键事件。
```

## 3.5 SceneSimulator Prompt
```
你是场景推演引擎。
先模拟：角色状态→互动→冲突→结果。
不直接写文本，只输出场景状态。
依赖NarrativeMemoryRetriever获取前文上下文。
```

## 3.6 WriterAgent Prompt
```
你是文本渲染器。只把场景状态转为文学文本。
严格遵守：风格、语体、节奏、事实依据。
不新增设定、不改变剧情、不OOC。
```

## 3.7 ConsistencyJudge Prompt
```
你是终审法官。检查五类一致性：
1. 事实一致性
2. 世界规则一致性
3. 角色一致性
4. 时间线一致性
5. 信息一致性
输出错误清单与置信度。
```

---

# 4. 数据模型字典（可直接建库/建表）
## 4.1 核心表结构
```
Project（项目）
WorldBible（世界圣经）
Character（角色）
Faction（势力）
TimelineEvent（时间线）
Scene（场景）
Chapter（章节）
Draft（稿件）
Critique（评审）
ConsistencyError（一致性错误）
Skill（技能）
Memory（记忆）
RetrieveLog（检索日志）
GroundingPack（检索打包）
```

## 4.2 关键模型（简版）
### WorldBible
```
world_id, title, genre, era, geography, economy, rules, facts, created_at
```
### Character
```
char_id, name, goal, personality, background, speech_style, constraints, state
```
### TimelineEvent
```
event_id, time, location, characters, facts, foreshadowing, payoff
```
### GroundingPack
```
pack_id, scene_id, facts, lore, memory, style, constraints
```

---

# 5. 检索基础设施（核心模块）
## 5.1 检索模块清单
1. ConceptRetriever（灵感/题材）
2. ResearchAgent（外部事实）
3. WorldGroundingLayer（世界基座）
4. CharacterRetriever（角色背景）
5. ConstraintRetriever（规则约束）
6. NarrativeMemoryRetriever（叙事记忆）
7. LoreRetriever（内部设定）
8. StyleRetriever（风格）
9. FactRetriever（事实校验）
10. RevisionRetriever（修订依据）

## 5.2 检索强度策略（按题材）
- 历史/现实：**最高强度**
- 科幻：**结构/逻辑检索优先**
- 奇幻：**Lore自洽检索优先**
- 实验文学：**风格/意象检索优先**

## 5.3 检索→判断→生成 标准流程
```
Planner → Retriever → GroundingPack → Generator → Judge → Memory
```

---

# 6. 创作工作流（完整可运行）
1. 创意 → 检索背景
2. 世界构建 → 检索事实/规则
3. 角色生成 → 检索职业/时代/行为
4. 剧情规划 → 检索约束/因果
5. 场景模拟 → 检索前文记忆
6. 文本生成 → 使用GroundingPack
7. 评审 → 检索风格/节奏
8. 一致性校验 → 全量检索
9. 修复 → 定向检索依据
10. 入库 → 更新记忆
11. 进化 → 挖掘技能

---

# 7. 评测体系（含检索质量）
- 事实准确率
- 设定自洽率
- 时间线合法率
- 角色OOC率
- 伏笔回收率
- 检索有用率
- 修订有效率

---

# 8. 部署与集成
- 可接入：Hermes / AutoDev-OS / Athena
- 检索对接：RAG/向量库/知识库
- 模拟对接：SimWorld/UE5/OSM
- 技能库：可插拔、可进化

---

# 9. 核心结论（论文级）
**检索不是可选增强，而是小说Agent的基础设施。**
Quill v2通过六层全链路检索，实现：
1. **真实感**：现实题材不胡编
2. **自洽性**：幻想题材不吃书
3. **连续性**：长篇不崩记忆
4. **质量可控**：从“随机生成”变为“可复现创作”


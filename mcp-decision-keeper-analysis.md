# MCP Decision Keeper - 项目分析文档

## 📋 执行摘要

### 项目基本信息

| 项目 | 信息 |
|------|------|
| **项目名称** | MCP Decision Keeper（决策守护者） |
| **npm 包名** | `mcp-decision-keeper` |
| **GitHub 仓库** | `decision-keeper-mcp` |
| **项目定位** | AI 编码助手的决策演化追踪与上下文恢复工具 |
| **目标用户** | 使用 Claude Code、Cursor、Windsurf 等 AI 编码工具的开发者 |

### 核心价值主张

> **在多轮 LLM 对话驱动的软件开发过程中，决策规格通过增量式对话逐步演化。当对话上下文因 token 限制被压缩或清空时，这些决策记录丢失，导致后续生成物与累积决策产生语义偏差（Semantic Drift）。**

**Decision Keeper** 通过捕获、聚合、持久化对话中的所有决策（业务需求、技术选型、架构设计、约束条件），在上下文压缩/重置时提供精准的决策状态恢复，消除 LLM 代码生成的语义偏差问题。

### 是否值得开发

**✅ 强烈建议开发**

**理由**：

1. **真实痛点**：所有 AI 编码工具用户都会遇到"上下文丢失导致不一致"的问题
2. **市场空白**：没有专门针对"决策演化追踪"的 MCP 工具
3. **技术可行**：基于 MCP 协议，开发量可控（估算 500-800 行核心代码）
4. **通用性强**：支持所有 MCP 兼容工具（Claude Code、Cursor、Windsurf 等）
5. **扩展性好**：可逐步演化为完整的软件开发知识图谱

### 一句话描述

**中文**：追踪每一个开发决策，让 AI 编码助手永不遗忘。

**英文**：Track every development decision, keep your AI coding assistant always aligned.

---

## 1. 原始需求描述

### 1.1 问题背景

在使用大模型进行软件开发的过程中，存在以下核心问题：

1. **上下文容量限制**
   - LLM 的 token 限制导致长对话必须被压缩或清空
   - 压缩算法（如 LLMLingua）会丢失语义细节

2. **决策演化的隐式性**
   - 用户通过自然语言表达需求，决策分散在多轮对话中
   - 决策之间存在覆盖、修正、澄清关系，形成演化链

3. **多工具使用场景**
   - 不同 AI 编码工具（Claude Code、Cursor、Codex）有独立的会话
   - 决策无法跨工具共享

4. **代码产物不一致**
   - 上下文丢失后，AI 生成的代码违反早期决策
   - 例如：曾禁止使用 `lodash`，但新会话中又引入了

### 1.2 核心诉求

构建一个 MCP 服务，实现以下能力：

1. **自动决策捕获**
   - 从自然语言对话中识别影响开发的决策
   - 分类决策类型（新增、修改、澄清、约束、撤销）

2. **决策演化管理**
   - 记录决策的完整历史
   - 处理决策冲突（后决策覆盖前决策）
   - 聚合为当前有效决策集

3. **跨会话持久化**
   - 决策存储在本地，不依赖单次会话
   - 支持按项目/任务隔离

4. **智能上下文恢复**
   - 在新会话/上下文压缩后自动注入当前决策状态
   - 按相关性过滤（只注入当前任务相关的决策）
   - 格式化为 LLM 可理解的结构化 prompt

### 1.3 期望效果

- **零语义偏差**：上下文恢复后，AI 生成的代码与累积决策 100% 一致
- **零手动干预**：决策捕获和恢复全自动，用户无感知
- **跨工具共享**：在 Claude Code 中做的决策，在 Cursor 中也生效

---

## 2. 能力模块分析

### 2.1 决策分类体系

#### 2.1.1 决策类型定义

| 决策类型 | 英文标识 | 定义 | 示例 |
|---------|---------|------|------|
| **新增** | `ADD` | 引入新的功能、模块、依赖 | "添加用户登录功能" |
| **修改** | `MODIFY` | 变更现有功能或设计 | "将 REST API 改为 GraphQL" |
| **澄清** | `CLARIFY` | 明确模糊的需求或技术细节 | "登录支持 OAuth 和邮箱两种方式" |
| **约束** | `CONSTRAIN` | 技术或业务限制 | "禁止使用 lodash" |
| **撤销** | `REVOKE` | 取消之前的决策 | "不再需要导出 PDF 功能" |

#### 2.1.2 决策层次分类

```
决策层次结构：
├─ 业务需求层 (Business)
│  ├─ 功能需求：用户要什么
│  ├─ 业务规则：业务逻辑约束
│  └─ 优先级：功能重要性
│
├─ 技术选型层 (Technology)
│  ├─ 框架/库：React vs Vue
│  ├─ 架构模式：MVC vs MVVM
│  └─ 基础设施：数据库、部署方式
│
├─ 设计决策层 (Design)
│  ├─ API 设计：接口签名
│  ├─ 数据结构：数据模型
│  └─ 模块划分：代码组织
│
└─ 约束条件层 (Constraints)
   ├─ 技术约束：禁用某些库
   ├─ 性能约束：响应时间 < 100ms
   └─ 安全约束：必须加密敏感数据
```

### 2.2 核心能力模块

#### 模块 1：决策识别器（Decision Detector）

**功能**：从自然语言对话中提取结构化决策

**输入**：
```typescript
interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}
```

**输出**：
```typescript
interface Decision {
  id: string                    // 唯一标识
  type: DecisionType            // ADD | MODIFY | CLARIFY | CONSTRAIN | REVOKE
  layer: DecisionLayer          // Business | Technology | Design | Constraints
  target: string                // 决策目标（如 "用户登录模块"）
  content: string               // 决策内容
  scope: string[]               // 影响范围（如 ["auth", "database"]）
  timestamp: number             // 决策时间
  conversationContext: string   // 原始对话上下文
}
```

**实现方式**：
- 使用 LLM 对每轮对话进行语义分析
- Prompt 模板：
  ```
  分析以下对话，提取所有影响软件开发的决策。

  对话内容：{conversation}

  输出格式（JSON）：
  {
    "decisions": [
      {
        "type": "ADD|MODIFY|CLARIFY|CONSTRAIN|REVOKE",
        "layer": "Business|Technology|Design|Constraints",
        "target": "决策目标",
        "content": "决策内容",
        "scope": ["影响范围"]
      }
    ]
  }
  ```

**关键逻辑**：
- 只提取"会影响代码产物"的决策
- 过滤纯讨论性对话（如"这个想法怎么样？"）

---

#### 模块 2：决策聚合器（Decision Aggregator）

**功能**：将决策序列聚合为当前有效决策集

**输入**：决策历史序列（按时间排序）

**输出**：当前有效决策集（去重、去冲突）

**核心算法**：

```typescript
function aggregateDecisions(history: Decision[]): Decision[] {
  const effective: Map<string, Decision> = new Map()

  for (const decision of history) {
    const key = `${decision.layer}:${decision.target}`

    switch (decision.type) {
      case 'ADD':
      case 'MODIFY':
      case 'CLARIFY':
      case 'CONSTRAIN':
        // 后决策覆盖前决策
        effective.set(key, decision)
        break

      case 'REVOKE':
        // 删除对应决策
        effective.delete(key)
        break
    }
  }

  return Array.from(effective.values())
}
```

**冲突处理规则**：
1. **时间优先**：相同目标的决策，后者覆盖前者
2. **层次独立**：不同层次的决策互不影响
3. **撤销优先**：`REVOKE` 类型直接删除对应决策

---

#### 模块 3：持久化存储（Persistence Layer）

**功能**：跨会话持久化决策数据

**存储结构**：

```typescript
interface DecisionStore {
  project: {
    id: string                  // 项目 ID
    name: string                // 项目名称
    path: string                // 项目路径
  }
  decisions: Decision[]         // 决策历史（完整序列）
  snapshots: {                  // 快照（可选）
    [timestamp: string]: Decision[]
  }
  metadata: {
    createdAt: number
    updatedAt: number
    version: string
  }
}
```

**存储方式**：
- **本地文件**：`~/.decision-keeper/{project-id}/decisions.json`
- **数据库（可选）**：SQLite（适合大型项目）

**关键设计**：
- 按项目隔离（基于 git 仓库路径或显式项目 ID）
- 支持版本快照（类似 Git Commit）
- 轻量级备份（每次写入前备份）

---

#### 模块 4：上下文恢复器（Context Restorer）

**功能**：在新会话中自动注入决策状态

**输入**：
- 当前项目 ID
- 当前任务描述（可选）

**输出**：格式化的 prompt 文本

**生成策略**：

```typescript
function generateContextPrompt(
  decisions: Decision[],
  currentTask?: string
): string {
  // 1. 按相关性过滤
  const relevant = filterRelevant(decisions, currentTask)

  // 2. 按层次分组
  const grouped = groupByLayer(relevant)

  // 3. 生成 Markdown 格式
  return `
## 📋 项目决策记录

### 业务需求
${formatDecisions(grouped.Business)}

### 技术选型
${formatDecisions(grouped.Technology)}

### 设计决策
${formatDecisions(grouped.Design)}

### 约束条件
${formatDecisions(grouped.Constraints)}

---
**注意**：以上决策是累积的开发决策，所有代码生成必须严格遵守。
  `
}
```

**相关性过滤算法**：
- 如果有当前任务描述：计算决策与任务的语义相似度（使用 Embedding）
- 如果无任务描述：注入所有约束条件 + 最近 N 条决策

---

#### 模块 5：MCP 接口层（MCP Interface）

**功能**：提供 MCP 协议的 Tools 和 Resources

**提供的 Tools**：

```typescript
// Tool 1: 手动记录决策
{
  name: "record_decision",
  description: "手动记录一个开发决策",
  inputSchema: {
    type: "object",
    properties: {
      type: { enum: ["ADD", "MODIFY", "CLARIFY", "CONSTRAIN", "REVOKE"] },
      layer: { enum: ["Business", "Technology", "Design", "Constraints"] },
      target: { type: "string" },
      content: { type: "string" },
      scope: { type: "array", items: { type: "string" } }
    }
  }
}

// Tool 2: 查询当前决策
{
  name: "get_decisions",
  description: "获取当前项目的有效决策集",
  inputSchema: {
    type: "object",
    properties: {
      layer: { enum: ["Business", "Technology", "Design", "Constraints"] },
      scope: { type: "string" }
    }
  }
}

// Tool 3: 恢复上下文
{
  name: "restore_context",
  description: "生成决策上下文 prompt",
  inputSchema: {
    type: "object",
    properties: {
      task: { type: "string", description: "当前任务描述" }
    }
  }
}

// Tool 4: 创建快照
{
  name: "create_snapshot",
  description: "为当前决策状态创建快照",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" }
    }
  }
}
```

**提供的 Resources**：

```typescript
// Resource 1: 决策历史
{
  uri: "decision://history",
  mimeType: "application/json",
  description: "完整的决策历史序列"
}

// Resource 2: 当前有效决策
{
  uri: "decision://current",
  mimeType: "application/json",
  description: "当前有效的决策集（已聚合）"
}

// Resource 3: 决策统计
{
  uri: "decision://stats",
  mimeType: "application/json",
  description: "决策统计信息（按类型、层次分组）"
}
```

---

### 2.3 数据流设计

```
┌─────────────┐
│ 用户对话    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ 决策识别器          │ ◄── LLM 语义分析
│ (Decision Detector) │
└──────┬──────────────┘
       │ Decision[]
       ▼
┌─────────────────────┐
│ 持久化存储          │
│ (Persistence)       │ ──► ~/.decision-keeper/
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ 决策聚合器          │ ◄── 冲突处理
│ (Aggregator)        │
└──────┬──────────────┘
       │ Effective Decisions
       ▼
┌─────────────────────┐
│ 上下文恢复器        │ ◄── 相关性过滤
│ (Context Restorer)  │
└──────┬──────────────┘
       │ Formatted Prompt
       ▼
┌─────────────────────┐
│ 新会话注入          │
└─────────────────────┘
```

---

### 2.4 技术选型

| 技术栈 | 选择 | 理由 |
|--------|------|------|
| **开发语言** | TypeScript | MCP SDK 官方支持，类型安全 |
| **运行时** | Node.js >= 18 | MCP 标准运行环境 |
| **MCP SDK** | `@modelcontextprotocol/sdk` | 官方 SDK |
| **存储** | JSON 文件 + SQLite（可选） | 简单项目用文件，大型项目用数据库 |
| **LLM 调用** | Anthropic API | 决策识别需要 LLM 能力 |
| **向量检索**（可选） | Embedding API | 相关性过滤（Phase 2） |

---

## 3. 竞品分析（简略版）

### 3.1 直接竞品

| 工具 | 相似度 | 优势 | 劣势 | 结论 |
|------|--------|------|------|------|
| **task-orchestrator** | 60% | 专为编码助手设计 | 任务追踪，非决策演化 | 可参考架构 |
| **lifecycle-mcp** | 70% | 需求 + 架构决策记录 | 手动录入，非对话捕获 | 可参考数据模型 |
| **specs-workflow-mcp** | 50% | 规格文档管理 | 文档管理，非决策追踪 | 可参考工作流 |

### 3.2 间接竞品

| 工具 | 定位 | 差异 |
|------|------|------|
| **MemoryMesh** | 通用知识图谱 | 无决策语义，无冲突处理 |
| **mcp-memory-keeper** | 编码助手记忆 | 通用记忆，非结构化决策 |
| **Mem0** | AI 记忆平台 | 商业服务，非本地 MCP |
| **Pieces MCP** | 长期记忆 | 侧重历史，非决策聚合 |

### 3.3 技术借鉴

| 技术 | 来源 | 可借鉴点 |
|------|------|----------|
| **LLMLingua** | Microsoft | Prompt 压缩算法（但我们不压缩，而是结构化） |
| **Context Compaction** | Factory.ai | 上下文精简策略 |
| **ADR (Architecture Decision Records)** | 软件工程实践 | 决策记录格式 |

### 3.4 核心差异化

```
Decision Keeper 的独特价值：
✅ 自动捕获对话中的决策（vs 手动录入）
✅ 决策分类 + 冲突处理（vs 纯文本存储）
✅ 智能上下文恢复（vs 全量注入）
✅ 跨工具共享（vs 工具绑定）
```

---

## 4. 实施建议

### 4.1 开发优先级

**Phase 1（MVP）**：
- [ ] 决策识别器（基于 LLM）
- [ ] 持久化存储（JSON 文件）
- [ ] 决策聚合器（基本冲突处理）
- [ ] MCP Tools 接口（手动记录 + 查询）

**Phase 2（增强）**：
- [ ] 上下文恢复器（相关性过滤）
- [ ] 快照管理（版本控制）
- [ ] SQLite 存储（大型项目）

**Phase 3（生态）**：
- [ ] 可视化界面（决策演化图）
- [ ] 跨项目决策复用
- [ ] 团队协作（共享决策库）

### 4.2 风险与挑战

| 风险 | 缓解措施 |
|------|----------|
| **LLM 识别准确率** | 提供手动录入兜底 + 用户确认机制 |
| **存储容量** | 定期清理过时决策 + 归档机制 |
| **隐私问题** | 本地存储 + 敏感信息过滤 |
| **性能问题** | 异步处理 + 增量更新 |

### 4.3 成功指标

- **功能指标**：决策识别准确率 > 85%
- **性能指标**：上下文恢复 < 1 秒
- **用户指标**：减少 90% 的"需求偏移"问题

---

## 5. 附录

### 5.1 术语表

| 术语 | 英文 | 定义 |
|------|------|------|
| 决策 | Decision | 影响软件开发产物的任何确定性陈述 |
| 语义偏差 | Semantic Drift | 上下文丢失导致的意图偏离 |
| 决策聚合 | Decision Aggregation | 将决策序列合并为当前有效集 |
| 上下文恢复 | Context Recovery | 在新会话中重建必要的决策状态 |

### 5.2 参考资料

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [ADR 实践指南](https://adr.github.io/)
- [Context Engineering for LLM Agents](https://blog.langchain.com/context-engineering-for-llm-agents/)

---

**文档版本**：v1.0
**生成时间**：2025-11-18
**作者**：Claude Code
**状态**：待评审

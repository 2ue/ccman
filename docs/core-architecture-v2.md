# ccman Core 架构设计 v2.0

## 🎯 设计目标

基于Linus的"好品味"原则，重构core层以支持：

1. **统一的对外API** - CLI和Desktop通过统一接口调用
2. **可扩展性** - 轻松添加新工具（ccman、cursor等）
3. **零破坏性** - 保留每个工具的原始配置结构
4. **简洁性** - 消除特殊情况，减少if/else分支

## 📊 现状分析

### 当前架构（已有）

```
packages/core/src/
├── tool-manager.ts         # ✅ 工厂模式 + 数据驱动（TOOL_CONFIGS）
├── tool-manager.types.ts   # ✅ 统一的ToolManager接口
├── writers/                # ✅ 各工具的写入函数
│   ├── codex.ts
│   ├── claude.ts
│   ├── gemini.ts
│   └── mcp.ts
├── presets/                # ✅ 内置预设
└── sync/                   # ✅ WebDAV同步
```

### 问题分析

| 问题 | 现状 | 影响 |
|------|------|------|
| **缺少统一API** | CLI/Desktop直接调用`createCodexManager().add()` | 调用分散，无法统一管理 |
| **缺少Tool Registry** | 每次都创建新的Manager实例 | 无法获取工具列表、工具信息 |
| **缺少基本信息API** | 版本、环境信息分散 | 无统一的元数据接口 |
| **配置文件获取复杂** | 需要知道每个工具的路径 | CLI/Desktop需要硬编码路径 |

### 用户需求（核心洞察）

用户发现了一个**关键模式**：

> "tools下的所有工具都可以抽象成：配置（读取，修改），服务商（列表，增，删，改，应用等），mcp（列表，增，删，改，应用等）"

这意味着：
- ✅ 所有工具的操作是统一的（服务商CRUD、MCP CRUD、配置读写）
- ✅ 不同的只是配置格式和路径
- ✅ **需要一个统一的API层**，而不是重构ToolManager

## 🏗️ 新架构设计

### 三层架构

```
┌─────────────────────────────────────────────────┐
│         Layer 1: Unified Public API              │  ← CLI/Desktop调用
│  (版本、环境、工具列表、服务商CRUD、MCP CRUD)      │
├─────────────────────────────────────────────────┤
│         Layer 2: Tool Registry                   │  ← 工具注册和管理
│  (管理所有ToolManager实例，提供工具查找)          │
├─────────────────────────────────────────────────┤
│         Layer 3: Tool Managers (已有)            │  ← 各工具的CRUD实现
│  (createCodexManager, createClaudeManager, ...)  │
└─────────────────────────────────────────────────┘
```

### 核心组件

#### 1. Tool Registry（新增）

**职责**：
- 管理所有工具的ToolManager实例
- 提供工具查找和验证
- 提供工具元数据（名称、类型、描述等）

**接口设计**：

```typescript
// packages/core/src/registry.ts

import type { ToolType } from '@ccman/types'
import type { ToolManager } from './tool-manager.types.js'

/**
 * 工具元数据
 */
export interface ToolMetadata {
  type: ToolType
  name: string
  shortName: string  // 简称（cc, cx, gc等）
  description: string
  configPath: string
  hasProvider: boolean  // 是否支持服务商管理
  hasMcp: boolean       // 是否支持MCP管理
}

/**
 * Tool Registry - 工具注册表
 * 单例模式，全局唯一
 */
class ToolRegistry {
  private managers: Map<ToolType, ToolManager> = new Map()
  private metadata: Map<ToolType, ToolMetadata> = new Map()

  /**
   * 注册工具
   */
  register(
    type: ToolType,
    manager: ToolManager,
    metadata: ToolMetadata
  ): void

  /**
   * 获取工具管理器
   */
  getManager(type: ToolType): ToolManager

  /**
   * 获取所有工具类型
   */
  listTools(): ToolType[]

  /**
   * 获取工具元数据
   */
  getMetadata(type: ToolType): ToolMetadata

  /**
   * 检查工具是否已注册
   */
  has(type: ToolType): boolean

  /**
   * 通过简称查找工具
   */
  findByShortName(shortName: string): ToolType | undefined
}

// 全局唯一实例
export const toolRegistry = new ToolRegistry()
```

#### 2. Unified Public API（新增）

**职责**：
- 提供统一的对外接口
- 参数验证和错误处理
- 调用Tool Registry和ToolManager

**接口设计**：

```typescript
// packages/core/src/api.ts

import type { ToolType, Provider, AddProviderInput, EditProviderInput } from '@ccman/types'

// ========================================
// 0. 基本信息
// ========================================

/**
 * 获取ccman版本
 */
export function getVersion(): string

/**
 * 获取运行环境
 */
export function getEnvironment(): 'development' | 'production' | 'test'

/**
 * 获取ccman配置目录
 */
export function getCcmanDir(): string

// ========================================
// 1. 工具管理
// ========================================

/**
 * 获取所有已注册的工具类型
 */
export function listTools(): ToolType[]

/**
 * 获取工具信息
 */
export function getToolInfo(tool: ToolType): ToolMetadata

/**
 * 通过简称查找工具
 * @example findToolByShortName('cc') => 'claude'
 */
export function findToolByShortName(shortName: string): ToolType | undefined

// ========================================
// 2. 配置文件操作
// ========================================

/**
 * 获取工具配置文件路径
 */
export function getConfigPath(tool: ToolType): string

/**
 * 获取工具配置文件内容
 */
export function getConfigContent(tool: ToolType): unknown

/**
 * 获取工具原始配置路径（如 ~/.codex/config.toml）
 */
export function getToolConfigPath(tool: ToolType): string

// ========================================
// 3. 服务商管理
// ========================================

/**
 * 列出工具的所有服务商
 */
export function listProviders(tool: ToolType): Provider[]

/**
 * 添加服务商
 */
export function addProvider(tool: ToolType, input: AddProviderInput): Provider

/**
 * 获取服务商详情
 */
export function getProvider(tool: ToolType, id: string): Provider

/**
 * 通过名称查找服务商
 */
export function findProviderByName(tool: ToolType, name: string): Provider | undefined

/**
 * 编辑服务商
 */
export function editProvider(
  tool: ToolType,
  id: string,
  updates: EditProviderInput
): Provider

/**
 * 删除服务商
 */
export function removeProvider(tool: ToolType, id: string): void

/**
 * 克隆服务商
 */
export function cloneProvider(
  tool: ToolType,
  sourceId: string,
  newName: string
): Provider

/**
 * 应用服务商（切换到指定服务商）
 */
export function applyProvider(tool: ToolType, id: string): void

/**
 * 获取当前激活的服务商
 */
export function getCurrentProvider(tool: ToolType): Provider | null

// ========================================
// 4. MCP管理（仅支持MCP工具）
// ========================================

/**
 * 列出MCP服务器
 */
export function listMcps(): Provider[]

/**
 * 添加MCP服务器
 */
export function addMcp(input: AddProviderInput): Provider

/**
 * 编辑MCP服务器
 */
export function editMcp(id: string, updates: EditProviderInput): Provider

/**
 * 删除MCP服务器
 */
export function removeMcp(id: string): void

/**
 * 为指定应用启用/禁用MCP服务器
 */
export function toggleMcpForApp(
  mcpId: string,
  app: 'claude' | 'codex' | 'gemini',
  enabled: boolean
): void

/**
 * 获取MCP服务器在各应用中的启用状态
 */
export function getMcpAppStatus(mcpId: string): {
  claude: boolean
  codex: boolean
  gemini: boolean
}

// ========================================
// 5. 预设管理
// ========================================

/**
 * 列出工具的所有预设（内置 + 用户）
 */
export function listPresets(tool: ToolType): PresetTemplate[]

/**
 * 添加用户自定义预设
 */
export function addPreset(tool: ToolType, input: AddPresetInput): PresetTemplate

/**
 * 编辑用户自定义预设
 */
export function editPreset(
  tool: ToolType,
  name: string,
  updates: EditPresetInput
): PresetTemplate

/**
 * 删除用户自定义预设
 */
export function removePreset(tool: ToolType, name: string): void

// ========================================
// 6. WebDAV同步（保留现有API）
// ========================================

export { uploadToCloud, downloadFromCloud, mergeSync } from './sync/sync-v2.js'
export { testWebDAVConnection } from './sync/webdav-client.js'
export type { SyncConfig, SyncData } from './sync/types.js'

// ========================================
// 7. 配置导入导出（保留现有API）
// ========================================

export {
  exportConfig,
  importConfig,
  validateExport,
  validateImportDir,
  type ExportResult,
  type ImportResult,
} from './export.js'

// ========================================
// 8. Claude清理功能（保留现有API）
// ========================================

export {
  analyzeClaudeJson,
  cleanClaudeJson,
  CleanPresets,
  type CleanOptions,
  type CleanResult,
  type AnalyzeResult,
} from './claude-clean.js'
```

#### 3. Tool Managers（保留现有）

**现有的ToolManager已经很好了，只需要小幅调整：**

```typescript
// packages/core/src/tool-manager.ts

// ✅ 保留现有的TOOL_CONFIGS数据驱动设计
// ✅ 保留现有的createToolManager工厂函数
// ✅ 保留现有的ToolManager接口

// 新增：在模块初始化时自动注册到Registry
import { toolRegistry } from './registry.js'
import { getCodexConfigPath, getClaudeConfigPath, ... } from './paths.js'

// 自动注册所有工具
toolRegistry.register('codex', createCodexManager(), {
  type: 'codex',
  name: 'Codex',
  shortName: 'cx',
  description: 'Codex AI code editor',
  configPath: getCodexConfigPath(),
  hasProvider: true,
  hasMcp: false,
})

toolRegistry.register('claude', createClaudeManager(), {
  type: 'claude',
  name: 'Claude Code',
  shortName: 'cc',
  description: 'Claude AI coding assistant',
  configPath: getClaudeConfigPath(),
  hasProvider: true,
  hasMcp: false,
})

toolRegistry.register('mcp', createMCPManager(), {
  type: 'mcp',
  name: 'MCP',
  shortName: 'mcp',
  description: 'Model Context Protocol servers',
  configPath: getMCPConfigPath(),
  hasProvider: true,
  hasMcp: true,
})

toolRegistry.register('gemini', createGeminiManager(), {
  type: 'gemini',
  name: 'Gemini CLI',
  shortName: 'gc',
  description: 'Google Gemini CLI tool',
  configPath: getGeminiSettingsPath(),
  hasProvider: true,
  hasMcp: false,
})
```

### 新增工具流程（ccman自身）

**添加ccman工具只需要3步：**

```typescript
// 1. 添加writer（~50行）
// packages/core/src/writers/ccman.ts
export function writeCcmanConfig(provider: Provider): void {
  // 实现ccman自身的配置写入逻辑
}

// 2. 添加预设（~10行）
// packages/core/src/presets/ccman.ts
export const CCMAN_PRESETS: InternalPresetTemplate[] = [
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', description: '...' },
  // ...
]

// 3. 在TOOL_CONFIGS中添加配置（~5行）
// packages/core/src/tool-manager.ts
const TOOL_CONFIGS: Record<ToolType, ToolConfigMapping> = {
  // ... 现有配置
  ccman: {
    configPath: path.join(getCcmanDir(), 'ccman.json'),
    builtinPresets: CCMAN_PRESETS,
    writer: writeCcmanConfig,
  },
}

// 4. 在Registry中注册（~8行）
toolRegistry.register('ccman', createToolManager('ccman'), {
  type: 'ccman',
  name: 'ccman',
  shortName: 'cm',
  description: 'ccman configuration',
  configPath: path.join(getCcmanDir(), 'ccman.json'),
  hasProvider: true,
  hasMcp: false,
})
```

**总成本：~73行代码**

## 📂 文件结构

```
packages/core/src/
├── api.ts                  # ✨ 新增：统一的对外API
├── registry.ts             # ✨ 新增：工具注册表
├── tool-manager.ts         # ✅ 保留：工厂函数 + TOOL_CONFIGS
├── tool-manager.types.ts   # ✅ 保留：ToolManager接口
├── types/                  # ✨ 新增：类型定义集中管理
│   ├── index.ts            # 导出所有类型
│   ├── common.ts           # 通用类型（Provider, MCP等）
│   ├── tool.ts             # 工具相关类型
│   └── api.ts              # API相关类型
├── tools/                  # ✨ 新增：按工具组织（可选）
│   ├── codex/
│   │   ├── writer.ts       # = writers/codex.ts
│   │   └── presets.ts      # = presets/codex.ts
│   ├── claude/
│   ├── gemini/
│   ├── mcp/
│   └── ccman/              # ✨ 新工具
├── writers/                # ✅ 保留（或移至tools/）
├── presets/                # ✅ 保留（或移至tools/）
├── sync/                   # ✅ 保留
├── utils/                  # ✅ 保留
├── config.ts               # ✅ 保留
├── paths.ts                # ✅ 保留
├── constants.ts            # ✅ 保留
├── export.ts               # ✅ 保留
├── migrate.ts              # ✅ 保留
├── claude-clean.ts         # ✅ 保留
└── index.ts                # ✅ 修改：导出api.ts的统一接口
```

## 🔄 数据流

### 调用流程

```
CLI/Desktop
    ↓ 调用统一API
api.ts (addProvider('codex', {...}))
    ↓ 参数验证
registry.ts (getManager('codex'))
    ↓ 获取Manager
tool-manager.ts (manager.add({...}))
    ↓ CRUD操作
writers/codex.ts (writeCodexConfig(provider))
    ↓ 写入配置
File System (~/.codex/config.toml)
```

### 示例：添加服务商

```typescript
// CLI调用
ccman add codex --name "OpenRouter" --baseUrl "https://openrouter.ai/api/v1"

    ↓

// CLI层转换为API调用
import { addProvider } from '@ccman/core'

addProvider('codex', {
  name: 'OpenRouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: 'sk-xxx',
})

    ↓

// api.ts: 参数验证
export function addProvider(tool: ToolType, input: AddProviderInput): Provider {
  const manager = toolRegistry.getManager(tool)  // 获取Manager
  return manager.add(input)                      // 调用CRUD
}

    ↓

// tool-manager.ts: CRUD实现
add(input: AddProviderInput): Provider {
  const config = loadConfig()
  const provider = { id: generateId(), ...input, createdAt: Date.now() }
  config.providers.push(provider)
  saveConfig(config)
  toolConfig.writer(provider)  // 调用writer
  return provider
}

    ↓

// writers/codex.ts: 写入配置
export function writeCodexConfig(provider: Provider): void {
  const configPath = getCodexConfigPath()
  const config = TOML.parse(fs.readFileSync(configPath, 'utf-8'))

  // 零破坏性写入
  config.model_provider = provider.name
  config.model_providers[provider.name] = {
    provider_type: 'anthropic',
    base_url: provider.baseUrl,
    api_key: provider.apiKey,
  }

  fs.writeFileSync(configPath, TOML.stringify(config))
}
```

## 🎨 设计原则验证

### ✅ Linus的三个问题

1. **这是个真问题还是臆想出来的？**
   - ✅ 真问题：已有4个工具，用户需要添加第5个（ccman自身）
   - ✅ 真问题：CLI/Desktop需要统一的调用接口

2. **有更简单的方法吗？**
   - ✅ 最简方案：只添加2个文件（api.ts, registry.ts），不修改现有ToolManager
   - ✅ 数据驱动：利用现有的TOOL_CONFIGS，不增加if/else

3. **会破坏什么吗？**
   - ✅ 零破坏：现有的ToolManager API完全保留
   - ✅ 向后兼容：`createCodexManager().add()`依然可用
   - ✅ 新API是**增量**，不是替换

### ✅ CLAUDE.md核心原则

1. **简洁至上**
   - ✅ api.ts每个函数 < 10行（只做参数验证和转发）
   - ✅ registry.ts整个文件 < 150行
   - ✅ 添加新工具只需 ~73行代码

2. **数据结构优先**
   - ✅ 利用现有的TOOL_CONFIGS数据驱动设计
   - ✅ ToolMetadata清晰定义工具元数据

3. **零破坏性**
   - ✅ 只添加新文件，不修改现有逻辑
   - ✅ 现有API完全保留

4. **实用主义**
   - ✅ 解决真实问题：统一API、工具元数据、扩展性
   - ✅ 不过度设计：只添加必要的抽象

5. **直接硬编码**
   - ✅ 每个工具的writer依然是硬编码的
   - ✅ Registry只是管理实例，不引入复杂的抽象

## 🚀 实施计划

### Phase 1: 核心基础（1周）

- [ ] 实现`registry.ts`（Tool Registry）
- [ ] 实现`api.ts`（统一的对外API）
- [ ] 修改`tool-manager.ts`（自动注册到Registry）
- [ ] 修改`index.ts`（导出统一API）
- [ ] 编写单元测试

### Phase 2: CLI/Desktop适配（1周）

- [ ] 修改CLI：使用统一API（`addProvider`等）
- [ ] 修改Desktop：使用统一API
- [ ] 测试所有功能

### Phase 3: 添加新工具（1周）

- [ ] 添加ccman工具支持
- [ ] 实现`writers/ccman.ts`
- [ ] 添加CCMAN_PRESETS
- [ ] 在Registry中注册
- [ ] 测试

### Phase 4: 文档和发布（1周）

- [ ] 更新API文档
- [ ] 更新CLAUDE.md
- [ ] 更新技术架构文档
- [ ] 发布v3.0.0

## 📊 代码量估算

| 模块 | 行数 | 说明 |
|------|------|------|
| registry.ts | ~150 | Tool Registry实现 |
| api.ts | ~200 | 统一API（每个函数5-10行） |
| 修改tool-manager.ts | +30 | 自动注册逻辑 |
| 修改index.ts | +20 | 导出新API |
| **总计** | **~400** | 新增代码量 |

添加新工具（如ccman）：
- writer: ~50行
- presets: ~10行
- 配置: ~5行
- 注册: ~8行
- **总计**: **~73行/工具**

## 🎯 关键优势

### 对比旧方案

| 维度 | 旧方案 | 新方案 |
|------|--------|--------|
| **API调用** | `createCodexManager().add()` | `addProvider('codex', ...)` |
| **工具列表** | 无法获取 | `listTools()` |
| **工具信息** | 无法获取 | `getToolInfo('codex')` |
| **配置路径** | 需要硬编码 | `getConfigPath('codex')` |
| **添加新工具** | ~73行 | ~73行（不变） |
| **代码复杂度** | 分散 | 统一 |

### 对比企业级框架

| 维度 | 企业级框架 | ccman v2 |
|------|------------|----------|
| **接口抽象** | interface + 多层继承 | 数据驱动 + 函数式 |
| **依赖注入** | IoC容器 | 直接注册 |
| **代码量** | 2000+行 | ~400行 |
| **复杂度** | 高（学习成本大） | 低（一目了然） |

## 🔧 迁移指南

### CLI迁移

**Before:**
```typescript
import { createCodexManager } from '@ccman/core'

const manager = createCodexManager()
const provider = manager.add({ name: 'OpenRouter', ... })
```

**After:**
```typescript
import { addProvider } from '@ccman/core'

const provider = addProvider('codex', { name: 'OpenRouter', ... })
```

### Desktop迁移

**Before:**
```typescript
import { createCodexManager, createClaudeManager } from '@ccman/core'

const codexManager = createCodexManager()
const claudeManager = createClaudeManager()

const codexProviders = codexManager.list()
const claudeProviders = claudeManager.list()
```

**After:**
```typescript
import { listProviders, listTools } from '@ccman/core'

const tools = listTools()  // ['codex', 'claude', 'mcp', 'gemini']
const codexProviders = listProviders('codex')
const claudeProviders = listProviders('claude')

// 或者遍历所有工具
const allProviders = tools.map(tool => ({
  tool,
  providers: listProviders(tool)
}))
```

## 📝 总结

### 核心思想

1. **不是重构ToolManager** - 现有的ToolManager已经很好了
2. **添加统一API层** - 在ToolManager之上添加api.ts和registry.ts
3. **数据驱动** - 利用现有的TOOL_CONFIGS，不增加if/else
4. **零破坏性** - 完全向后兼容，只是增量添加

### Linus会怎么评价？

> "Good! You didn't rewrite everything. You just added what was needed. The data structure (TOOL_CONFIGS) was already right, so the code naturally became simple. This is good taste."

> "好！你没有重写所有东西。你只是添加了需要的部分。数据结构（TOOL_CONFIGS）已经是正确的，所以代码自然就变简单了。这就是好品味。"

---

**版本**: v2.0
**作者**: ccman team
**日期**: 2025-12-06

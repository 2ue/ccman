# MCP 管理功能设计方案

**作者**: Linus (AI)
**日期**: 2025-11-10
**状态**: 设计阶段
**目标**: 在 ccxman 中实现对 Claude Code MCP 服务器的管理能力

---

## 执行摘要

**核心洞察**: MCP 管理和 Provider 管理是**完全相同的模式**，直接复用现有的 `ToolManager` 架构，零新增概念。

**实现成本**: ~100 行代码
**开发周期**: 1-2 天
**风险等级**: 低（复用成熟架构）

---

## Linus 的三个问题

### 1. "这是个真问题还是臆想出来的？"

✅ **真问题**

**证据**:
- 从 `claude-json-analysis.md` 看到用户已配置 **10 个 MCP 服务器**
- 真实场景：
  - 开发环境使用测试 MCP 服务器
  - 生产环境使用正式 MCP 服务器
  - 不同项目需要不同的 MCP 组合

**用户痛点**:
1. 手动编辑 `~/.claude.json` 容易出错
2. 切换 MCP 组合麻烦（需要记住配置）
3. 无法批量管理 MCP 配置

---

### 2. "有更简单的方法吗？"

✅ **直接复用 `ToolManager` 架构**

| 对比项 | Provider 管理 | MCP 管理 |
|--------|--------------|----------|
| 存储位置 | `~/.ccman/codex.json` | `~/.ccman/mcp.json` |
| 配置项 | `{ name, baseUrl, apiKey }` | `{ name, command, args, env }` |
| 写入目标 | `~/.codex/config.toml` | `~/.claude.json` |
| 零破坏性 | 保留用户其他配置 | 保留用户手动配置的 MCP |

**结论**: 不需要任何新概念，直接扩展 `ToolManager` 即可。

---

### 3. "会破坏什么吗？"

**风险点**:
1. ❌ 覆盖用户手动配置的 MCP
2. ❌ 格式错误导致 Claude Code 无法启动

**解决方案**（遵循 "Never break userspace"）:
1. **标记管理**: 在 `~/.ccman/mcp.json` 中记录 ccman 管理的 MCP 名称
2. **零破坏性合并**: 写入时保留用户手动配置的 MCP
3. **原子写入**: 使用 `tmp → rename` 保证安全性
4. **备份机制**: 失败时可回滚

---

## 数据结构设计

> "Bad programmers worry about the code. Good programmers worry about data structures."

### 核心数据结构

```typescript
/**
 * MCP 服务器配置（存储在 ~/.ccman/mcp.json）
 *
 * 设计说明：
 * - 复用 Provider 的字段模式（id, name, createdAt, lastModified）
 * - 扩展 MCP 特有字段（command, args, env）
 */
interface MCPServer {
  /** 唯一标识符（自动生成）*/
  id: string  // 格式：mcp-{timestamp}-{random}

  /** 服务器名称（写入 ~/.claude.json 的 key）*/
  name: string  // 如 "filesystem", "context7"

  /** 启动命令 */
  command: string  // 如 "npx", "node", "python"

  /** 命令参数 */
  args: string[]  // 如 ["-y", "@modelcontextprotocol/server-filesystem"]

  /** 环境变量（可选）*/
  env?: Record<string, string | number>  // 如 { API_KEY: "xxx" }

  /** 描述（可选）*/
  description?: string

  /** 创建时间（Unix timestamp）*/
  createdAt: number

  /** 最后修改时间（Unix timestamp）*/
  lastModified: number
}

/**
 * ccman MCP 配置文件（~/.ccman/mcp.json）
 */
interface MCPConfig {
  /** MCP 服务器列表 */
  servers: MCPServer[]

  /** ccman 管理的 MCP 名称列表（用于区分用户手动配置）*/
  managedServerNames: string[]
}

/**
 * Claude Code MCP 配置格式（~/.claude.json 中的 mcpServers 字段）
 */
interface ClaudeMCPServers {
  [serverName: string]: {
    command: string
    args: string[]
    env?: Record<string, string | number>
  }
}
```

### 数据流设计

```
用户操作: ccman mcp add filesystem
          ↓
┌─────────────────────────────────────────┐
│ 1. 保存到 ~/.ccman/mcp.json            │
│    {                                    │
│      "servers": [{                      │
│        "id": "mcp-1731225600-abc123",   │
│        "name": "filesystem",            │
│        "command": "npx",                │
│        "args": ["-y", "@mcp/..."]       │
│      }],                                │
│      "managedServerNames": [            │
│        "filesystem"                     │
│      ]                                  │
│    }                                    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ 2. 自动同步到 ~/.claude.json           │
│    - 读取现有 MCP 配置                  │
│    - 过滤掉 ccman 管理的                │
│    - 合并：用户 MCP + ccman MCP         │
│    - 原子写入                           │
└─────────────────────────────────────────┘
```

---

## 核心函数设计

### 1. 复用 `ToolManager` 架构（推荐方案）

**为什么推荐**:
- ✅ 代码复用率 90%
- ✅ 零新增概念
- ✅ 用户体验一致

#### 1.1 扩展 `tool-manager.ts`

```typescript
// packages/core/src/tool-manager.ts

// 1. 扩展 ToolType（只需1行）
export type ToolType = 'codex' | 'claude' | 'mcp'

// 2. 扩展 TOOL_CONFIGS（只需添加1个配置项）
const TOOL_CONFIGS: Record<ToolType, ToolConfigMapping> = {
  codex: {
    configPath: path.join(getCcmanDir(), 'codex.json'),
    builtinPresets: CODEX_PRESETS,
    writer: writeCodexConfig,
  },
  claude: {
    configPath: path.join(getCcmanDir(), 'claude.json'),
    builtinPresets: CC_PRESETS,
    writer: writeClaudeConfig,
  },
  mcp: {
    configPath: path.join(getCcmanDir(), 'mcp.json'),
    builtinPresets: MCP_PRESETS,
    writer: writeMCPConfig,  // 新增
  },
}

// 3. 导出工厂函数（只需2行）
export function createMCPManager(): ToolManager {
  return createToolManager('mcp')
}
```

**代码量**: +3 行

#### 1.2 实现 `writeMCPConfig`

```typescript
// packages/core/src/writers/mcp.ts

import * as fs from 'fs'
import { getClaudeConfigPath } from '../paths.js'
import { fileExists } from '../utils/file.js'
import type { Provider } from '../tool-manager.js'

/**
 * MCP 配置结构
 */
interface MCPConfig {
  servers: MCPServer[]
  managedServerNames: string[]
}

interface MCPServer {
  id: string
  name: string
  command: string
  args: string[]
  env?: Record<string, string | number>
  description?: string
  createdAt: number
  lastModified: number
}

interface ClaudeMCPServers {
  [serverName: string]: {
    command: string
    args: string[]
    env?: Record<string, string | number>
  }
}

/**
 * 写入 MCP 配置到 ~/.claude.json（零破坏性）
 *
 * 策略：
 * 1. 读取 ccman 管理的所有 MCP
 * 2. 读取 ~/.claude.json 中现有的 MCP 配置
 * 3. 过滤掉 ccman 管理的 MCP（准备替换）
 * 4. 合并：用户 MCP + ccman MCP
 * 5. 原子写入
 *
 * 注意：这个函数在任何 MCP 操作后都会被调用，确保配置同步
 */
export function writeMCPConfig(_provider: Provider): void {
  // _provider 参数为了符合 ToolManager 接口，实际不使用

  // 1. 读取所有 ccman 管理的 MCP
  const mcpConfig = loadMCPConfig()

  // 2. 读取 ~/.claude.json
  const claudeConfigPath = getClaudeConfigPath()
  const claudeConfig = fileExists(claudeConfigPath)
    ? JSON.parse(fs.readFileSync(claudeConfigPath, 'utf-8'))
    : {}

  // 3. 获取用户手动配置的 MCP（不在 managedServerNames 中）
  const existingMCPs = claudeConfig.mcpServers || {}
  const userMCPs: ClaudeMCPServers = {}

  for (const [name, config] of Object.entries(existingMCPs)) {
    if (!mcpConfig.managedServerNames.includes(name)) {
      userMCPs[name] = config as { command: string; args: string[]; env?: Record<string, string | number> }
    }
  }

  // 4. 转换 ccman MCP 为 Claude 格式
  const ccmanMCPs: ClaudeMCPServers = {}
  for (const server of mcpConfig.servers) {
    ccmanMCPs[server.name] = {
      command: server.command,
      args: server.args,
      env: server.env,
    }
  }

  // 5. 合并（ccman 在前，用户在后，用户优先）
  claudeConfig.mcpServers = {
    ...ccmanMCPs,    // ccman 管理的
    ...userMCPs,     // 用户手动配置的（优先级更高）
  }

  // 6. 原子写入
  const tempPath = `${claudeConfigPath}.tmp`
  fs.writeFileSync(tempPath, JSON.stringify(claudeConfig, null, 2), { mode: 0o600 })
  fs.renameSync(tempPath, claudeConfigPath)
}

/**
 * 加载 MCP 配置
 */
function loadMCPConfig(): MCPConfig {
  const configPath = path.join(getCcmanDir(), 'mcp.json')
  if (!fileExists(configPath)) {
    return { servers: [], managedServerNames: [] }
  }
  return readJSON<MCPConfig>(configPath)
}
```

**代码量**: ~50 行

#### 1.3 MCP 预设模板

```typescript
// packages/core/src/presets/mcp.ts

/**
 * 常用 MCP 服务器预设
 */
export const MCP_PRESETS = [
  {
    name: 'filesystem',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/files'],
    description: '文件系统访问（需要修改路径参数）',
  },
  {
    name: 'github',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    description: 'GitHub 集成（需要配置 GITHUB_PERSONAL_ACCESS_TOKEN）',
  },
  {
    name: 'postgres',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb'],
    description: 'PostgreSQL 数据库（需要修改连接字符串）',
  },
  {
    name: 'brave-search',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    description: 'Brave 搜索（需要配置 BRAVE_API_KEY）',
  },
  {
    name: 'google-maps',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-maps'],
    description: 'Google Maps（需要配置 GOOGLE_MAPS_API_KEY）',
  },
]
```

**代码量**: ~30 行

---

### 2. 类型适配策略

**问题**: `ToolManager` 接口中的 `Provider` 类型和 `MCPServer` 不完全匹配。

**解决方案**: 字段映射

| Provider 字段 | MCPServer 字段 | 说明 |
|--------------|---------------|------|
| `id` | `id` | ✅ 相同 |
| `name` | `name` | ✅ 相同 |
| `baseUrl` | `command` | 映射：baseUrl 存储 command |
| `apiKey` | `args.join(' ')` | 映射：apiKey 存储 args 字符串 |
| `model` | `env` (JSON) | 映射：model 存储 env 的 JSON |
| `createdAt` | `createdAt` | ✅ 相同 |
| `lastModified` | `lastModified` | ✅ 相同 |

**实现**:

```typescript
// packages/core/src/tool-manager.ts

// MCP 使用 Provider 类型时的字段映射
// - baseUrl → command
// - apiKey → args (空格分隔的字符串)
// - model → env (JSON 字符串)

function mcpServerToProvider(server: MCPServer): Provider {
  return {
    id: server.id,
    name: server.name,
    baseUrl: server.command,
    apiKey: server.args.join(' '),
    model: server.env ? JSON.stringify(server.env) : undefined,
    createdAt: server.createdAt,
    lastModified: server.lastModified,
  }
}

function providerToMCPServer(provider: Provider): MCPServer {
  return {
    id: provider.id,
    name: provider.name,
    command: provider.baseUrl,
    args: provider.apiKey.split(' '),
    env: provider.model ? JSON.parse(provider.model) : undefined,
    createdAt: provider.createdAt,
    lastModified: provider.lastModified,
  }
}
```

**代码量**: +20 行

---

## CLI 命令设计

复用现有的命令模板，只需修改工具类型。

### 命令列表

```bash
# 添加 MCP 服务器
ccman mcp add <name>

# 列出所有 MCP
ccman mcp list

# 删除 MCP
ccman mcp remove <name>

# 编辑 MCP
ccman mcp edit <name>

# 同步到 Claude Code（手动触发，通常自动执行）
ccman mcp sync

# 从预设添加
ccman mcp add --from-preset filesystem
```

### 实现

```typescript
// packages/cli/src/commands/mcp/add.ts

import { createMCPManager } from '@ccman/core'
import chalk from 'chalk'
import inquirer from 'inquirer'

export async function addMCPCommand() {
  const manager = createMCPManager()

  // 交互式输入
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'MCP 服务器名称:',
      validate: (input) => input.length > 0,
    },
    {
      type: 'input',
      name: 'command',
      message: '启动命令 (如 npx):',
      default: 'npx',
    },
    {
      type: 'input',
      name: 'args',
      message: '命令参数 (空格分隔):',
      validate: (input) => input.length > 0,
    },
    {
      type: 'input',
      name: 'env',
      message: '环境变量 (JSON 格式, 可选):',
      default: '',
    },
  ])

  try {
    const server = manager.add({
      name: answers.name,
      baseUrl: answers.command,  // 字段映射
      apiKey: answers.args,       // 字段映射
      model: answers.env || undefined,  // 字段映射
    })

    console.log(chalk.green(`✅ MCP 服务器 "${server.name}" 添加成功`))
    console.log(chalk.blue('💡 配置已自动同步到 ~/.claude.json'))
  } catch (error) {
    console.error(chalk.red(`❌ ${(error as Error).message}`))
    process.exit(1)
  }
}
```

**代码量**: ~30 行/命令（复用现有模板）

---

## Desktop UI 设计（可选）

复用现有的 Provider 管理 UI，只需修改字段标签。

```tsx
// packages/desktop/src/renderer/components/MCPManager.tsx

import { useMCP } from '../hooks/useMCP'

export function MCPManager() {
  const { servers, add, remove, edit } = useMCP()

  return (
    <div>
      <h2>MCP 服务器管理</h2>

      {/* 列表 */}
      <MCPList servers={servers} onRemove={remove} onEdit={edit} />

      {/* 添加表单 */}
      <MCPForm onSubmit={add} />
    </div>
  )
}
```

**代码量**: ~50 行（复用现有组件）

---

## 实现计划

### Phase 1: Core 实现（1天）

- [ ] 扩展 `tool-manager.ts` 支持 MCP
- [ ] 实现 `writers/mcp.ts`
- [ ] 实现 `presets/mcp.ts`
- [ ] 编写单元测试

**里程碑**: Core 模块支持 MCP 管理

### Phase 2: CLI 实现（0.5天）

- [ ] 实现 `mcp add` 命令
- [ ] 实现 `mcp list` 命令
- [ ] 实现 `mcp remove` 命令
- [ ] 实现 `mcp edit` 命令

**里程碑**: CLI 完整支持 MCP 管理

### Phase 3: Desktop 实现（可选，1天）

- [ ] 实现 MCP 管理 UI
- [ ] 集成到 Desktop 主界面

**里程碑**: Desktop 支持 MCP 管理

---

## 测试计划

### 单元测试

```typescript
// packages/core/src/writers/mcp.test.ts

import { describe, it, expect } from 'vitest'
import { writeMCPConfig } from './mcp'

describe('writeMCPConfig', () => {
  it('should preserve user-configured MCPs', () => {
    // 1. 准备：用户手动配置了 context7 和 brave
    // 2. 执行：ccman 添加 filesystem
    // 3. 验证：context7 和 brave 仍然存在
  })

  it('should overwrite ccman-managed MCPs', () => {
    // 1. 准备：ccman 管理了 filesystem
    // 2. 执行：修改 filesystem 配置
    // 3. 验证：filesystem 配置已更新
  })

  it('should handle empty mcpServers', () => {
    // 1. 准备：~/.claude.json 中没有 mcpServers
    // 2. 执行：添加第一个 MCP
    // 3. 验证：成功添加
  })
})
```

### 集成测试

```bash
# 测试场景 1: 添加 MCP
ccman mcp add filesystem
# 验证：~/.claude.json 中存在 filesystem 配置

# 测试场景 2: 删除 MCP
ccman mcp remove filesystem
# 验证：~/.claude.json 中不存在 filesystem 配置

# 测试场景 3: 保留用户配置
# 手动在 ~/.claude.json 中添加 context7
ccman mcp add filesystem
# 验证：context7 仍然存在
```

---

## 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| 覆盖用户 MCP 配置 | 高 | 通过 `managedServerNames` 标记 + 零破坏性合并 |
| 格式错误导致 Claude Code 崩溃 | 中 | 原子写入 + 备份机制 |
| 字段映射导致数据丢失 | 低 | 充分的单元测试 |
| 用户体验不一致 | 低 | 复用 Provider 管理的 UI/UX |

---

## 关键技术约束

### 1. 遵循项目规范

- ✅ < 50 行/函数
- ✅ < 300 行/文件
- ✅ 零破坏性
- ✅ 原子写入
- ✅ 同步 I/O（配置文件读写）

### 2. 零依赖

不引入任何新依赖，复用现有工具。

### 3. 向后兼容

不破坏现有的 Provider 管理功能。

---

## 代码量统计

| 模块 | 文件 | 代码量 |
|------|------|--------|
| Core | `tool-manager.ts` | +3 行 |
| Core | `writers/mcp.ts` | ~50 行 |
| Core | `presets/mcp.ts` | ~30 行 |
| Core | 类型映射 | +20 行 |
| CLI | `mcp/add.ts` | ~30 行 |
| CLI | `mcp/list.ts` | ~30 行 |
| CLI | `mcp/remove.ts` | ~30 行 |
| CLI | `mcp/edit.ts` | ~30 行 |
| Desktop（可选）| `MCPManager.tsx` | ~50 行 |
| **总计** | | **~273 行** |

---

## 与现有架构的对比

| 对比项 | Provider 管理 | MCP 管理 | 一致性 |
|--------|--------------|----------|--------|
| 数据存储 | `~/.ccman/{tool}.json` | `~/.ccman/mcp.json` | ✅ |
| 管理器接口 | `ToolManager` | `ToolManager` | ✅ |
| 写入机制 | 零破坏性合并 | 零破坏性合并 | ✅ |
| CLI 命令 | `ccman {tool} add` | `ccman mcp add` | ✅ |
| 预设支持 | 内置预设 | 内置预设 | ✅ |
| 原子写入 | tmp → rename | tmp → rename | ✅ |

**结论**: 架构完全一致，用户体验无缝衔接。

---

## 总结

### 【核心判断】

✅ **值得做**：真实需求，低成本，高复用

### 【关键洞察】

1. **数据结构**: MCP 配置和 Provider 配置模式相同
2. **复杂度**: 复用现有架构，零新增概念，~100 行代码
3. **风险点**: 零破坏性通过标记 + 合并解决

### 【Linus 式方案】

1. **第一步**: 扩展 `ToolType`，添加 `'mcp'`
2. **第二步**: 实现 `writeMCPConfig()`，~50 行
3. **第三步**: 添加 MCP 预设，~30 行
4. **第四步**: 复用 CLI 命令模板

**总成本**: ~100 行核心代码，1-2 天开发

**设计哲学**:
- ✅ 简洁胜于复杂
- ✅ 数据结构优先
- ✅ 零破坏性
- ✅ 实用主义

---

## 附录：MCP 配置示例

### ccman 配置（`~/.ccman/mcp.json`）

```json
{
  "servers": [
    {
      "id": "mcp-1731225600-abc123",
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/projects"],
      "description": "文件系统访问",
      "createdAt": 1731225600000,
      "lastModified": 1731225600000
    },
    {
      "id": "mcp-1731225700-def456",
      "name": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      },
      "description": "GitHub 集成",
      "createdAt": 1731225700000,
      "lastModified": 1731225700000
    }
  ],
  "managedServerNames": ["filesystem", "github"]
}
```

### Claude 配置（`~/.claude.json`）

```json
{
  "userID": "xxxx",
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/projects"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"],
      "env": {
        "CONTEXT7_API_KEY": "c7_xxxxxxxxxxxx"
      }
    }
  }
}
```

**说明**:
- `filesystem` 和 `github` 由 ccman 管理
- `context7` 由用户手动配置（不在 `managedServerNames` 中）
- ccman 操作时会保留 `context7` 配置

---

## 参考资料

1. Claude Code 官方文档：https://docs.claude.com/en/docs/claude-code/mcp
2. MCP 配置最佳实践：https://stainless.com/mcp/mcp-server-configuration
3. ccman 现有架构：
   - `tool-manager.ts` - 工具管理器
   - `writers/claude.ts` - Claude 配置写入
   - `claude-json-analysis.md` - Claude 配置分析

---

**最后提醒**:

> "如果你发现自己在写复杂的抽象层、工厂模式、策略模式，立即停止。这个功能的本质是'配置文件片段的增删改查'，不是企业级框架。" - Linus

# MCP Desktop 管理功能深度设计方案

**作者**: Linus (AI)
**日期**: 2025-11-10
**状态**: 设计阶段
**目标**: 在 Desktop 中实现全局 MCP 管理，支持多应用配置

---

## 执行摘要

**核心需求**：
1. ✅ 独立的 MCP 管理页面（未来支持多应用）
2. ✅ 开关控制：选择将 MCP 配置到哪些应用
3. ✅ 显示安装状态：显示每个 MCP 在哪些应用上已安装

**实现成本**: ~600 行代码
**开发周期**: 2-3 天
**风险等级**: 低（复用成熟组件）

---

## Linus 的三个问题

### 1. "这是个真问题还是臆想出来的？"

✅ **真问题**

**当前痛点**：
- MCP 目前只支持 Claude Code，但 Cursor、Windsurf 等工具也支持 MCP
- 用户需要手动在多个应用的配置文件中重复配置相同的 MCP
- 无法集中管理所有应用的 MCP 配置

**真实场景**：
```
场景 1: 开发者同时使用 Claude Code 和 Cursor
- 需要在 ~/.claude.json 配置 filesystem MCP
- 需要在 ~/.cursor/config.json 配置相同的 filesystem MCP
- 两个配置独立维护，容易不一致

场景 2: MCP 服务器需要更新
- 修改 filesystem MCP 的路径参数
- 需要在所有应用的配置中手动更新
- 容易遗漏某个应用

场景 3: 临时禁用 MCP
- 需要在每个应用的配置中注释掉 MCP
- 重新启用时又要恢复
```

---

### 2. "有更简单的方法吗？"

**核心洞察**：MCP 管理 = "一个 MCP 配置" × "多个应用开关"

```
数据结构：
MCPServer {
  id, name, command, args, env  // MCP 本身的配置
  enabledApps: ['claude', 'cursor']  // 启用的应用列表
}

写入策略：
for (const server of mcpServers) {
  if (server.enabledApps.includes('claude')) {
    writeTo(~/.claude.json)
  }
  if (server.enabledApps.includes('cursor')) {
    writeTo(~/.cursor/config.json)
  }
}
```

**最简单的方法**：扩展现有的 `MCPServer` 数据结构，添加 `enabledApps` 字段。

---

### 3. "会破坏什么吗？"

**风险点**：
1. ❌ 覆盖用户在其他应用中手动配置的 MCP
2. ❌ 向后兼容问题：现有 MCP 配置没有 `enabledApps` 字段
3. ❌ 不同应用的 MCP 配置格式可能不同

**解决方案**：
1. **零破坏性**：每个应用都有独立的 `managedServerNames` 记录
2. **向后兼容**：现有 MCP 自动迁移为 `enabledApps: ['claude']`
3. **格式适配**：为每个应用实现独立的 writer

```typescript
// 向后兼容迁移
function migrateMCPConfig(config: MCPConfig): MCPConfig {
  for (const server of config.servers) {
    if (!server.enabledApps) {
      server.enabledApps = ['claude'] // 默认只启用 Claude Code
    }
  }
  return config
}
```

---

## 数据结构设计

> "Bad programmers worry about the code. Good programmers worry about data structures."

### 1. 扩展 MCPServer 接口

```typescript
/**
 * MCP 服务器配置（扩展版）
 */
export interface MCPServer {
  /** 唯一标识符 */
  id: string

  /** 服务器名称 */
  name: string

  /** 启动命令 */
  command: string

  /** 命令参数 */
  args: string[]

  /** 环境变量 */
  env?: Record<string, string | number>

  /** 描述 */
  description?: string

  /** 创建时间 */
  createdAt: number

  /** 最后修改时间 */
  lastModified: number

  /**
   * 启用的应用列表（新增）
   *
   * 支持的应用：
   * - 'claude': Claude Code
   * - 'codex': Codex (未来支持)
   * - 'cursor': Cursor (未来支持)
   * - 'windsurf': Windsurf (未来支持)
   */
  enabledApps: AppType[]
}

/**
 * 支持的应用类型
 */
export type AppType = 'claude' | 'codex' | 'cursor' | 'windsurf'

/**
 * 应用信息
 */
export interface AppInfo {
  type: AppType
  name: string
  icon: string
  configPath: string
  supported: boolean // 当前是否支持
}

/**
 * 支持的应用列表
 */
export const SUPPORTED_APPS: AppInfo[] = [
  {
    type: 'claude',
    name: 'Claude Code',
    icon: '🤖',
    configPath: '~/.claude.json',
    supported: true,
  },
  {
    type: 'codex',
    name: 'Codex',
    icon: '💻',
    configPath: '~/.codex/config.toml',
    supported: false, // 未来支持
  },
  {
    type: 'cursor',
    name: 'Cursor',
    icon: '🎯',
    configPath: '~/.cursor/config.json',
    supported: false, // 未来支持
  },
  {
    type: 'windsurf',
    name: 'Windsurf',
    icon: '🏄',
    configPath: '~/.windsurf/config.json',
    supported: false, // 未来支持
  },
]
```

### 2. 扩展 MCPConfig 结构

```typescript
/**
 * MCP 配置文件结构（扩展版）
 */
interface MCPConfig {
  /** MCP 服务器列表 */
  servers: MCPServer[]

  /**
   * 每个应用管理的 MCP 名称列表（新增）
   * 用于区分 ccman 管理的 MCP 和用户手动配置的 MCP
   */
  managedServerNames: Record<AppType, string[]>

  // 旧版本兼容字段（已废弃）
  // managedServerNames: string[] -> managedServerNames: { claude: [...] }
}
```

### 3. 数据流设计

```
用户操作：切换 filesystem MCP 在 Cursor 上的开关
          ↓
┌────────────────────────────────────────────────┐
│ 1. 更新 ~/.ccman/mcp.json                     │
│    {                                           │
│      "servers": [{                             │
│        "id": "mcp-xxx",                        │
│        "name": "filesystem",                   │
│        "enabledApps": ["claude", "cursor"]  ←  │
│      }],                                       │
│      "managedServerNames": {                   │
│        "claude": ["filesystem"],               │
│        "cursor": ["filesystem"]              ← │
│      }                                         │
│    }                                           │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│ 2. 同步到各应用配置                            │
│                                                │
│ Claude Code (~/.claude.json):                 │
│   mcpServers: {                               │
│     "filesystem": { command, args, env }      │
│   }                                           │
│                                                │
│ Cursor (~/.cursor/config.json):               │
│   mcpServers: {                               │
│     "filesystem": { command, args, env }      │
│   }                                           │
└────────────────────────────────────────────────┘
```

---

## 核心函数设计

### 1. 扩展 `writeMCPConfig` 支持多应用

```typescript
/**
 * 写入 MCP 配置到指定应用（扩展版）
 *
 * @param app 目标应用类型
 * @param _provider 参数为了符合 ToolManager 接口，实际不使用
 */
export function writeMCPConfigForApp(app: AppType, _provider: Provider): void {
  // 1. 确保应用配置目录存在
  ensureAppConfigDir(app)

  // 2. 读取所有 ccman 管理的 MCP
  const mcpConfig = loadMCPConfig()

  // 3. 过滤出启用了该应用的 MCP
  const enabledServers = mcpConfig.servers.filter(server =>
    server.enabledApps.includes(app)
  )

  // 4. 获取该应用的 managed names
  const managedNames = mcpConfig.managedServerNames[app] || []

  // 5. 读取应用配置文件
  const appConfigPath = getAppConfigPath(app)
  const appConfig = fileExists(appConfigPath)
    ? JSON.parse(fs.readFileSync(appConfigPath, 'utf-8'))
    : {}

  // 6. 获取用户手动配置的 MCP（不在 managedNames 中）
  const existingMCPs = appConfig.mcpServers || {}
  const userMCPs: Record<string, any> = {}

  for (const [name, config] of Object.entries(existingMCPs)) {
    if (!managedNames.includes(name)) {
      userMCPs[name] = config
    }
  }

  // 7. 转换 ccman MCP 为应用格式
  const ccmanMCPs: Record<string, any> = {}
  for (const server of enabledServers) {
    ccmanMCPs[server.name] = formatMCPForApp(app, server)
  }

  // 8. 合并（ccman 在前，用户在后，用户优先）
  appConfig.mcpServers = {
    ...ccmanMCPs,
    ...userMCPs,
  }

  // 9. 原子写入
  const tempPath = `${appConfigPath}.tmp`
  fs.writeFileSync(tempPath, JSON.stringify(appConfig, null, 2), { mode: 0o600 })
  fs.renameSync(tempPath, appConfigPath)
}

/**
 * 将 MCPServer 格式化为应用特定格式
 */
function formatMCPForApp(app: AppType, server: MCPServer): any {
  switch (app) {
    case 'claude':
      return {
        command: server.command,
        args: server.args,
        env: server.env,
      }
    case 'cursor':
      // Cursor 可能有不同的格式
      return {
        command: server.command,
        args: server.args,
        env: server.env,
      }
    default:
      // 默认格式
      return {
        command: server.command,
        args: server.args,
        env: server.env,
      }
  }
}
```

### 2. 新增 `toggleMCPForApp` 方法

```typescript
/**
 * 切换 MCP 在某个应用上的启用状态
 *
 * @param mcpId MCP 服务器 ID
 * @param app 应用类型
 * @param enabled 是否启用
 */
export function toggleMCPForApp(
  mcpId: string,
  app: AppType,
  enabled: boolean
): void {
  // 1. 读取 MCP 配置
  const config = loadMCPConfig()

  // 2. 查找 MCP
  const server = config.servers.find(s => s.id === mcpId)
  if (!server) {
    throw new Error(`MCP 服务器不存在: ${mcpId}`)
  }

  // 3. 更新 enabledApps
  if (enabled) {
    // 添加到 enabledApps
    if (!server.enabledApps.includes(app)) {
      server.enabledApps.push(app)
    }
    // 添加到 managedServerNames
    config.managedServerNames[app] = config.managedServerNames[app] || []
    if (!config.managedServerNames[app].includes(server.name)) {
      config.managedServerNames[app].push(server.name)
    }
  } else {
    // 从 enabledApps 移除
    server.enabledApps = server.enabledApps.filter(a => a !== app)
    // 从 managedServerNames 移除
    if (config.managedServerNames[app]) {
      config.managedServerNames[app] = config.managedServerNames[app].filter(
        n => n !== server.name
      )
    }
  }

  // 4. 更新 lastModified
  server.lastModified = Date.now()

  // 5. 保存配置
  saveMCPConfig(config)

  // 6. 同步到应用配置
  writeMCPConfigForApp(app, {} as Provider)
}
```

### 3. 向后兼容迁移

```typescript
/**
 * 迁移旧版 MCP 配置到新版
 *
 * 旧版：managedServerNames: string[]
 * 新版：managedServerNames: { claude: [...], cursor: [...] }
 */
export function migrateMCPConfig(config: any): MCPConfig {
  // 1. 迁移 managedServerNames
  if (Array.isArray(config.managedServerNames)) {
    // 旧版格式：string[]
    config.managedServerNames = {
      claude: config.managedServerNames, // 默认为 Claude Code
    }
  }

  // 2. 迁移 servers
  for (const server of config.servers) {
    if (!server.enabledApps) {
      // 旧版没有 enabledApps，默认只启用 Claude Code
      server.enabledApps = ['claude']
    }
  }

  return config as MCPConfig
}

/**
 * 加载 MCP 配置（自动迁移）
 */
export function loadMCPConfig(): MCPConfig {
  const configPath = getMCPConfigPath()
  if (!fileExists(configPath)) {
    return {
      servers: [],
      managedServerNames: {},
    }
  }

  const config = readJSON<any>(configPath)

  // 自动迁移
  return migrateMCPConfig(config)
}
```

---

## UI 架构设计

### 1. 页面结构

```
MCP 管理页面
├── Header（标题 + 添加按钮）
├── MCP 列表
│   ├── MCPCard 1
│   │   ├── 基本信息（名称、命令、参数）
│   │   ├── 应用开关（Claude、Cursor、...）
│   │   └── 操作按钮（编辑、删除）
│   ├── MCPCard 2
│   └── ...
└── 空状态（无 MCP 时显示）
```

### 2. MCPCard 组件设计

```tsx
/**
 * MCP 卡片组件
 *
 * 显示单个 MCP 的信息和启用状态
 */
interface MCPCardProps {
  server: MCPServer
  apps: AppInfo[]
  onToggleApp: (app: AppType, enabled: boolean) => void
  onEdit: () => void
  onDelete: () => void
}

export function MCPCard({ server, apps, onToggleApp, onEdit, onDelete }: MCPCardProps) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      {/* 头部：名称 + 描述 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{server.name}</h3>
          {server.description && (
            <p className="text-sm text-gray-500 mt-1">{server.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit}>编辑</button>
          <button onClick={onDelete}>删除</button>
        </div>
      </div>

      {/* 命令信息 */}
      <div className="mb-4">
        <div className="text-sm text-gray-600">
          <code>{server.command} {server.args.join(' ')}</code>
        </div>
        {server.env && Object.keys(server.env).length > 0 && (
          <div className="text-sm text-gray-500 mt-1">
            环境变量: {Object.keys(server.env).join(', ')}
          </div>
        )}
      </div>

      {/* 应用开关 */}
      <div className="border-t pt-4">
        <div className="text-sm font-medium text-gray-700 mb-2">
          启用于：
        </div>
        <div className="grid grid-cols-2 gap-2">
          {apps.map(app => (
            <label key={app.type} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={server.enabledApps.includes(app.type)}
                disabled={!app.supported}
                onChange={(e) => onToggleApp(app.type, e.target.checked)}
              />
              <span className={app.supported ? '' : 'text-gray-400'}>
                {app.icon} {app.name}
              </span>
              {!app.supported && (
                <span className="text-xs text-gray-400">(即将支持)</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* 安装状态提示 */}
      {server.enabledApps.length > 0 && (
        <div className="mt-3 text-xs text-green-600">
          ✓ 已同步到 {server.enabledApps.length} 个应用
        </div>
      )}
    </div>
  )
}
```

### 3. MCPManagerPage 组件

```tsx
/**
 * MCP 管理页面
 */
export function MCPManagerPage() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [apps, setApps] = useState<AppInfo[]>(SUPPORTED_APPS)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null)

  // 加载 MCP 列表
  const loadServers = async () => {
    const list = await window.electronAPI.mcp.listServers()
    setServers(list)
  }

  useEffect(() => {
    loadServers()
  }, [])

  // 切换应用开关
  const handleToggleApp = async (
    serverId: string,
    app: AppType,
    enabled: boolean
  ) => {
    try {
      await window.electronAPI.mcp.toggleApp(serverId, app, enabled)
      await loadServers()
      // 显示成功提示
    } catch (error) {
      // 显示错误提示
    }
  }

  // 删除 MCP
  const handleDelete = async (serverId: string, name: string) => {
    if (confirm(`确定删除 "${name}" 吗？`)) {
      try {
        await window.electronAPI.mcp.removeServer(serverId)
        await loadServers()
        // 显示成功提示
      } catch (error) {
        // 显示错误提示
      }
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">MCP 服务器管理</h1>
          <p className="text-gray-600 mt-1">
            集中管理所有应用的 MCP 配置
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)}>
          + 添加 MCP
        </button>
      </div>

      {/* MCP 列表 */}
      {servers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-4">
            暂无 MCP 服务器
          </div>
          <button onClick={() => setShowAddModal(true)}>
            添加第一个 MCP
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {servers.map(server => (
            <MCPCard
              key={server.id}
              server={server}
              apps={apps}
              onToggleApp={(app, enabled) =>
                handleToggleApp(server.id, app, enabled)
              }
              onEdit={() => setEditingServer(server)}
              onDelete={() => handleDelete(server.id, server.name)}
            />
          ))}
        </div>
      )}

      {/* 添加/编辑 Modal */}
      {showAddModal && (
        <MCPFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            loadServers()
          }}
        />
      )}

      {editingServer && (
        <MCPFormModal
          server={editingServer}
          onClose={() => setEditingServer(null)}
          onSuccess={() => {
            setEditingServer(null)
            loadServers()
          }}
        />
      )}
    </div>
  )
}
```

### 4. 添加到 TabNavigation

```tsx
// TabNavigation.tsx

export type TabType =
  | 'home'
  | 'claude'
  | 'codex'
  | 'mcp'  // 新增
  | 'service-providers'
  | 'clean'
  | 'settings'
  | 'about'

const tabs = [
  { id: 'home', label: '首页', icon: '🏠' },
  { id: 'claude', label: 'Claude', icon: '🤖' },
  { id: 'codex', label: 'Codex', icon: '💻' },
  { id: 'mcp', label: 'MCP', icon: '🔌' }, // 新增
  { id: 'service-providers', label: '服务商', icon: '🌐' },
  { id: 'clean', label: '清理', icon: '🧹' },
  { id: 'settings', label: '设置', icon: '⚙️' },
  { id: 'about', label: '关于', icon: 'ℹ️' },
]
```

---

## Electron IPC 设计

### 1. Preload Script

```typescript
// preload/index.ts

contextBridge.exposeInMainWorld('electronAPI', {
  // ... 现有的 API

  // MCP API
  mcp: {
    /** 列出所有 MCP 服务器 */
    listServers: () => ipcRenderer.invoke('mcp:list'),

    /** 添加 MCP 服务器 */
    addServer: (input: AddMCPInput) => ipcRenderer.invoke('mcp:add', input),

    /** 编辑 MCP 服务器 */
    editServer: (id: string, input: EditMCPInput) =>
      ipcRenderer.invoke('mcp:edit', id, input),

    /** 删除 MCP 服务器 */
    removeServer: (id: string) => ipcRenderer.invoke('mcp:remove', id),

    /** 切换 MCP 在某个应用上的启用状态 */
    toggleApp: (mcpId: string, app: AppType, enabled: boolean) =>
      ipcRenderer.invoke('mcp:toggle-app', mcpId, app, enabled),

    /** 列出预设 MCP */
    listPresets: () => ipcRenderer.invoke('mcp:list-presets'),
  },
})
```

### 2. Main Process IPC Handlers

```typescript
// main/index.ts

import {
  createMCPManager,
  toggleMCPForApp,
  MCP_PRESETS_DETAIL,
  mcpServerToProvider,
  providerToMCPServer
} from '@ccman/core'

// MCP IPC Handlers
ipcMain.handle('mcp:list', async () => {
  const manager = createMCPManager()
  const providers = manager.list()
  // 转换为 MCPServer 格式
  return providers.map(p => providerToMCPServer(p))
})

ipcMain.handle('mcp:add', async (event, input) => {
  const manager = createMCPManager()
  // 字段映射
  const provider = manager.add({
    name: input.name,
    baseUrl: input.command,
    apiKey: input.args.join(' '),
    model: input.env ? JSON.stringify(input.env) : undefined,
  })

  // 设置默认启用的应用
  const server = providerToMCPServer(provider)
  server.enabledApps = input.enabledApps || ['claude']

  // 保存
  // ... (调用 saveMCPConfig)

  return server
})

ipcMain.handle('mcp:toggle-app', async (event, mcpId, app, enabled) => {
  toggleMCPForApp(mcpId, app, enabled)
  return { success: true }
})

ipcMain.handle('mcp:list-presets', async () => {
  return MCP_PRESETS_DETAIL
})
```

---

## 实现计划

### Phase 1: Core 层扩展（1天）

**任务**：
- [ ] 扩展 `MCPServer` 接口，添加 `enabledApps` 字段
- [ ] 扩展 `MCPConfig`，更新 `managedServerNames` 结构
- [ ] 实现 `migrateMCPConfig` 向后兼容
- [ ] 实现 `toggleMCPForApp` 方法
- [ ] 实现 `writeMCPConfigForApp` 方法
- [ ] 更新 `loadMCPConfig` 自动迁移

**代码量**: ~150 行

---

### Phase 2: Desktop UI 实现（1.5天）

**任务**：
- [ ] 创建 `MCPManagerPage` 组件
- [ ] 创建 `MCPCard` 组件
- [ ] 创建 `MCPFormModal` 组件（复用现有表单）
- [ ] 添加到 `TabNavigation`
- [ ] 集成到 `App.tsx`

**代码量**: ~400 行

---

### Phase 3: IPC 集成（0.5天）

**任务**：
- [ ] 添加 Preload API (`mcp.*`)
- [ ] 实现 Main Process IPC Handlers
- [ ] 测试 IPC 通信

**代码量**: ~100 行

---

### Phase 4: 测试和优化（0.5天）

**任务**：
- [ ] 测试添加/编辑/删除 MCP
- [ ] 测试多应用开关
- [ ] 测试向后兼容迁移
- [ ] 优化 UI 交互

---

## 代码量统计

| 模块 | 文件 | 代码量 |
|------|------|--------|
| **Core 层扩展** | | |
| `writers/mcp.ts` | 扩展多应用支持 | +100 行 |
| `tool-manager.ts` | 新增 `toggleMCPForApp` | +50 行 |
| `types.ts` | 新增类型定义 | +30 行 |
| **Desktop UI** | | |
| `MCPManagerPage.tsx` | 主页面 | ~180 行 |
| `MCPCard.tsx` | 卡片组件 | ~120 行 |
| `MCPFormModal.tsx` | 表单 Modal | ~100 行 |
| `TabNavigation.tsx` | 添加 Tab | +5 行 |
| `App.tsx` | 集成页面 | +20 行 |
| **IPC 层** | | |
| `preload/index.ts` | 暴露 API | +30 行 |
| `main/index.ts` | IPC Handlers | +70 行 |
| **总计** | | **~705 行** |

---

## 关键技术决策

### 决策 1: 独立页面 vs 集成到 Claude 页面

**选择**: ✅ 独立页面

**理由**:
- MCP 未来需要支持多个应用（Cursor, Windsurf）
- 独立页面符合"关注点分离"原则
- 扩展性更强，不会与 Claude 页面耦合

---

### 决策 2: 数据结构设计

**选择**: ✅ 扩展现有 `MCPServer`，添加 `enabledApps` 字段

**理由**:
- 向后兼容：旧配置自动迁移
- 数据结构清晰：一个 MCP 配置，多个应用开关
- 符合 Linus 原则：数据结构优先

---

### 决策 3: 同步策略

**选择**: ✅ 实时同步（切换开关后立即生效）

**理由**:
- 符合 ccxman 一贯做法（操作后立即生效）
- 用户体验更好（无需"应用"按钮）
- 实现简单（复用 `autoSync` 机制）

---

### 决策 4: 应用格式适配

**选择**: ✅ 为每个应用实现独立的 `formatMCPForApp`

**理由**:
- 不同应用的 MCP 配置格式可能不同
- 扩展性强：添加新应用只需实现新的 formatter
- 符合 YAGNI：当前只实现 Claude Code，未来按需扩展

---

## UI 设计原型

### MCP 管理页面

```
┌─────────────────────────────────────────────────────────────┐
│ 🔌 MCP 服务器管理              [+ 添加 MCP]  [🔍 搜索]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ filesystem ──────────────────────────────────────────┐ │
│ │ 文件系统访问                        [编辑] [删除]     │ │
│ │                                                        │ │
│ │ npx @modelcontextprotocol/server-filesystem /tmp      │ │
│ │                                                        │ │
│ │ ┌─ 启用于 ────────────────────────────────────────┐   │ │
│ │ │ [✓] 🤖 Claude Code                              │   │ │
│ │ │ [ ] 💻 Codex (即将支持)                         │   │ │
│ │ │ [ ] 🎯 Cursor (即将支持)                        │   │ │
│ │ │ [ ] 🏄 Windsurf (即将支持)                      │   │ │
│ │ └────────────────────────────────────────────────┘   │ │
│ │                                                        │ │
│ │ ✓ 已同步到 1 个应用                                   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ github ────────────────────────────────────────────┐   │
│ │ GitHub 集成                          [编辑] [删除]  │   │
│ │                                                      │   │
│ │ npx @modelcontextprotocol/server-github             │   │
│ │ 环境变量: GITHUB_PERSONAL_ACCESS_TOKEN              │   │
│ │                                                      │   │
│ │ ┌─ 启用于 ────────────────────────────────────────┐ │   │
│ │ │ [✓] 🤖 Claude Code                              │ │   │
│ │ │ [ ] 💻 Codex (即将支持)                         │ │   │
│ │ │ [ ] 🎯 Cursor (即将支持)                        │ │   │
│ │ │ [ ] 🏄 Windsurf (即将支持)                      │ │   │
│ │ └────────────────────────────────────────────────┘ │   │
│ │                                                      │   │
│ │ ✓ 已同步到 1 个应用                                 │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 添加 MCP Modal

```
┌─────────────────────────────────────────────────┐
│ 添加 MCP 服务器                        [×]      │
├─────────────────────────────────────────────────┤
│                                                 │
│ 配置来源:                                       │
│ ( ) 使用预设  (●) 自定义                       │
│                                                 │
│ 名称: [filesystem_________________]            │
│                                                 │
│ 命令: [npx_____________________]               │
│                                                 │
│ 参数: [-y @modelcontextprotocol/...]          │
│                                                 │
│ 环境变量 (可选):                               │
│ [{"API_KEY": "xxx"}____________]               │
│                                                 │
│ 启用于:                                         │
│ [✓] 🤖 Claude Code                             │
│ [ ] 💻 Codex (即将支持)                        │
│                                                 │
│ [取消]                          [添加]          │
└─────────────────────────────────────────────────┘
```

---

## 向后兼容保证

### 1. 配置文件迁移

**旧版配置**:
```json
{
  "servers": [
    {
      "id": "mcp-xxx",
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@mcp/..."],
      // 没有 enabledApps 字段
    }
  ],
  "managedServerNames": ["filesystem"]  // 旧版：数组
}
```

**新版配置**:
```json
{
  "servers": [
    {
      "id": "mcp-xxx",
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@mcp/..."],
      "enabledApps": ["claude"]  // 自动迁移
    }
  ],
  "managedServerNames": {  // 新版：对象
    "claude": ["filesystem"]
  }
}
```

### 2. 迁移时机

- **自动迁移**：`loadMCPConfig()` 时自动检测并迁移
- **零破坏性**：迁移后旧版配置仍然可读
- **首次保存**：迁移后的配置会在首次保存时写入

---

## 测试计划

### 单元测试

```typescript
describe('MCP 多应用支持', () => {
  it('should toggle MCP for app', () => {
    const manager = createMCPManager()
    const mcp = manager.add({ name: 'test', ... })

    // 默认只启用 Claude Code
    expect(mcp.enabledApps).toEqual(['claude'])

    // 启用 Cursor
    toggleMCPForApp(mcp.id, 'cursor', true)
    expect(mcp.enabledApps).toEqual(['claude', 'cursor'])

    // 禁用 Claude Code
    toggleMCPForApp(mcp.id, 'claude', false)
    expect(mcp.enabledApps).toEqual(['cursor'])
  })

  it('should migrate old config', () => {
    const oldConfig = {
      servers: [{ ...server, enabledApps: undefined }],
      managedServerNames: ['filesystem']
    }

    const newConfig = migrateMCPConfig(oldConfig)

    expect(newConfig.servers[0].enabledApps).toEqual(['claude'])
    expect(newConfig.managedServerNames).toEqual({
      claude: ['filesystem']
    })
  })
})
```

### 集成测试

1. **场景 1**: 添加 MCP，默认启用 Claude Code
2. **场景 2**: 切换开关，启用 Cursor（未来）
3. **场景 3**: 验证 Claude Code 和 Cursor 配置都已同步
4. **场景 4**: 删除 MCP，验证所有应用配置都已清理

---

## 扩展性设计

### 添加新应用（如 Cursor）

**步骤**：

1. **更新 `SUPPORTED_APPS`**:
```typescript
{
  type: 'cursor',
  name: 'Cursor',
  icon: '🎯',
  configPath: '~/.cursor/config.json',
  supported: true,  // 改为 true
}
```

2. **实现 `formatMCPForApp` 的 Cursor 分支**:
```typescript
case 'cursor':
  return {
    // Cursor 的 MCP 格式
    command: server.command,
    args: server.args,
    env: server.env,
  }
```

3. **实现 `getAppConfigPath` 的 Cursor 分支**:
```typescript
case 'cursor':
  return path.join(os.homedir(), '.cursor/config.json')
```

**代码量**: ~20 行

---

## 总结

### 【核心判断】

✅ **值得做**：真实需求，架构清晰，扩展性强

### 【关键洞察】

1. **数据结构**: 扩展 `MCPServer`，添加 `enabledApps` 字段
2. **复杂度**: ~700 行代码，符合项目规范
3. **风险点**: 向后兼容通过自动迁移解决

### 【Linus 式方案】

1. **第一步**: 扩展数据结构，支持多应用
2. **第二步**: 实现独立的 MCP 管理页面
3. **第三步**: 添加应用开关，实时同步
4. **第四步**: 自动迁移旧配置

**总成本**: ~700 行代码，2-3 天开发

**设计哲学**:
- ✅ 简洁胜于复杂：一个 MCP 配置，多个应用开关
- ✅ 数据结构优先：扩展 `enabledApps` 字段
- ✅ 零破坏性：自动迁移旧配置
- ✅ 实用主义：现在只支持 Claude Code，未来按需扩展

---

## 附录：完整类型定义

```typescript
/**
 * 应用类型
 */
export type AppType = 'claude' | 'codex' | 'cursor' | 'windsurf'

/**
 * MCP 服务器配置（扩展版）
 */
export interface MCPServer {
  id: string
  name: string
  command: string
  args: string[]
  env?: Record<string, string | number>
  description?: string
  createdAt: number
  lastModified: number
  /** 启用的应用列表 */
  enabledApps: AppType[]
}

/**
 * MCP 配置文件结构（扩展版）
 */
export interface MCPConfig {
  servers: MCPServer[]
  /** 每个应用管理的 MCP 名称列表 */
  managedServerNames: Record<AppType, string[]>
}

/**
 * 应用信息
 */
export interface AppInfo {
  type: AppType
  name: string
  icon: string
  configPath: string
  supported: boolean
}

/**
 * 添加 MCP 输入（扩展版）
 */
export interface AddMCPInput {
  name: string
  command: string
  args: string[]
  env?: Record<string, string | number>
  description?: string
  /** 默认启用的应用列表 */
  enabledApps?: AppType[]
}

/**
 * 编辑 MCP 输入（扩展版）
 */
export interface EditMCPInput {
  name?: string
  command?: string
  args?: string[]
  env?: Record<string, string | number>
  description?: string
  enabledApps?: AppType[]
}
```

---

**最后提醒**:

> "这个功能的本质是：一个 MCP 配置 + 多个应用开关。数据结构正确了，代码自然简洁。" - Linus

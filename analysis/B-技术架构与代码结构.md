# B. 技术架构与代码结构(基于源码)

> 本文直接对应仓库中的实际代码结构,所有模块说明都可通过文件路径验证。

## 1. Monorepo 布局与包职责

根目录关键文件:

- `pnpm-workspace.yaml`: 定义 workspace 包含 `packages/core`, `packages/cli`, `packages/desktop`。
- `package.json`: 声明根依赖与脚本(例如构建、测试脚本)。
- `tsconfig.json`: TypeScript 编译基础配置。

三个主包:

1. `packages/core`
   - **职责**: 业务核心 + 配置读写 + 同步 + MCP 管理 + 清理工具。
   - 对外入口: `packages/core/src/index.ts` 导出:
     - ToolManager 工厂: `createCodexManager`, `createClaudeManager`, `createMCPManager`。
     - Writers: MCP 相关写入工具与类型。
     - Sync: `uploadToCloud`, `downloadFromCloud`, `mergeSync`, `testWebDAVConnection` 等。
     - Import/Export: `exportConfig`, `importConfig` 等。
     - Clean: `analyzeClaudeJson`, `cleanClaudeJson` 及细粒度操作。

2. `packages/cli`
   - **职责**: 对终端用户提供命令行入口,但不持有业务逻辑。
   - 通过 `@ccman/core` 调用 Core,避免重复实现。
   - 主入口: `packages/cli/src/index.ts`, 根据命令选择:
     - `cx`: Codex 服务商管理。
     - `cc`: Claude 服务商管理。
     - `mcp`: MCP Server 管理。
     - `sync`: WebDAV 同步。
     - `export` / `import`: 导入导出。

3. `packages/desktop`
   - **职责**: Electron + React 的图形界面,通过 IPC 调用 Core。
   - 层次划分:
     - Main: `src/main/index.ts` 负责窗口、菜单和所有 IPC handler。
     - Preload: `src/preload/index.ts` 把 IPC 封装成 `window.electronAPI`。
     - Renderer: `src/renderer/*` 是 React UI 组件与页面。

这种布局体现了清晰的**单向依赖**:

`Core` ← `CLI`  
`Core` ← `Desktop Main` ← `Desktop Preload` ← `Desktop Renderer`

Core 不依赖 CLI/desktop,保证了业务层的独立性。

## 2. Core: ToolManager + Writers 的分层

### 2.1 ToolManager: 数据驱动的服务商管理

核心文件: `packages/core/src/tool-manager.ts`, `packages/core/src/tool-manager.types.ts`

- ToolType 定义:
  - `type ToolType = 'codex' | 'claude' | 'mcp'`
  - 说明当前代码层面只显式支持这三类工具。

- `TOOL_CONFIGS: Record<ToolType, ToolConfigMapping>`:
  - `codex` 和 `claude`:
    - `configPath`: `~/.ccman/codex.json` / `~/.ccman/claude.json`。
    - `builtinPresets`: 分别来自 `presets/codex.ts`, `presets/claude.ts`。
    - `writer`: 分别是 `writeCodexConfig`, `writeClaudeConfig`。
  - `mcp`:
    - `configPath`: `~/.ccman/mcp.json`。
    - `customLoader`/`customSaver`: 将内部 Provider 数组与 `MCPConfig` 结构互相转换,并维护 `enabledApps`、`managedServerNames` 等字段。

- 工厂函数 `createToolManager(tool: ToolType): ToolManager`:
  - 封装统一接口:
    - `list()`, `get(id)`, `getCurrent()`。
    - `add(input)`, `edit(id, updates)`, `remove(id)`, `switch(id)`。
    - 预设管理: `listPresets()`, `addPreset()`, `editPreset()`, `removePreset()`。
  - 典型调用路径(以 Codex 为例):
    - CLI: `createCodexManager()` → `manager.add({...})` → 写入 `~/.ccman/codex.json` → 调用 `writeCodexConfig()` 更新 `~/.codex/*`。
    - Desktop: Main 进程中同样通过 `createCodexManager()` 完成上述逻辑。

**关键事实**:

- 所有服务商的增删改查以及“当前服务商”概念都在 Core 层统一实现,UI 只是调用方。
- MCP 虽然使用不同的底层配置结构,但在 ToolManager 层表现为普通 Provider,通过 customLoader/customSaver 适配。

### 2.2 Writers: 外部工具配置写入

示例 1: `packages/core/src/writers/codex.ts`

- 读写文件:
  - `config.toml`: 使用 `@iarna/toml` parse/stringify。
  - `auth.json`: 使用 JSON 读写。
- “零破坏性”策略(可以从代码看出):
  - 读取旧配置 → 使用 `deepMerge` 将 `CODEX_DEFAULT_CONFIG` 与用户配置合并(用户配置优先)。
  - 只定向修改:
    - `model_provider` = provider.name
    - `model` = provider.model 或默认值。
    - `model_providers[provider.name] = { name, base_url, wire_api, requires_openai_auth }`
  - 其它未知字段全部保留([key: string]: unknown)。

示例 2: `packages/core/src/writers/claude.ts`

- 读写文件:
  - `settings.json`: JSON 读写。
- 写入逻辑:
  - 利用 `CLAUDE_CONFIG_TEMPLATE` + `replaceVariables` 根据 provider 的 `apiKey`/`baseUrl` 生成默认配置。
  - 使用 `deepMerge` 将默认配置与用户现有配置合并(用户配置优先)。
  - 强制覆盖:
    - `env.ANTHROPIC_AUTH_TOKEN = provider.apiKey`
    - `env.ANTHROPIC_BASE_URL = provider.baseUrl`

示例 3: `packages/core/src/writers/mcp.ts`(略)

- 管理 `MCPConfig` 结构,包括:
  - `servers: MCPServer[]` 列表。
  - `managedServerNames: Record<AppType, string[]>`.
  - `enabledApps: AppType[]`。
- 在 customSaver 中根据 providers 列表更新 `servers` 与 `managedServerNames`,确保各应用(MCP 使用方)的启用状态一致。

## 3. Core: Sync/WebDAV、Config、Clean 等子模块

### 3.1 WebDAV 同步

核心文件: `packages/core/src/sync/sync-v2.ts`

- 三种模式:
  - `uploadToCloud(config, password)`:
    - 读取 `~/.ccman/codex.json`/`claude.json`。
    - 使用 `encryptProviders` 加密 `providers` 中的 API Key。
    - 将新的配置 JSON 上传到 WebDAV。
  - `downloadFromCloud(config, password)`:
    - 从 WebDAV 下载配置 → 解密 `providers` → 备份本地配置 → 覆盖写回本地。
    - 调用 `applyCurrentProvider` 自动将当前 provider 写回 Codex/Claude 官方配置。
  - `mergeSync(config, password)`:
    - 下载并解密远端配置 → 使用 `mergeProviders`/`mergePresets` 与本地合并 → 写回本地 → 再次加密后上传远端。
    - 同样在本地应用当前 provider 到官方工具。

- 环境敏感路径:
  - `getCcmanDir()` 在开发/测试环境指向临时目录,生产环境指向 `homedir()/.ccman`。

### 3.2 统一配置管理

文件: `packages/core/src/config.ts`

- 定义 `CcmanConfig` 结构,目前只包含 `sync` 字段。
- 提供:
  - `loadConfig` / `saveConfig`: 原子写入、目录权限 0700/0600。
  - `getSyncConfig` / `saveSyncConfig` / `deleteSyncConfig` / `updateLastSyncTime`。

### 3.3 ~/.claude.json 清理

文件: `packages/core/src/claude-clean.ts`

- 能力:
  - 分析: `analyzeClaudeJson()` 计算项目个数、总历史条数、估计空间占用和不同清理策略的节省空间。
  - 清理: `cleanClaudeJson(options)` 根据 `CleanOptions` 清理项目历史/缓存/统计,并做备份。
  - 细粒度操作:
    - 项目级: `getProjectDetails`, `deleteProjectHistory`, `getProjectHistory`, `clearProjectHistory`。
    - 缓存级: `getCacheDetails`, `deleteCacheItem`。
    - 历史条目级: `deleteHistoryEntry`.

这些函数都是纯 Node 文件操作,不依赖 UI 层,因此既可以服务 Desktop,也为未来 CLI 命令扩展留出了空间。

## 4. CLI: 命令分解与交互式菜单

### 4.1 顶层入口

文件: `packages/cli/src/index.ts`

- 使用 `commander` 定义:
  - `ccman cx ...`: 调用 `createCodexCommands`。
  - `ccman cc ...`: 调用 `createClaudeCommands`。
  - `ccman mcp ...`: MCP 管理。
  - `ccman sync ...`: WebDAV 同步。
  - `ccman export` / `ccman import`: 导入导出。
- 当不带任何参数时:
  - 调用 `startMainMenu()` 进入交互式主菜单。

### 4.2 交互式菜单

文件: `packages/cli/src/interactive.ts`

- 主菜单 `startMainMenu()`:
  - `Claude 管理` → `startClaudeMenu()` → `showToolMenu('claude')`。
  - `Codex 管理` → `startCodexMenu()` → `showToolMenu('codex')`。
  - `WebDAV 同步` → 动态导入 sync 子命令 → `startSyncMenu()`。
  - `预置服务商管理` → 当前打印“即将推出”,尚未实现。

- 工具菜单 `showToolMenu(tool)`:
  - 直接调用 ToolManager 方法:
    - `handleAdd` → `manager.add(...)`。
    - `handleSwitch` → `manager.switch(...)`。
    - `handleList` → `manager.list()`。
    - `handleCurrent` → `manager.getCurrent()`。

### 4.3 sync/mcp/export/import 等子命令

- sync: `packages/cli/src/commands/sync/*`
  - 各子命令通过 `@ccman/core` 暴露的 Sync API 调用 Core,例如:
    - `testCommand` → `testWebDAVConnection`。
    - `uploadCommand` → `uploadToCloud`。
    - `mergeCommand` → `mergeSync`。
- mcp: `packages/cli/src/commands/mcp/*`
  - 使用 `createMCPManager()` + `writers/mcp.ts` 的逻辑管理 MCP Servers。
- export/import:
  - 使用 `exportConfig`/`importConfig` 与 `validateExport`/`validateImportDir` 完成迁移。

CLI 层不持有业务状态,所有核心逻辑都在 Core。

## 5. Desktop: IPC + React 组件结构

### 5.1 Main 进程

文件: `packages/desktop/src/main/index.ts`

- 职责:
  - 创建窗口,根据 `NODE_ENV` 加载本地 dev server 或打包 HTML。
  - 在非开发环境下将日志重定向到 `~/.ccman/logs/desktop-*.log`。
  - 使用 `ipcMain.handle` 绑定所有业务通道:
    - `codex:*`, `claude:*` → 对应 ToolManager 方法。
    - `sync:*` → Core Sync 模块。
    - `importexport:*` → 导入导出模块。
    - `clean:*` → `claude-clean.ts`。
    - `mcp:*` → MCP 相关工具。

### 5.2 Preload

文件: `packages/desktop/src/preload/index.ts`

- 使用 `contextBridge.exposeInMainWorld('electronAPI', {...})` 将一组类型化 API 暴露给 Renderer:
  - `codex`, `claude`: 完整的 Provider CRUD + Preset 管理。
  - `sync`: WebDAV 测试/上传/下载/合并。
  - `importExport`: 导入导出 + 目录选择。
  - `clean`: 各种清理/分析操作。
  - `mcp`: MCP Server 管理与启用状态切换。

Renderer 层永远不直接访问 Node/Electron API,安全边界清晰。

### 5.3 Renderer(React)

- 入口: `packages/desktop/src/renderer/App.tsx` 和 `index.tsx`。
- 关键页面组件:
  - `DashboardPage.tsx`: 总览当前 Codex/Claude/MCP/Sync 状态(根据代码可进一步深入,此处不展开)。
  - `CodexPage.tsx` / `ClaudeCodePage.tsx`: 对应服务商管理 UI,内部使用 `window.electronAPI.codex/*`/`claude/*`。
  - `MCPManagerPage.tsx`: MCP 列表 + 启用开关。
  - `SettingsPage.tsx`: 通过 `WebDAVSyncSection` + `BackupSection` 提供同步和导入导出 UI。
  - `CleanPage.tsx`: 嵌套 `CleanHeader`, `ProjectHistoryTable`, `CacheInfoTable` 实现 ~/.claude.json 清理。

从代码可以看出,Renderer 层的复杂度主要在 UI 状态管理和提示文案上,业务决策几乎全部交给 Main/Core。


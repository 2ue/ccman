# C. 功能模块与数据流(基于源码)

> 本文从“入口 → Core → 文件/网络”的角度,梳理各核心功能的数据流。  
> 所有路径都可以在相应文件中直接验证。

## 1. 服务商管理(Codex/Claude)

### 1.1 数据模型

- 存储位置:
  - Codex: `~/.ccman/codex.json`
  - Claude: `~/.ccman/claude.json`
  - 路径由 `packages/core/src/paths.ts` 中的 `getCcmanDir()` + `TOOL_CONFIGS` 中的 `configPath` 决定。

- 结构(从 `ToolConfig` 和 `Provider` 类型推导):
  - `currentProviderId?: string`
  - `providers: Provider[]`
    - `id`, `name`, `baseUrl`, `apiKey`, `createdAt`, `lastModified`, `lastUsedAt?` 等。
  - `presets?: PresetTemplate[]`

### 1.2 Codex 流程

以 CLI 添加 Codex 服务商为例(`packages/cli/src/commands/codex/add.ts`):

1. CLI 交互:
   - `createCodexManager()` → 拿到 `manager: ToolManager`。
   - 根据用户输入或 `CODEX_PRESETS` 构造 `{ name, baseUrl, apiKey }`。
2. Core 操作:
   - `manager.add({ name, baseUrl, apiKey })`:
     - 读取 `~/.ccman/codex.json`。
     - 在 `providers` 中添加新项,生成 `id` 和时间戳。
     - 写回 `codex.json`(使用 `readJSON`/`writeJSON`)。
     - 调用 `writeCodexConfig(provider)`。
3. Writers 写入:
   - `writeCodexConfig(provider)`:
     - `config.toml`:
       - 读取旧配置(如果存在)。
       - 使用 `deepMerge` 将 `CODEX_DEFAULT_CONFIG` 与旧配置合并。
       - 设置 `model_provider`, `model`, `model_providers[provider.name]`。
       - 写回 TOML(权限 0600)。
     - `auth.json`:
       - 读取旧文件,只更新 `OPENAI_API_KEY` 字段。
       - 写回 JSON(权限 0600)。

Desktop 中的添加操作本质完全相同,只是入口从 IPC 过来:

- Renderer 调用 `window.electronAPI.codex.addProvider()` → Preload `ipcRenderer.invoke('codex:add-provider')` → Main 中的 handler 调用 `createCodexManager().add(...)`。

### 1.3 Claude 流程

与 Codex 类似,差异在 writer:

- `writeClaudeConfig(provider)`:
  - 从 `CLAUDE_CONFIG_TEMPLATE` 中通过 `replaceVariables` 生成默认配置。
  - 读取旧 `settings.json`,与默认配置 `deepMerge`。
  - 强制覆盖 `env.ANTHROPIC_AUTH_TOKEN` 和 `env.ANTHROPIC_BASE_URL`。

所有修改都集中在 `env` 和 `permissions` 下,其他字段完全保留。

## 2. WebDAV 同步

### 2.1 配置数据

- 统一配置文件: `~/.ccman/config.json`,由 `packages/core/src/config.ts` 管理。
- `CcmanConfig.sync` 结构:
  - 从 `SyncConfig` + 扩展字段推得:
    - `webdavUrl`, `username`, `password`, `authType?`, `remoteDir?` 等。
    - 扩展字段: `rememberSyncPassword?`, `lastSync?`, `syncPassword?`(具体字段在 `sync/types.ts` 中)。

### 2.2 上传流程(uploadToCloud)

调用链(以 CLI 为例):

- CLI: `packages/cli/src/commands/sync/upload.ts` → 调用 `uploadToCloud(config, password)`。
- Core: `packages/core/src/sync/sync-v2.ts`:
  1. 读取 `~/.ccman/codex.json` 与 `claude.json`。
  2. 对 `providers` 数组调用 `encryptProviders(providers, password)`,将 API Key 加密为 `encryptedApiKey`。
  3. 使用扩展运算符保留除 `providers` 外的所有字段,生成加密版本配置。
  4. 通过 `uploadToWebDAV(config, CODEX_REMOTE_PATH, json)` 上传到 WebDAV。
  5. 更新 `lastSync` 并打印日志。

数据流总结:

`~/.ccman/{codex,claude}.json (明文 apiKey)` → 加密 Providers → WebDAV 上 `.ccman/{codex,claude}.json (encryptedApiKey)`。

### 2.3 下载流程(downloadFromCloud)

1. 检查远端是否存在配置文件(`existsOnWebDAV`)。
2. 如果存在,下载 JSON 并 parse 为 `ToolConfig`。
3. 调用 `decryptProviders(remote.providers, password)` 解密出本地 Provider 列表。
4. 备份本地 `~/.ccman/{codex,claude}.json`(通过 `backupConfig`)。
5. 覆盖写入本地配置:
   - 保留远端配置的所有字段,仅将 `providers` 替换为解密后的列表。
6. 调用 `applyCurrentProvider('codex'|'claude', newConfig)`:
   - 找到 `currentProviderId`.
   - 调用相应 writer 将当前 provider 应用到 Codex/Claude 官方配置。

数据流:

`WebDAV (encrypted)` → 解密 Providers → 覆盖 `~/.ccman/*.json` → 通过 Writers 更新 `~/.codex/*` 和 `~/.claude/settings.json`。

### 2.4 智能合并流程(mergeSync)

1. 下载并解密远端配置。
2. 读取本地配置。
3. 使用 `mergeProviders(local.providers, remote.providers)` 计算合并结果,记录是否有变更。
4. 使用 `mergePresets(local.presets, remote.presets)` 合并预设。
5. 如果无变更,直接返回。
6. 否则备份本地文件,写入合并后的配置到本地,并调用 `applyCurrentProvider` 更新官方配置。
7. 对合并后的 Providers 再次加密,上传到 WebDAV。

合并逻辑的实际行为完全由 `merge-advanced.ts` 决定,例如“以 lastModified 为准”“优先本地还是远端”等,不依赖文档描述。

## 3. MCP Server 管理

### 3.1 数据模型

- 配置文件位置: `~/.ccman/mcp.json`,路径由 `getCcmanDir()` + `ToolConfigMapping.configPath` 决定。
- 内部结构(从 `writers/mcp.ts` 推断):
  - `servers: MCPServer[]`:
    - 基于 Provider 扩展: `id`, `name`, `baseUrl`, 以及 MCP 特有字段如 `enabledApps: AppType[]`。
  - `managedServerNames: Record<AppType, string[]>`:
    - 对每个 app(`'claude' | 'codex' | 'cursor' | 'windsurf'`)记录被管理的 server 名称列表。

### 3.2 操作流程

1. CLI/Desktop 调用 `createMCPManager()` 获得 ToolManager 实例。
2. ToolManager 在加载配置时:
   - 通过 `customLoader` 调用 `loadMCPConfig()`,将 `MCPConfig` 映射为通用 `Provider[]` 列表。
3. 用户执行增删改操作后:
   - ToolManager 触发 `customSaver`,其内部:
     - 将 `Provider[]` 转为 `MCPServer[]`。
     - 维持 `enabledApps` 不丢失(保留已有配置)。
     - 根据 `enabledApps` 更新 `managedServerNames`。
     - 调用 `saveMCPConfig()` 写回 `mcp.json`。
4. Writers(mcp.ts) 负责把更新后的 MCP 配置同步到 `~/.claude.json`。

数据流:

`CLI/Desktop 操作` → `ToolManager(mcp)` → `MCPConfig` → `writers/mcp.ts` → `~/.claude.json` 中的 MCP 段落。

## 4. 导入导出

### 4.1 导出(exportConfig)

- `packages/core/src/export.ts`(简要概述):
  - 遍历 `~/.ccman` 目录中的关键文件(如 `codex.json`, `claude.json`, `mcp.json`, `config.json` 等)。
  - 将这些文件复制到目标目录,通常附带一些元信息(例如版本、时间)。
  - 调用方:
    - CLI: `packages/cli/src/commands/export.ts`。
    - Desktop: Preload 中的 `importExportAPI.exportConfig()` → Main 中对应 IPC handler → Core `exportConfig()`。

### 4.2 导入(importConfig)

- 从源目录读取导出的文件,在验证通过(`validateImportDir`)后:
  - 决定是否备份现有 `~/.ccman` 文件。
  - 覆盖写回对应文件。
  - 在 Desktop 情况下通常会在导入后提示用户重启或刷新。

数据流:

`导出`: `~/.ccman/*` → 目标目录(用户自行备份/同步)。  
`导入`: 备份现有 `~/.ccman/*` → 从导出目录复制覆盖。

## 5. ~/.claude.json 清理

### 5.1 分析与展示

调用链(Desktop):

- `CleanPage.tsx`:
  - `window.electronAPI.clean.analyze()` → `analyzeClaudeJson()`。
  - `window.electronAPI.clean.getProjects()` → `getProjectDetails()`。
  - `window.electronAPI.clean.getCaches()` → `getCacheDetails()`。

Core 实现:

- `analyzeClaudeJson()`:
  - 读取 `getClaudeJsonPath()` 指向的 `~/.claude.json`。
  - 统计项目数量、历史记录数量、估计缓存大小和不同清理等级的节省空间。
- `getProjectDetails()`:
  - 枚举 `config.projects` 中每个项目的历史记录,估算大小并取最后一条消息。
- `getCacheDetails()`:
  - 仅处理 `cachedChangelog` 缓存,计算大小和最后更新时间。

### 5.2 清理操作

- 预设策略:
  - `CleanPresets.conservative|moderate|aggressive()` 返回 `CleanOptions`。
- `cleanClaudeJson(options)`:
  - 备份 `~/.claude.json` 到 `~/.claude.json.backup-<timestamp>`。
  - 调用 `applyCleanOptions()` 进行实际清理:
    - 项目历史按 `keepRecentCount` 截断。
    - 缓存:删除 `cachedChangelog` 并重置 `changelogLastFetched`。
    - 统计:重置 `numStartups`, `promptQueueUseCount`, `tipsHistory` 等。
  - 原子写入修改后的 JSON 文件。

细粒度操作:

- 单项目删除: `deleteProjectHistory(projectPath)`。
- 单缓存删除: `deleteCacheItem(cacheKey)`。
- 单条历史记录删除: `deleteHistoryEntry(projectPath, index)`。
- 清空某项目历史: `clearProjectHistory(projectPath)`。

数据流:

`Desktop 操作` → IPC → Core `claude-clean.ts` → 直接读写 `~/.claude.json` + 备份。

---

以上数据流分析均来自实际源码调用链,可以作为后续优化/重构时的“行为基线”:任何变更都应在不破坏这些关键数据流前提下进行,或者在变更时显式更新相应分析文档。 


# G. 配置架构优化与实例化实施方案

> 目标：在不推翻现有实现的前提下，为 ccman 引入更统一、可扩展的配置管理抽象（ccman 实例 + 通用 CLI 实例），并给出可落地的演进步骤。

---

## 1. 背景与问题

### 1.1 当前能力概览（与本专题相关）

- **ccman 自身配置**
  - 文件：`~/.ccman/config.json`
  - 实现：`packages/core/src/config.ts`
    - `loadConfig()/saveConfig()` 已经等价于 `ccman.getConfig()/ccman.setConfig()`
    - `getSyncConfig()/saveSyncConfig()/deleteSyncConfig()/updateLastSyncTime()` 管理 WebDAV 同步配置
  - 路径：`packages/core/src/paths.ts` 的 `getCcmanDir()/getConfigPath()`

- **各 CLI 的服务商配置（ccman 管理的数据层）**
  - 文件：`~/.ccman/codex.json`、`~/.ccman/claude.json`、`~/.ccman/mcp.json`
  - 实现：`packages/core/src/tool-manager.ts` + `tool-manager.types.ts`
    - `ToolType = 'codex' | 'claude' | 'mcp'`
    - `ToolConfig = { currentProviderId?, providers[], presets? }`
    - `TOOL_CONFIGS` 为每个工具声明：
      - `configPath`（.ccman 下 JSON）
      - `builtinPresets`
      - `writer`（写入官方 CLI 配置）
      - MCP 还会声明 `customLoader/customSaver`，将 `.ccman/mcp.json` ↔ `ToolConfig` 转换
    - 工厂：`createToolManager(tool)` 暴露 `add/list/switch/edit/remove/clone` 等能力

- **MCP 配置与桥接**
  - ccman MCP 文件：`~/.ccman/mcp.json`
  - 实现：`packages/core/src/writers/mcp.ts`
    - `MCPConfig = { servers: MCPServer[], managedServerNames }`
    - `loadMCPConfig()/saveMCPConfig()/getMCPConfigPath()` 为 MCP 专用读写接口
    - `writeMCPConfigForApp()/toggleMCPForApp()/getMCPAppStatus()` 负责 `.ccman/mcp.json` ↔ `~/.claude.json` 的同步与启用状态

- **WebDAV 同步（目前只同步 codex/claude 服务商配置）**
  - 实现：`packages/core/src/sync/sync-v2.ts`
    - 对外 API：`uploadToCloud()/downloadFromCloud()/mergeSync()`
    - 目前只同步两份文件：`.ccman/codex.json` 和 `.ccman/claude.json`
    - 同步配置本身存储在 `config.json` 的 `sync` 字段，由 `getSyncConfig()/saveSyncConfig()` 管理

- **官方 CLI 配置（外部工具侧）**
  - Codex：
    - 路径：`getCodexConfigPath()` → `~/.codex/config.toml`，`getCodexAuthPath()` → `~/.codex/auth.json`
    - 写入：`writers/codex.ts` 的 `writeCodexConfig(provider)`
  - Claude Code：
    - 路径：`getClaudeConfigPath()` → `~/.claude/settings.json`，`getClaudeJsonPath()` → `~/.claude.json`
    - 写入：`writers/claude.ts` 的 `writeClaudeConfig(provider)`
  - MCP 与 `.claude.json` 的写入由 `writers/mcp.ts` 负责

整体来看，当前已经有一套“数据（.ccman/*.json）+ writers + ToolManager”的基础能力，但：

- WebDAV 同步/导出导入对文件名和对象类型高度硬编码（只认 codex/claude）
- ccman 自身配置、各 CLI 服务商配置、MCP 配置和官方 CLI 配置之间的关系，对上层 UI/CLI 不够统一
- 随着未来要支持更多 CLI（Gemini、Cursor、Windsurf 等），扩展点会越来越分散

### 1.2 新架构诉求（来自需求讨论）

用户提出的期望抽象可以概括为两类“实例”：

- **ccman 实例**
  - `ccman.getConfig()/ccman.setConfig()`：读写 ccman 自身配置（如同步配置等）
  - `ccman.syncConfig()`：统一入口，内部调用 WebDAV 同步能力
  - `ccman.getCliConfig(cli, type)/ccman.setCliConfig(cli, type, config)`：
    - `type = 'providers'`：读写 `.ccman/{cli}.json` 的服务商/预设信息
    - `type = 'mcp'`：读写 `.ccman/mcp.json` 的 MCP 配置

- **cli 实例（通用 CLI 工具抽象）**
  - `cli.getConfigPath()`：获取该工具的相关配置路径（ccman 内部 + 官方 CLI）
  - 读写 ccman 内的服务商配置（providers/presets）
  - 读写 MCP 配置（对应 `.ccman/mcp.json` 和 `.claude.json` 内的 mcpServers）
  - 读写官方 CLI 配置（`config.toml`、`settings.json` 等）
  - 未来每个 CLI 在这之上扩展自己的专有行为

核心问题：**在不打乱现有 Core 代码结构的前提下，如何引入上述抽象，并为未来扩展更多 CLI 工具打好基础。**

---

## 2. 设计判断与取舍

### 2.1 哪些抽象方向是“对的”

1. **显式抽象“配置目标”是必要的**
   - 当前已有隐含概念：`ToolType` + `TOOL_CONFIGS` + `paths.ts` 中的各类路径。
   - 未来需要支持更多 CLI/IDE 时，如果继续靠硬编码路径/文件名扩展，会迅速变得难以维护。
   - 将每个对象（ccman 自身、codex、claude、mcp、未来的 gemini/cursor 等）抽象成一个可枚举的“配置目标（ConfigTarget）”，并集中声明其路径及同步策略，有助于：
     - 统一同步/导出逻辑
     - 简化 Desktop/CLI 一层的 UI 逻辑

2. **为 ccman 提供“平台级门面”是合理的**
   - `loadConfig/saveConfig + getSyncConfig/saveSyncConfig + uploadToCloud/...` 目前分散在多个模块中。
   - 抽象出一个 `ccman` 门面（无论是对象还是一组函数），对上层来说是“平台级服务”：
     - 管理 ccman 自己的配置
     - 管理 WebDAV 同步
     - 暴露统一的 CLI 配置读写入口
   - 好处：UI/CLI 只需要调用 `ccman.*`，无需关心配置文件细节。

3. **通用 cli 实例（服务）对多工具扩展非常有价值**
   - 现在 Codex/Claude/MCP 的服务商管理已经统一在 `ToolManager` 下；官方配置写入统一由 `writers/` 负责。
   - 封装一个通用 `cli` 服务（如 `createCliService(id)`），组合现有能力，对上层暴露统一接口：
     - 服务商管理：`service.manager.*`
     - 官方配置读写：`readAppConfigs()/writeAppConfigs()`
     - MCP 特定能力：`getMcpConfig()/setMcpConfig()` 等
   - 对未来扩展新工具（Gemini CLI 等）时，只需扩展元数据和 ToolManager 配置，新的 CLI 即可接入同一套服务。

4. **WebDAV 同步和导入导出应以“声明式元数据”驱动**
   - 目前 sync/export 中对文件名的硬编码会阻碍后续将 MCP、其他 CLI 配置纳入同步/导出范围。
   - 通过 ConfigTarget 元数据为每个工具声明：
     - 哪些文件属于它
     - 哪些文件需要同步（是否需要加密 providers）
   - 同步/导出模块只依赖元数据，无需了解具体工具细节。

### 2.2 哪些地方不宜过度设计

1. **现在就引入“统一的大型 OOP 实例体系”代价过高**
   - 当前 Core 已经形成较清晰的函数式结构：`ToolManager + writers + config + sync`。
   - 若切换到一套完全新的 class/接口体系，会带来：
     - 大体量重构
     - Desktop/CLI 多处调用改动
     - 短期收益有限，回归风险较高
   - 更合适的策略是：**保留现有函数式 API，在其上叠加一层轻量门面和元数据描述**。

2. **不要强行把 ccman 实例和 cli 实例压成“完全统一的接口”**
   - ccman 的职责偏“平台级”：
     - 全局配置（同步配置、UI 参数等）
     - 全局同步/导出策略
   - cli 的职责偏“单工具级”：
     - 管理该工具的服务商/预设
     - 管理该工具的官方配置文件和 MCP 打通
   - 建议做法：
     - **底层共享一份 ConfigTarget 元数据**
     - 上层提供两个风格一致但职责不同的门面：
       - `ccman`：平台级服务
       - `createCliService(id)`：单工具级服务

---

## 3. 目标架构概览

### 3.1 新增「配置目标元数据」层（ConfigTarget）

核心思想：所有与配置相关的行为（同步、导出、路径打印）不再散落于各模块，而是统一从一张元数据表读取。

示例定义（伪代码）：

```ts
export type CliId = 'ccman' | 'codex' | 'claude' | 'mcp'

export interface ConfigTargetMeta {
  id: CliId
  internalConfigPath?: string            // ~/.ccman/x.json
  appConfigPaths?: string[]              // 官方 CLI 配置，如 ~/.codex/config.toml
  syncItems?: Array<{
    localPath: string                    // 本地配置文件
    remotePath: string                   // WebDAV 相对路径
    encryptProviders?: boolean           // 是否对 providers 做加密
  }>
}

export const CONFIG_TARGETS: Record<CliId, ConfigTargetMeta> = {
  ccman: { ... },
  codex: { ... },
  claude: { ... },
  mcp: { ... },
}
```

用途：

- WebDAV 同步从 `syncItems` 中获取需要同步的文件及策略；
- 导入导出可以从 `internalConfigPath` 列表中生成导出/导入目标；
- CLI/桌面 UI 可以通过 `appConfigPaths` 显示对应官方配置文件。

### 3.2 平台级门面：ccman 服务

目标：为 CLI 和 Desktop 提供统一的 ccman 服务入口。

核心能力：

- ccman 自身配置：
  - `getConfig()` / `setConfig(config)` → 封装 `loadConfig()/saveConfig()`
- WebDAV 配置：
  - `getSyncConfig()` / `setSyncConfig(config)` → 封装 `getSyncConfig()/saveSyncConfig()`
- 一站式同步入口：
  - `syncConfig(mode, password)`：
    - `mode = 'upload' | 'download' | 'merge'`
    - 内部自动读取当前 WebDAV 配置，调用 `uploadToCloud()/downloadFromCloud()/mergeSync()`
- CLI 配置读写（可选）：
  - `getCliConfig(cli, type)` / `setCliConfig(cli, type, config)`：
    - `type = 'providers'` → 读写 `.ccman/{cli}.json`（ToolConfig/MCPConfig）
    - `type = 'mcp'` → 读写 `.ccman/mcp.json`

这一层不做复杂逻辑，只负责统一入口与参数校验。

### 3.3 单工具级门面：cli 服务

目标：统一封装“某个 CLI 的所有配置相关操作”，便于上层使用。

示意接口：

```ts
export interface CliService {
  id: CliId
  toolType?: ToolType                   // codex/claude/mcp 才有
  manager?: ToolManager                 // 管理 ~/.ccman/{tool}.json 的 providers/presets

  getInternalConfigPath(): string | undefined
  getAppConfigPaths(): string[]

  readAppConfigs(): Promise<Record<string, string>>
  writeAppConfigs(files: Record<string, string>): Promise<void>

  getMcpConfig?(): MCPConfig
  setMcpConfig?(c: MCPConfig): void
}

export function createCliService(id: CliId): CliService { ... }
```

内部实现：

- 基于 `CONFIG_TARGETS` 获取路径信息；
- 对有服务商配置的工具（codex/claude/mcp），组合 `createToolManager(tool)` 提供 `manager`；
- 对 MCP 工具提供额外的 `getMcpConfig()/setMcpConfig()`，封装 `loadMCPConfig()/saveMCPConfig()`；
- `readAppConfigs()/writeAppConfigs()` 统一管理官方 CLI 配置（带简单备份/回滚）。

### 3.4 模块职责一览

- `paths.ts`：仍然只负责路径计算（环境感知）。
- `config-targets.ts`：集中声明各 ConfigTarget 的路径/同步元数据。
- `config.ts`：ccman 自身配置的实际读写。
- `tool-manager.ts`：服务商管理（providers/presets），不变。
- `writers/*.ts`：与外部工具集成（官方 CLI 配置读写），不变。
- `sync/*.ts`、`export.ts`：由硬编码文件名 → 变为基于 `CONFIG_TARGETS` 驱动。
- `ccman-service.ts`：平台级门面。
- `cli-service.ts`：单工具级门面。

---

## 4. 实施步骤（演进路线）

### 步骤 1：引入 ConfigTarget 元数据层（低风险）

1. 新增 `packages/core/src/config-targets.ts`：
   - 定义 `CliId`、`ConfigTargetMeta`；
   - 填充 `ccman/codex/claude/mcp` 四个目标的元数据：
     - `internalConfigPath`：ccman 内部配置文件路径；
     - `appConfigPaths`：官方 CLI 配置路径；
     - `syncItems`：当前用于 WebDAV 同步的文件及策略（先只包含 codex/claude）。
2. 暂时不改任何对外 API，仅将路径声明集中于此，供后续模块使用。

**预期收益**

- 路径与同步范围集中管理，为后续改造 sync/export 提供基础；
- 为未来新增工具（Gemini/Cursor/Windsurf）预留扩展点。

### 步骤 2：让 WebDAV 同步和导入导出基于 ConfigTarget 驱动

1. 改造 `packages/core/src/sync/sync-v2.ts`：
   - 用 `CONFIG_TARGETS` 中的 `syncItems` 替代硬编码的：
     - `CODEX_REMOTE_PATH = '.ccman/codex.json'`
     - `CLAUDE_REMOTE_PATH = '.ccman/claude.json'`
   - 上传：
     - 遍历所有 `syncItems.encryptProviders === true` 的条目：
       - 从 `localPath` 读配置（ToolConfig）
       - 对 `providers` 进行加密
       - 写 JSON 并上传到对应 `remotePath`
   - 下载/合并：
     - 从 `remotePath` 下载
     - 解密 providers
     - 合并/覆盖写回对应 `localPath`，并调用现有 `applyCurrentProvider('codex'/'claude', newConfig)` 等逻辑。
   - 对外 API `uploadToCloud()/downloadFromCloud()/mergeSync()` 保持签名不变。

2. 改造 `packages/core/src/export.ts`：
   - 使用 `CONFIG_TARGETS` 中有 `internalConfigPath` 的目标来生成导出/导入所需的文件列表；
   - 优先保持行为与当前版本一致（只处理 codex/claude），实现上使用元数据，为未来扩展保留空间。

**预期收益**

- 同步和导出逻辑彻底摆脱硬编码，为后续纳入 MCP 及更多工具配置提供统一入口；
- 行为兼容当前版本（对用户透明），但扩展成本明显降低。

### 步骤 3：新增 ccman 平台级门面

1. 新增 `packages/core/src/ccman-service.ts`：
   - 封装：
     - `getConfig()/setConfig()` → `loadConfig()/saveConfig()`
     - `getSyncConfig()/setSyncConfig()` → `getSyncConfig()/saveSyncConfig()`
     - `syncConfig(mode, password)` → 内部自动读取当前 WebDAV 配置并调用 `uploadToCloud()/downloadFromCloud()/mergeSync()`
   - 可选：在此加入 `getCliConfig()/setCliConfig()`，通过 `CONFIG_TARGETS` + `readJSON/writeJSON` + `loadMCPConfig/saveMCPConfig` 统一对外。
2. 在 `packages/core/src/index.ts` 中导出：
   - `export { ccman, type SyncMode } from './ccman-service.js'`

3. 后续可逐步将 CLI/桌面中的相关调用替换为 `ccman` 门面，但不必一次性完成。

**预期收益**

- CLI 与 Desktop 不再需要关注配置文件的细节（路径、加密等），统一通过 `ccman` 操作；
- 为后续扩展 ccman 自身配置（主题、语言、UI 偏好等）提供稳定入口。

### 步骤 4：新增 cli 通用服务工厂

1. 新增 `packages/core/src/cli-service.ts`：
   - 定义 `CliService` 接口；
   - 提供 `createCliService(id: CliId)`：
     - 使用 `CONFIG_TARGETS[id]` 获取路径信息；
     - 对 `id` 为 `'codex' | 'claude' | 'mcp'` 的目标，内部 `createToolManager(tool)` 并挂载到 `service.manager`；
     - 提供：
       - `getInternalConfigPath()/getAppConfigPaths()`；
       - `readAppConfigs()/writeAppConfigs()`（封装文件读写 + 备份/回滚）；
       - 对 `id === 'mcp'`，额外挂载 `getMcpConfig()/setMcpConfig()`。
2. 在 `packages/core/src/index.ts` 中导出：
   - `export { createCliService, type CliService, type CliId } from './cli-service.js'`

**预期收益**

- 上层（CLI/桌面）不再需要关心 `ToolManager`、路径、MCP 细节，只需通过 `cliService` 获取统一能力；
- 扩展新工具时，仅需扩展元数据和 ToolManager 配置，该工具即可自动获得一套统一的管理接口。

### 步骤 5：渐进迁移 CLI 与 Desktop 调用

> 此步骤可以在前面 3~4 步稳定后再进行，优先级可调，建议分批进行。

1. CLI 层（`packages/cli`）：
   - WebDAV `sync` 子命令：
     - 改为调用 `ccman.getSyncConfig()/ccman.setSyncConfig()/ccman.syncConfig()`；
     - CLI 仅负责交互（输入模式/密码），业务逻辑收敛在 Core。
   - 未来新增工具子命令（例如 `gx` 对接 Gemini CLI）：
     - 直接 `const service = createCliService('gemini')`；
     - 使用 `service.manager` 管理 providers/presets；
     - 视需要决定是否暴露 `readAppConfigs()` 给用户编辑。

2. Desktop 层（`packages/desktop`）：
   - Main 进程中：WebDAV 相关 IPC 改为基于 `ccman` 门面；
   - 设置页中“查看/编辑 ccman 配置文件”的功能，可用 `createCliService('codex').getInternalConfigPath()` 等替换硬编码路径；
   - 未来新增工具页面时，复用 `createCliService(id)` 的能力，不再直接操作 `ToolManager` 与路径。

**预期收益**

- 将绝大多数配置相关逻辑下沉到 Core；
- CLI 与 Desktop 更专注于交互与展示，实现“多工具配置中心”的产品定位。

---

## 5. 风险与兼容性分析

### 5.1 风险点

- **路径/文件列表集中管理后的疏漏风险**
  - 如果 ConfigTarget 元数据配置不完整，可能导致导出/同步漏掉某些文件。
  - 缓解措施：引入简单的单元测试，验证所有已有工具的路径与当前行为一致。

- **同步逻辑从硬编码迁移到元数据驱动后的行为差异**
  - 如实现不严谨，可能在同步顺序或异常处理上产生细微差异。
  - 缓解措施：保留当前逻辑的顺序与边界条件，只替换文件来源；通过测试覆盖典型场景（仅本地、仅远程、冲突等）。

- **新门面与旧调用长期并存**
  - 在迁移过程中，可能存在 `ccman` 门面与直接调用 `sync-v2.ts` 的方式并存。
  - 缓解措施：先保证 `ccman` 门面内部调用的仍是现有实现，再分阶段在各 UI 层替换调用；期间保持旧 API 不删减。

### 5.2 兼容性策略

- 所有现有对外导出的 API（`createCodexManager/createClaudeManager/createMCPManager/sync/export/...`）在短期内保持不变；
- 新增的 `ccman` / `createCliService` 作为“增强层”，优先在新功能中使用，旧功能逐步迁移；
- 同步/导出行为通过测试保证与当前版本一致，再启用更多 ConfigTarget 配置（如 MCP 或新工具）。

---

## 6. 总结与后续展望

1. **方向判断**
   - 将 ccman 定位为“多工具配置中心”，并通过“配置目标元数据 + 平台级/工具级门面”来统一管理各类配置，是正确且中长期必要的方向。

2. **实施策略**
   - 不推翻现有 `ToolManager + writers + config + sync` 结构，而是在其上添加：
     - `ConfigTarget` 元数据层；
     - `ccman` 平台级服务；
     - `cliService` 单工具级服务。
   - 所有改造均以“渐进演进”为原则，优先内部重构，再对外暴露新门面，最后迁移 UI/CLI 调用。

3. **后续可选优化**
   - 在 `cliService` 层，引入更细粒度的“配置模块/模板管线”，将目前 writers 中的模板/合并逻辑抽象成可组合模块；
   - 为 ConfigTarget 增加更多维度的元信息（如显示名、图标、颜色），让 CLI/桌面 UI 也可以数据驱动，而不是硬编码标签。

通过以上步骤，项目可以在最小风险下，从“两个工具的配置管理器”自然演进为“多工具配置中心”，同时为未来支持更多 CLI/IDE、丰富 ccman 自身配置打下坚实的架构基础。


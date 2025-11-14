# E. 优化与演进建议(基于源码)

> 本文所有建议都基于前文对源码的分析,每条建议尽量指向具体模块或文件,方便后续直接落地。

## 1. 核心架构与命名一致性

### 建议 E1: 明确以 `ToolType = 'codex' | 'claude' | 'mcp'` 为唯一规范

- 依据: `packages/core/src/tool-manager.types.ts` 与 `paths.ts`, Preload/CLI 等所有实际引用均使用 `claude`。
- 建议:
  - 在项目内部(包括未来文档)统一使用 `claude` 作为工具代号,文字说明中再解释它对应的产品是“Claude Code”。
  - 对于已有的架构文档,以代码为基准反向修订,避免新贡献者被旧规范误导。

### 建议 E2: 为 ToolManager 增加轻量 API 层

- 问题: CLI/Desktop 直接依赖 ToolManager 的完整类型,一旦内部变更会强制同步修改两端。
- 建议实现方向:
  - 在 `packages/core/src/index.ts` 中为对外使用定义一组稳定的“Facade 类型”,例如:
    - `PublicProvider = Pick<Provider, 'id' | 'name' | 'baseUrl' | 'createdAt' | 'lastModified'> & { hasApiKey: boolean }`
  - CLI/Desktop 优先使用这些 Facade 类型,减少对内部实现细节的依赖。

## 2. 安全与同步体验

### 建议 E3: 引入可选的系统级凭据存储

- 依据: `config.ts` 当前将 WebDAV `password` 与 `syncPassword` 明文写入 `config.json`,虽然有 0600 权限保护,但仍存在本机被入侵时的风险。
- 实现思路(分阶段):
  1. 抽象出 `CredentialStore` 接口(例如在 Core 中定义,由 Desktop/CLI 具体实现):
     - `set(name, value)`, `get(name)`, `delete(name)`。
  2. Desktop 端:
     - 使用 `keytar` 或平台 API 将敏感信息存入系统级密码库,`config.json` 中只保存引用 key。
  3. CLI 端:
     - 提供可选模式:在支持的系统上使用系统密码库,否则退回当前实现。

### 建议 E4: 在 UI 层强化同步风险提示

- 依据: `SettingsPage.tsx` 与 `WebDAVSyncSection.tsx` 目前主要展示功能说明,对风险着墨不多。
- 建议:
  - 当用户勾选“记住同步密码”等开关时,弹出二次确认对话框:
    - 解释密码会被写入本地配置文件,尽管权限较严格,依然存在风险。
  - 在 `downloadFromCloud` 和 `mergeSync` 前后,提示用户数据覆盖/合并的语义,尤其强调“不会自动导入导出”的边界。

## 3. MCP 管理与测试

### 建议 E5: 为 MCP 配置增加针对性的单元测试

- 依据: MCP 逻辑跨越 ToolManager、writers/mcp.ts 和 Desktop UI,但目前看不到明确的测试保障。
- 建议:
  - 在 `packages/core` 中新增针对 MCP 的 Vitest 测试文件,覆盖:
    - `createMCPManager().add/edit/remove/switch` 的基本行为。
    - customSaver 对 `enabledApps` 和 `managedServerNames` 的维护逻辑。
  - 使用 `__setTestPaths` 将路径指向临时目录,防止污染真实配置。

### 建议 E6: 在 Desktop MCP 页面显式展示“已写入到哪些应用”

- 依据: Preload 暴露了 `mcp.toggleApp` 与 `mcp.getAppStatus`,但 UI 层可以进一步提升透明度。
- 具体建议:
  - 在 `MCPCard` 或 `MCPManagerPage` 中显示每个 MCP Server 对应的 AppType 开关状态。
  - 对尚未真正实现写入逻辑的 AppType(如果有),暂时禁用 UI 开关或显示“即将支持”标签,避免产生虚假行为。

## 4. WebDAV 同步与导入导出的协同

### 建议 E7: 定义同步状态机与冲突策略

- 问题: 当前导入导出与 WebDAV 同步都操作同一组文件,但没有协同机制,用户可能在同步中途导入,造成状态不明确。
- 建议:
  - 在 `CcmanConfig` 中增加同步状态字段(例如 `syncState: 'idle' | 'uploading' | 'downloading' | 'merging'`),在长操作开始时设置,结束时清空。
  - 导入导出前检查 `syncState`,若非 `idle` 则提示用户稍后重试或强制中断同步。
  - CLI/Desktop 与 Core 共同遵循这套简单状态机,避免临界条件。

### 建议 E8: 将导入导出与 Sync 使用的文件列表抽象为常量

- 依据: `export.ts` 与 `sync-v2.ts` 都在各自实现中“硬编码”了需要处理的文件名。
- 建议:
  - 在 Core 中声明统一的 `CCMAN_CONFIG_FILES = ['codex.json', 'claude.json', 'mcp.json', 'config.json', ...]`。
  - 导入导出与 Sync 共同依赖这个常量,减少后续新增文件时遗漏的风险。

## 5. 清理工具的可恢复性与 UX

### 建议 E9: 为所有破坏性操作统一增加备份选项

- 依据: `claude-clean.ts` 中:
  - `deleteProjectHistory` 与 `deleteCacheItem` 会备份。
  - `deleteHistoryEntry` 与 `clearProjectHistory` 明确“不备份”。
- 建议:
  - 为细粒度操作新增可选备份逻辑,并在 Desktop UI 通过配置或提示说明差异。
  - 最简单版本:增加一个全局布尔配置(例如 `clean.alwaysBackup`)控制是否在细粒度操作前自动备份。

### 建议 E10: 在 Desktop 清理界面展示备份记录与一键恢复入口

- 实现思路:
  - Core 端:
    - 在 `claude-clean.ts` 中维护最近 N 个备份文件列表的查询函数(例如 `listBackups(): string[]`)。
    - 提供 `restoreFromBackup(path)` 以便 UI 调用。
  - Desktop 端:
    - 在 `CleanPage` 中添加“备份与恢复”区域,列出可用备份并支持快速恢复。

## 6. CLI/交互式体验改进

### 建议 E11: 完成或暂时隐藏“预置服务商管理”功能

- 依据: `interactive.ts` 的 `showPresetsMenu()` 目前仅打印“即将推出”。
- 建议:
  - 短期:将主菜单中的“预置服务商管理”选项隐藏或标记为“(WIP)”。
  - 中期:真正实现预设管理(增删改用户预设),复用 ToolManager 的 `presets` 能力:
    - 例如:允许用户将当前某个 provider 保存为自定义预设,并跨设备同步。

### 建议 E12: 为 WebDAV Sync CLI 命令增加“dry-run”模式

- 依据: 同步操作常常带有破坏性(覆盖本地或远端),当前 CLI 仅通过文案提示风险。
- 建议:
  - 在 Core 层为 Sync 提供 `planUpload` / `planDownload` / `planMerge` 接口,返回将会变化的 providers 和 presets 列表。
  - 在 CLI 中添加 `--dry-run` 选项,只展示计划变更而不实际执行,帮助用户建立信心。

## 7. 测试与 CI

### 建议 E13: 从 Core 开始建立最小 CI 流水线

- 依据: Core 是所有行为的源头,且已经具备 Vitest 配置。
- 建议:
  - 在 GitHub Actions(或其他 CI)中添加简单工作流:
    - Node 18 + pnpm 安装依赖。
    - 运行 `pnpm test --filter @ccman/core`。
  - 将 Desktop/CLI 构建测试作为后续扩展,先保证 Core 行为稳定。

### 建议 E14: 为 CLI 添加少量端到端测试

- 实现方向:
  - 使用 Node child_process 在测试中调用本地构建后的 CLI(或直接 `tsx` 运行源码),并设置 `NODE_ENV=test` + `__setTestPaths`。
  - 覆盖至少以下场景:
    - `ccman cx add` → `ccman cx current` 行为链。
    - `ccman sync upload` 在空配置下的错误提示。

这样可以在不大幅扩展测试成本的前提下,捕捉最关键的行为回归。

---

以上建议不要求一次性全部完成,可以按以下优先级落地:

1. 命名与文案对齐(E1) + 预设与 UI 修正(E11)。  
2. MCP 与 Sync 的测试补齐(E5, E7, E8, E13)。  
3. 安全与清理 UX 改进(E3, E4, E9, E10)。  
4. 更长期的架构演进(E2, E6, E12, E14)。 


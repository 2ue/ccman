# A. 项目概述与定位(基于源码)

> 说明: 本文以源码为主,所有结论均可在 `packages/core`, `packages/cli`, `packages/desktop` 中找到直接对应的实现。`README.md` 和 `docs/` 只作为辅助参考。

## 1. 实际提供了什么能力?

从代码出发,ccman 当前(以本仓库代码为准)实际提供的能力可以分为五类:

1. **Codex/Claude 服务商配置管理**
   - 核心逻辑: `packages/core/src/tool-manager.ts` + `packages/core/src/writers/{codex,claude}.ts`
   - CLI 入口: `packages/cli/src/index.ts` 中的 `cx`、`cc` 子命令,以及 `interactive.ts` 中的菜单。
   - Desktop 入口: `packages/desktop/src/main/index.ts` 通过 `createCodexManager` / `createClaudeManager` 暴露 IPC,渲染层提供 Codex/Claude 页面。

2. **WebDAV 配置同步(加密 API Key)**
   - 核心逻辑: `packages/core/src/sync/*`(尤其是 `sync-v2.ts`, `crypto.ts`, `webdav-client.ts`, `merge-advanced.ts`)。
   - CLI 入口: `packages/cli/src/commands/sync/*` 与 `startSyncMenu()`。
   - Desktop 入口: `packages/desktop/src/renderer/components/settings/WebDAVSyncSection.tsx` 通过 `window.electronAPI.sync.*` 调用 Core。

3. **MCP Server 管理与多应用同步**
   - 核心逻辑: `packages/core/src/writers/mcp.ts` + `packages/core/src/tool-manager.ts` 中 `ToolType = 'mcp'` 的分支。
   - Desktop 入口: `packages/desktop/src/renderer/components/MCPManagerPage.tsx` 系列组件 + Preload 中的 `mcpAPI`。
   - CLI 入口: `packages/cli/src/commands/mcp/*`。

4. **配置导入导出**
   - 核心逻辑: `packages/core/src/export.ts` + `packages/core/src/index.ts` 中的 `exportConfig`/`importConfig`。
   - CLI 入口: `packages/cli/src/commands/{export,import}.ts`。
   - Desktop 入口: `SettingsPage.tsx` + `settings/BackupSection.tsx` + Preload 中的 `importExportAPI`。

5. **~/.claude.json 清理工具**
   - 核心逻辑: `packages/core/src/claude-clean.ts`。
   - Desktop 入口: `packages/desktop/src/renderer/components/CleanPage.tsx` 及其子组件,通过 Preload 中的 `cleanAPI` 调用 Core。
   - CLI 目前没有直接入口,该能力主要为 Desktop 清理页面服务。

结论: 项目已经从“单纯的 API 服务商切换器”演化为一个围绕 Codex/Claude 生态的“本地配置控制中心”:既控制 `~/.ccman/` 自己的数据,也负责驱动 Codex、Claude、MCP 等外部工具的配置文件。

## 2. 面向的真实使用场景

从代码行为(特别是路径和写入策略)可以推断出以下典型场景:

1. **单机多服务商切换**
   - ToolManager 将服务商信息统一存放在 `~/.ccman/{codex,claude}.json` 中,通过 `writers` 精准修改 `~/.codex/config.toml`、`~/.codex/auth.json`、`~/.claude/settings.json`。
   - 这种结构证明:项目核心目标之一是“让用户无需直接编辑这些配置文件即可完成服务商切换”,而且保证“零破坏性”(仅修改相关字段)。

2. **多机环境/重装系统下的配置迁移**
   - WebDAV 同步(`sync-v2.ts`)和导入导出(`export.ts`)都围绕 `~/.ccman/` 目录展开,并且对 API Key 做了加密或显式处理。
   - 这说明项目假定用户有多台机器,或者需要在重装系统/新机器时快速恢复配置。

3. **MCP 多工具共享**
   - `writers/mcp.ts` 中对 `managedServerNames` 的处理,会根据 `enabledApps` 写出到 `~/.claude.json` 的不同字段,支持 Claude/Codex/Cursor/Windsurf 等。
   - 这表明项目定位不只是“管理 MCP 列表”,而是“作为多个 IDE/工具的 MCP 配置源头”。

4. **清理膨胀的 ~/.claude.json**
   - `claude-clean.ts` 提供细粒度的历史统计、空间估算和多档清理策略,并配合 Desktop 的可视化界面。
   - 这满足了“长期使用 Claude Code 后配置文件膨胀严重”的真实痛点。

## 3. 与 README 文案的差异(以代码为准的校准)

基于当前代码:

- Codex 预设(`presets/codex.ts`)目前包含 `OpenAI Official` 与 `GMN` 两项,与 README 中“多预设”一致但需保持清单同步。  
  → 对用户而言,内置预设以源码清单为准。

- Core 中的 `ToolType` 实际为 `'codex' | 'claude' | 'mcp'`,并不存在 `'claudecode'` 这种类型。  
  → 架构文档中关于命名规范的部分已经与代码实现脱节,以代码为准应采用 `claude`。

- Desktop 代码中,所有 IPC channel 都使用 `codex:*` / `claude:*` 前缀,页面命名为 `CodexPage.tsx` 与 `ClaudeCodePage.tsx`,说明实现层已经统一采用“Codex/Claude”这对术语。

因此,在后续任何产品文案、README 更新时,建议**以当前源码为基准做反向修正**,而不是反过来假定代码已经等同文档。

## 4. 项目边界(代码能做到和做不到什么)

能做到的(以当前代码为证):

- 控制和管理:
  - 管理 `~/.ccman` 目录下的配置文件,包括服务商列表、MCP 配置、同步配置等。
  - 修改 Codex/Claude/MCP 相关配置文件的特定字段,并尽可能保留用户其它自定义字段。
- 同步与迁移:
  - 通过 WebDAV 或本地导入导出,在不同设备间迁移配置(包含或不包含 API Key)。
- 清理:
  - 清理 ~/.claude.json 的历史/缓存/统计,并提供预设策略和备份。

不能做到/不打算做的(从代码设计中反推的边界):

- 不接管 Codex/Claude 以外的模型配置管理(没有通用 OpenAI/其他 LLM 工具的适配层)。
- 不提供云端配置服务,所有同步都基于用户自己的 WebDAV 服务。
- 不在 UI 中显示模型列表/调用统计等上层语义;仅做“配置管理和同步”,不做“对话或模型调用”。

这为后续扩展提供了清晰边界:如果未来要接入更多工具或云能力,应该以“新增 ToolType + 对应 writer/sync 适配”的方式渐进扩展,而不是模糊当前边界。

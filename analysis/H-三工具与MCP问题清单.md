# H. 三工具（Claude / Codex / Gemini CLI）与 MCP 问题清单

> 本文基于 2025-12-06 的代码仓库状态，对「三大工具服务商配置 + MCP 管理」相关问题做集中记录，方便后续演进时查阅。

---

## 1. 文档与实际功能脱节

- 顶层 `README.md`、`packages/cli/README.md` 仍主要描述为「Codex 和 Claude Code 的服务商配置管理」，没有突出：
  - 已支持 Gemini CLI（CLI 子命令 `gm`、Desktop 的 Gemini 页面）。
  - 已支持 MCP 管理（CLI `mcp` 子命令 + Desktop MCP 页面）。
- 说明文档中的安装命令多处仍是 `npm install -g @ccman/cli`，而实际包名是 `ccman`（`packages/cli/package.json`）。
- 架构分析文档（如 `analysis/B-技术架构与代码结构.md`）描述的 `ToolType` 还是 `'codex' | 'claude' | 'mcp'`，没有同步到当前的 `'codex' | 'claude' | 'mcp' | 'gemini'`。
- 结果：
  - 新用户很难从 README 一眼看出项目已经覆盖「Codex / Claude / Gemini CLI + MCP」。 
  - 贡献者阅读分析文档时会得到过期的工具列表和命名信息。

---

## 2. WebDAV 同步与 Gemini CLI 集成存在 CLI 级 Bug

相关代码：`packages/core/src/sync/sync-v2.ts`、`packages/cli/src/commands/sync/*.ts`。

- `TOOL_SYNC_CONFIG` 已包含三种主工具：
  - `codex` → `.ccman/codex.json`
  - `claude` → `.ccman/claude.json`
  - `gemini` → `.ccman/gemini.json`
- `uploadToCloud` / `mergeSync` 中会对上述三种工具逐一：
  - 用 `readJSON(configPath)` 直接读取配置文件；
  - 没有对不存在文件做 `fileExists` 检查。
- CLI 的 `sync` 命令在调用同步前，只显式访问：
  - `createCodexManager()`、`createClaudeManager()` → 确保 Codex/Claude 的 ccman 配置文件存在；
  - 没有访问 `createGeminiManager()`，因此很多机器上实际没有 `.ccman/gemini.json`。

**后果：**

- 在从未使用 `ccman gm` 的环境中，执行：
  - `ccman sync upload`
  - `ccman sync merge`
  会因为读取 `.ccman/gemini.json` 触发 `ENOENT` 异常，使整个同步失败。
- Desktop 侧通常不会出现这个问题，因为应用启动后 Main 进程会通过 IPC 调用 `createGeminiManager()` 系列 API，从而创建 `gemini.json`。
- CLI 输出中对同步对象的描述仍然只强调 Codex / Claude，没提 Gemini，但内部已经尝试同步 Gemini，这在 UX 层面也不一致。

**建议方向：**

- 在 CLI 的 `sync upload/merge` 中，调用一次 `createGeminiManager().list()` 以确保 `gemini.json` 存在；或：
- 在 `sync-v2.ts` 中对不存在的配置文件做 `fileExists` 检查，缺失则跳过该工具的同步。

---

## 3. MCP 管理设计复杂且 CLI 能力不对称

相关代码：`packages/core/src/tool-manager.ts`、`packages/core/src/writers/mcp.ts`、Desktop Main/Renderer MCP 相关代码。

### 3.1 数据结构层面

- ccman 内部统一使用 `Provider` 结构管理服务商（`packages/types/src/index.ts`）。
- 对 MCP：
  - 在 ToolManager 层表现为普通 Provider：`baseUrl`、`apiKey`、`model`。
  - 在持久化层（`~/.ccman/mcp.json`）则是 `MCPConfig` / `MCPServer` 结构（`writers/mcp.ts`）。
  - 映射规则比较“绕”：
    - `baseUrl` → MCP 的 `command`
    - `apiKey` → MCP 的 `args`（空格分隔字符串）
    - `model` → JSON 包含 `{ env, description }`，甚至还向后兼容“直接把 JSON 解析为 env”的旧写法。

### 3.2 多应用启用状态

- `MCPConfig` 支持 `enabledApps: AppType[]` 与 `managedServerNames: Record<AppType, string[]>`，可以让一个 MCP 服务同时作用于 `claude/codex/gemini`。
- `writeMCPConfigForApp(app, _)` 会把 ccman 管理的 MCP 写入各工具的官方配置：
  - `app='claude'` → `~/.claude/settings.json` 的 `mcpServers`。
  - `app='gemini'` → `~/.gemini/settings.json` 的 `mcpServers`。
  - `app='codex'` 当前直接 `return`（Codex 暂不支持 MCP）。
- Desktop 通过 IPC（`mcp:toggle-app` / `mcp:get-app-status`）暴露了启用开关，可以从界面上配置 MCP 在 `claude/gemini` 等工具中的启用状态。

### 3.3 CLI 侧的不对称

- ToolManager 的 `TOOL_CONFIGS.mcp` 配置中：
  - `writer: writeMCPConfig`
  - `autoSync: true`
  - 而 `writeMCPConfig` 当前只是一个「向后兼容」的包装：直接调用 `writeMCPConfigForApp('claude', _provider)`。
- CLI 的 `ccman mcp` 子命令只提供：
  - `add` / `list` / `edit` / `remove`。
  - 没有任何针对 AppType（claude/gemini）的启用/禁用控制。

**实际效果：**

- 从 CLI 添加/修改 MCP 时，配置会自动同步到 Claude（`~/.claude/settings.json`），但不会同步到 Gemini。
- 只有 Desktop UI 中的 MCP 页面支持勾选“在 Claude / Gemini 中启用该 MCP 服务器”。

**风险：**

- 逻辑路径较长：Provider ↔ MCPServer ↔ 每个应用的官方配置，且存在多层向后兼容逻辑，缺少针对 MCP 的独立测试覆盖。
- CLI 与 Desktop 的能力不对称，用户如果只用 CLI 可能以为 MCP 会自动生效于所有支持的应用，实际上默认只影响 Claude。

---

## 4. 预设与文案不一致

相关代码：`packages/core/src/presets/*.ts`、`README.md`。

- README / CLI README 中仍使用统一描述：“内置 7 个常用服务商模板，只需填写 API Key”。
- 实际预设情况：
  - Claude：`presets/claude.ts` 确实有 7 个预设（Anthropic / AnyRouter / PackyCode / 88Code / KKYYXX / BigModel / ModelScope）。
  - Codex：`presets/codex.ts` 只有一个预设（88Code）。
  - Gemini：`presets/gemini.ts` 有 3 个预设（Google Gemini / PackyAPI / LiteLLM Proxy）。
  - MCP：`presets/mcp.ts` 单独维护多个 MCP 预设（filesystem/github/postgres 等），但用户文档几乎未提及。

**问题：**

- 对不同工具的预设数量和性质已经明显不同，再用一个“7 个模板”的统一数字会误导用户。

---

## 5. 测试与工具支持的非对称性

相关代码：`packages/core/src/writers/gemini.test.ts`、`paths.ts` 等。

- Gemini Writer 已经有 Vitest 测试，覆盖了：
  - 创建 `settings.json` / `.env`。
  - 解析 `provider.model` 为 JSON 元数据并合并 env。
  - 保留已有 `settings.json` 中的无关字段。
- 但路径注入能力（`__setTestPaths`）目前只显式支持 `ccman/codex/claude`，Gemini 目录则是通过「清理默认路径目录」的方式绕过，这比其他工具 fragile。
- MCP 相关逻辑（`writers/mcp.ts` + ToolManager + Desktop MCP 页面）目前缺乏针对性的单元测试，主要依赖手工测试和逻辑推断。

**风险：**

- MCP 是系统里最复杂的一块（涉及多应用、迁移、自动同步），没有测试的情况下很容易在重构或新增功能时引入回归。

---

## 6. 相关 UX 问题（与三工具/MCP 直接相关）

这里只列出和你当前关注范围相关的几个点，其它更全面的 UX 建议见 `analysis/D-工程质量与缺陷分析.md` / `analysis/E-优化与演进建议.md`。

- CLI 主菜单中仍然保留了一些“预置服务商管理”之类的 WIP 功能，实际实现只是输出“即将推出”，容易产生误解。
- 清理工具：
  - 项目级删除（`deleteProjectHistory`）会备份；
  - 单条历史删除（`deleteHistoryEntry`）和清空项目历史（`clearProjectHistory`）明确“不备份”；
  - 这一差异在 Desktop 界面中没有被显式强调，误删后恢复难度较高。
- 导入导出与 WebDAV 同步共同操作 `~/.ccman/*.json`，但缺少统一的状态/冲突提示：
  - 用户可能在同步中途执行导入，或下载覆盖后再导入，导致最终状态不易判断。

---

## 7. 建议的处理优先级（摘要）

结合以上问题，建议优先顺序如下（详细方案可以在需要时再拆文档）：

1. **文档与对外描述对齐现实**
   - 更新 README / CLI README / `package.json` 描述，明确支持 Codex / Claude Code / Gemini CLI + MCP。
   - 统一安装与使用说明中的命令与子命令列表（加入 `gm` / `mcp`）。

2. **修复 WebDAV + Gemini 的 CLI Bug**
   - 在 CLI `sync` 命令中补一次 `createGeminiManager()` 调用，或在 Sync 核心逻辑中对缺失配置文件做 graceful skip。

3. **明确 MCP 的适用范围与 CLI 能力**
   - 文档中清晰说明：
     - MCP 当前默认只自动写入 Claude；
     - 多应用启用（Claude / Gemini）需要通过 Desktop 的 MCP 页面控制。
   - 如果后续要加强 CLI，对 MCP 增加 app 级别开关命令。

4. **为 MCP 与 Sync 增加基本测试**
   - 从工具管理（add/edit/remove/switch）和三种同步模式开始，先在 Core 层建立最小测试集。

5. **逐步修正 UX 细节**
   - WIP 菜单项要么隐藏，要么标注为「实验性/即将推出」。
   - 清理工具中明确哪些操作会备份，必要时提供“最近备份列表 + 一键恢复”。

以上问题和建议都是基于当前源码状态总结，后续改动可以在本文件上继续追加小节或更新条目，以保持「问题与演进状态」的一致视图。


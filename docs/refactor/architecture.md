# 重构总体架构设计（core/cli/desktop）

## 目标与约束
- 彻底摒弃现有硬编码/分支式逻辑，改为“工具描述 + 能力驱动”架构，新增工具仅需提供描述与适配器。
- 统一三类行为：服务商（Provider）、MCP、配置文件；所有工具暴露一致 API。
- 保留当前全部功能（见 `docs/refactor/current-capabilities.md`），并保持零破坏写入、安全备份、权限 0600。
- 支撑后续新增工具（如 codebuddy-cli）与未来 WebDAV/同步扩展。

## 1. 环境/路径策略（防止开发/测试污染正式）
- 根目录决策顺序（可持久化且不依赖进程 ID）：
  1) 显式环境变量 `CCMAN_ROOT`（覆盖一切；适合 CI/本地定制）。
  2) `.ccmanrc`/`ccman.paths.json`（位于用户 Home，可由 CLI `ccman config set-root <path>` 写入；进程重启仍生效）。
  3) `NODE_ENV=test` → `/tmp/ccman-test`（固定，不随 PID 变化，测试自行清理）。
  4) `NODE_ENV=development` → `/tmp/ccman-dev`（与现实现象一致但可持久化）。
  5) 默认生产 → `os.homedir()`.
- 所有工具路径都基于 `rootDir`：`~/.ccman`、`~/.codex`、`~/.claude`、`~/.gemini` 等对应变为 `<rootDir>/.ccman` 等，确保单点切换。
- Core 在初始化时统一 `mkdir -p`（0o700）；缺省文件按需创建（见下一节）。
- CLI/desktop 显示当前根目录，并允许提示切换；同步/导入导出使用相同根。

## 2. 缺失目录/文件的自愈与容错
- 所有读取入口（Provider/MCP/Config/WebDAV）在找不到文件时返回空结构并创建目录，不抛错。
- 写入流程：若目标文件不存在，先落地模板/空对象，再执行合并写入；依旧遵循备份→临时文件→rename。
- 锁与权限：`proper-lockfile` 作用于最终文件；新建文件默认 0o600，目录 0o700。
- 对外 API 保证“无论初始是否存在文件，都能完成 add/apply 操作”，避免首启崩溃。

## 3. 默认模板与合并策略
- 每个 ToolDescriptor 声明官方配置模板（硬盘内置文件而非 JS 字符串），例如：
  - Codex: `packages/core/templates/codex/config.toml`
  - Claude: `packages/core/templates/claude/settings.json`
  - 其他工具按 `packages/core/templates/<tool>/...` 放置原生格式文件
- ConfigAdapter 负责：
  - 读取模板 → 替换占位符（若有）→ 作为 base
  - 若目标存在，执行深度合并（默认 `old-override-new`，可由调用方传 `MergeMode` 覆盖）
  - 写入时仅覆盖托管字段，保留用户自定义
- 这样既满足“有默认配置可覆盖/合并”，又避免直接抛错或破坏用户文件。

## 分层与模块
- **Domain 层**：纯类型与实体（Tool, Provider, MCPServer, ConfigPath, WebDavProfile, MergePlan），无 IO。
- **Tool Drivers 层**：每个工具提供 `ConfigAdapter`、`ServiceAdapter`、`McpAdapter`（可选），负责把统一模型映射到官方配置文件。
- **Core Services 层**：工具无关的用例服务，依赖 Tool Drivers：
  - `ToolRegistry`：注册/发现工具描述，提供动态加载（基于文件表/约定路径）。
  - `ProviderService`：增/删/改/查/克隆/应用（跨工具统一）。
  - `McpService`：增/删/改/查/应用；支持跨工具启用矩阵。
  - `ConfigService`：列路径、读配置快照、合并写入（可选 merge 策略）。
  - `SyncService`：WebDAV 测试/上传/下载/合并，封装加解密与备份。
  - `ToolOrchestrator`：封装 “通过 ccman 统一管理其它工具” 的复合操作。
- **Adapters 层**：文件系统、加密、WebDAV 客户端、锁、模板解析、路径解析。
- **Interface 层**：
  - CLI：命令定义 + 交互视图，仅调用 Core Services。
  - Desktop：IPC handler + renderer hooks，复用 Core Services。

## Tool Descriptor（新增核心概念）
```ts
interface ToolDescriptor {
  id: Tool;                    // 'ccman' | 'claude-code' | 'codex' | 'gemini-cli' | 'codebuddy-cli' ...
  short: string;               // cc / cx / gc / cb ...
  displayName: string;
  configPaths: ConfigPath[];   // {id, path, format, scope:'user'|'project'|'system', readonly?:boolean}
  templates?: TemplateSpec[];  // 文件模板及占位符
  adapters: {
    config?: ConfigAdapter;    // 读/写/merge 官方配置
    service?: ServiceAdapter;  // 读/写 Provider→官方配置，校验必填字段
    mcp?: McpAdapter;          // 可选，若工具支持 MCP
  };
  presets?: PresetSpec[];      // 服务商/模板预置
  capabilities: ('service'|'mcp'|'config')[];
}
```
- **注册方式**：`packages/core/tools/<id>/descriptor.ts` 输出描述，`ToolRegistry` 自动聚合（文件名即 id）。新增工具只需添加目录与适配器实现。

## 关键数据流
- **服务商应用**：`ProviderService.apply(tool, name)` → 读取 ccman 存储 → 调用对应 `ServiceAdapter.writeOfficial` → 同步更新 ccman 状态。
- **MCP 应用**：`McpService.apply(tool, name)` → 由工具 `McpAdapter` 写入官方配置（Claude/Gemini），并更新启用矩阵。
- **配置读取/更新**：`ConfigService.get(tool, pathId?)` 读取并返回结构化对象；`update` 支持 `mode: 'new-override-old'|'old-override-new'`。
- **WebDAV 合并**：`SyncService.merge()` 拉取云/本地快照 → 调用 `MergePlanner` 生成差异 → 按工具调用 Provider/MCP/Config 写回 → 上传 & 备份。

## 扩展流程（新增工具示例）
1) 在 `packages/core/tools/<id>/descriptor.ts` 声明 ToolDescriptor（路径、模板、capabilities）。
2) 提供 `config.ts`/`service.ts`/`mcp.ts` 适配器：实现读写与字段映射。
3) 如需预设，添加 `presets.ts`。
4) CLI：在命令注册表中读取 `ToolRegistry` 自动生成 `add/list/use/current/edit/remove/clone` 子命令；仅补充用户文案。
5) Desktop：UI 读取 `ToolRegistry` 渲染菜单；复用统一 hooks。

## CLI/桌面耦合策略
- CLI 与 Desktop 不再直依赖具体 writer，全部经 `ToolRegistry` + Core Services。
- 命令/界面动态驱动：根据 `capabilities` 判断是否显示服务商/MCP/配置操作。
- 错误模型统一：核心抛结构化错误码（如 `TOOL_NOT_FOUND`, `PROVIDER_NOT_FOUND`, `CONFIG_WRITE_FAILED`），界面做人性化提示。

## 4. ASCII 架构示意

### 4.1 分层总览
```
┌──────────────────────────────┐
│        Interface 层          │
│  CLI Commands   Desktop IPC  │
└───────────────▲──────────────┘
                │ 调用 Core API
┌───────────────┴──────────────┐
│        Core Services         │
│ Provider/Mcp/Config/Sync/... │
└───────────────▲──────────────┘
                │ 调度
┌───────────────┴──────────────┐
│        Tool Drivers          │
│  ConfigAdapter ServiceAdapter│
│  McpAdapter (可选)           │
└───────────────▲──────────────┘
                │ 读取描述
┌───────────────┴──────────────┐
│        ToolRegistry          │
│  descriptor & presets loader │
└───────────────▲──────────────┘
                │ 文件/网络
┌───────────────┴──────────────┐
│ Adapters (fs, lock, webdav)  │
│ Templates, Paths, Crypto     │
└───────────────┴──────────────┘
```

### 4.2 服务商应用链路
```
CLI/Desktop
   │ applyService(tool,name)
   ▼
Core ProviderService
   │ 查 ToolRegistry → 获取 ServiceAdapter
   │ 读 ccman 存储 (rootDir/.ccman/<tool>.json)
   │ 校验/锁/备份
   ▼
ServiceAdapter.writeOfficial
   │ 合并模板 → 写官方配置 (rootDir/.codex|.claude|.gemini)
   ▼
返回结果 & 更新 currentProviderId/lastUsedAt
```

### 4.3 WebDAV 合并链路
```
SyncService.merge
   │ 拉云端包 → 解密 → 取本地快照
   │ MergePlanner 分域(diff Providers / MCP / Config)
   │ 对每一类调用 ProviderService / McpService / ConfigService
   │ 写回本地 → 重新加密上传云端
   ▼
SyncReport(新增/更新/删除/冲突/备份路径)
```

## 5. 包间调用关系（core 对外用法）
- `packages/cli`：在命令实现中直接 `import { ProviderService, McpService, ConfigService, SyncService, setRootDir } from '@ccman/core'`；通过 `ToolRegistry.list()` 生成子命令与帮助文案；CLI 不触碰底层 writers。
- `packages/desktop`：主进程引入同样的 Core API；Preload 仅暴露必要方法（如 `applyService`, `listService`, `sync.upload` 等）给 Renderer；UI 根据 `ToolRegistry` 动态渲染工具与能力。
- 新增工具包（未来）：仅需在 `packages/core/tools/<tool>/descriptor.ts` 声明描述与适配器；CLI/桌面自动识别，无需改自身代码。

## 兼容与安全
- 保持原有零破坏承诺：写前备份、失败回滚、fs.rename 原子替换、权限 0o600。
- 读取/写入路径表支持 `scope`（user/project/system）以兼容 Gemini 多层配置，默认操作 user 层。
- WebDAV 继续 AES-256 加密 API Key，增加校验摘要以检测云/本地偏移。

## 迁移与交付
- 详见 `docs/refactor/migration-plan.md`：阶段性切换，先实现 Core + CLI，再迁 Desktop；提供回滚策略。
- 所有新接口在 `@ccman/types` 暴露，旧接口标记为 deprecated 后移除。 

# Core 重构 API 草案

所有工具暴露一致的同步 API；方法名与参数可调整，但需覆盖下列能力。类型放在 `@ccman/types`.

## 公共类型
```ts
type Tool = 'ccman' | 'claude-code' | 'codex' | 'gemini-cli' | 'mcp' | string; // 预留扩展

interface ProviderInput {
  name: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string | Record<string, any>; // 字符串或 JSON 元数据
  desc?: string;
}

interface Provider extends ProviderInput {
  id: string;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
}

interface MCPServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabledApps: Tool[]; // 哪些工具启用
  desc?: string;
  id: string;
  createdAt: number;
  updatedAt: number;
}

type MergeMode = 'new-override-old' | 'old-override-new';
```

## Tool Registry
```ts
ToolRegistry.list(): ToolDescriptor[]
ToolRegistry.get(tool: Tool): ToolDescriptor
```

## Config API（各工具对官方配置文件）
```ts
listConfigPath(tool: Tool): Record<string, string>; // pathId -> fsPath
getConfig(tool: Tool, pathId?: string): Record<string, unknown> | Record<string, Record<string, unknown>>;
updateConfig(tool: Tool, pathId: string, data: unknown, opts?: { mode?: MergeMode }): void;
setRootDir(root: string): void; // 运行期切换根目录（覆盖 env / rc），CLI/desktop 使用
getRootDir(): string;
```

## 服务商 API（各工具）
```ts
listService(tool: Tool): Provider[];
addService(tool: Tool, name: string, data: ProviderInput): Provider;        // auto id/time
updateService(tool: Tool, name: string, data: Partial<ProviderInput>): Provider;
deleteService(tool: Tool, name: string): void;
applyService(tool: Tool, name: string): Provider;                           // 写 ccman 存储 + 官方配置
cloneService(tool: Tool, sourceName: string, newName: string, overrides?: Partial<ProviderInput>): Provider;
currentService(tool: Tool): Provider | null;                                // 便于 CLI current
```

## MCP API
```ts
listMcp(): MCPServer[];
addMcp(name: string, data: Omit<MCPServer, 'id'|'createdAt'|'updatedAt'>): MCPServer;
updateMcp(name: string, data: Partial<MCPServer>): MCPServer;
deleteMcp(name: string): void;
applyMcp(name: string, targetTools: Tool[]): MCPServer;  // 写入 Claude/Gemini 等的官方配置
```

## 通过 ccman 统一管理其它工具（外部调用首选）
```ts
ccman.applyToolService(tool: Tool, name: string): Provider;
ccman.addToolService(tool: Tool, name: string, data: ProviderInput): Provider;
ccman.updateToolService(tool: Tool, name: string, data: Partial<ProviderInput>): Provider;
ccman.deleteToolService(tool: Tool, name: string): void;

ccman.applyToolMcp(tool: Tool, name: string): MCPServer;
ccman.addToolMcp(tool: Tool, name: string, data: MCPServer): MCPServer;
ccman.updateToolMcp(tool: Tool, name: string, data: Partial<MCPServer>): MCPServer;
ccman.deleteToolMcp(tool: Tool, name: string): void;
```

## WebDAV / 同步 API
```ts
webdav.test(opts: WebDavOptions): Promise<void>; // 仅连通性与认证
webdav.upload(profile?: string): Promise<SyncReport>;
webdav.download(profile?: string): Promise<SyncReport>;
webdav.merge(profile?: string): Promise<SyncReport>; // 云 ↔ 本地智能合并
```
- `SyncReport`：包含变更列表（新增/更新/删除）、备份路径、冲突摘要。
- 合并内部依赖 `MergePlanner`：按工具分别调度 Provider/MCP/Config 写入。

## 错误模型（统一 code）
- `TOOL_NOT_FOUND`
- `SERVICE_NOT_FOUND`
- `MCP_NOT_FOUND`
- `CONFIG_PATH_NOT_FOUND`
- `CONFIG_WRITE_FAILED`
- `VALIDATION_FAILED`
- `SYNC_CONFLICT`

## 线程安全与原子性
- File-level lock（`proper-lockfile`）在 `updateConfig/applyService/applyMcp` 内透明处理。
- 写入流程：备份 → 临时文件 → rename；出错恢复备份。
- 缺失目录/文件自动创建：目录 0o700，文件 0o600；读取缺省返回空结构。
- 根路径决策顺序：`CCMAN_ROOT` > 持久配置文件（如 `.ccmanrc`）> `NODE_ENV` dev/test > `os.homedir()`。

## 事件/日志（可选）
- `EventBus` 发布领域事件（service.applied, mcp.applied, sync.completed），CLI/桌面订阅用于 UI 更新与 telemetry（文件留空实现，便于未来扩展）。 

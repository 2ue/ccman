# ccman Core API 定义（重构版）

> 所有 Core API 的详细定义和使用示例
>
> **导出位置：** `@ccman/core`

---

## 一、公共类型定义

### 1.1 基础类型

```typescript
// 工具类型
type Tool = 'ccman' | 'claude-code' | 'codex' | 'gemini-cli' | string; // 预留扩展

// 合并模式
type MergeMode = 'new-override-old' | 'old-override-new';

// Provider 输入类型
interface ProviderInput {
  name: string;                // 服务商名称（必填）
  baseUrl?: string;            // API Base URL（可选，Gemini 可为空）
  apiKey?: string;             // API Key（可选，Gemini 可为空）
  model?: string | Record<string, any>; // 模型信息（字符串或 JSON 元数据）
  desc?: string;               // 描述（可选）
}

// Provider 完整类型
interface Provider extends ProviderInput {
  id: string;                  // 自动生成的唯一 ID
  createdAt: number;           // 创建时间戳
  updatedAt: number;           // 更新时间戳
  lastUsedAt?: number;         // 最后使用时间戳
}

// MCP 服务器输入类型
interface MCPServerInput {
  name: string;                // 服务器名称（必填）
  command: string;             // 启动命令（必填）
  args?: string[];             // 命令参数（可选）
  env?: Record<string, string>; // 环境变量（可选）
  enabledApps?: Tool[];        // 启用的工具列表（可选，默认 []）
  desc?: string;               // 描述（可选）
}

// MCP 服务器完整类型
interface MCPServer extends MCPServerInput {
  id: string;                  // 自动生成的唯一 ID
  enabledApps: Tool[];         // 启用的工具列表（非空数组）
  createdAt: number;           // 创建时间戳
  updatedAt: number;           // 更新时间戳
}
```

---

## 二、ToolRegistry API

### 2.1 接口定义

```typescript
class ToolRegistry {
  /**
   * 注册工具描述符
   */
  register(descriptor: ToolDescriptor): void;

  /**
   * 获取工具描述符
   * @throws {Error} 如果工具不存在
   */
  get(tool: Tool): ToolDescriptor;

  /**
   * 列出所有工具
   */
  list(): ToolDescriptor[];

  /**
   * 检查工具是否存在
   */
  has(tool: Tool): boolean;

  /**
   * 根据短名称查找工具
   */
  getByShort(short: string): ToolDescriptor | undefined;

  /**
   * 根据能力筛选工具
   */
  filterByCapability(capability: 'service' | 'mcp' | 'config'): ToolDescriptor[];
}
```

### 2.2 使用示例

```typescript
import { ToolRegistry } from '@ccman/core';

// 列出所有工具
const tools = ToolRegistry.list();
console.log(tools.map(t => t.displayName)); // ['Codex', 'Claude Code', 'Gemini CLI', ...]

// 获取工具描述符
const codexDesc = ToolRegistry.get('codex');
console.log(codexDesc.short);  // 'cx'
console.log(codexDesc.capabilities);  // ['service', 'config']

// 根据短名称查找
const ccDesc = ToolRegistry.getByShort('cc');
console.log(ccDesc.id);  // 'claude-code'

// 筛选支持 MCP 的工具
const mcpTools = ToolRegistry.filterByCapability('mcp');
console.log(mcpTools.map(t => t.id));  // ['claude-code', 'gemini-cli']
```

---

## 三、ProviderService API

### 3.1 接口定义

```typescript
class ProviderService {
  /**
   * 列出所有服务商
   */
  list(tool: Tool): Provider[];

  /**
   * 添加服务商（自动生成 ID 和时间戳）
   */
  add(tool: Tool, input: ProviderInput): Provider;

  /**
   * 更新服务商（自动更新 updatedAt）
   */
  update(tool: Tool, name: string, data: Partial<ProviderInput>): Provider;

  /**
   * 删除服务商
   * @throws {Error} 如果服务商不存在
   */
  delete(tool: Tool, name: string): void;

  /**
   * 应用服务商（写入官方配置，更新 lastUsedAt 和 currentProviderId）
   * @throws {Error} 如果服务商不存在或工具不支持 service
   */
  apply(tool: Tool, name: string): Provider;

  /**
   * 克隆服务商（生成新 ID，可覆盖部分字段）
   */
  clone(
    tool: Tool,
    sourceName: string,
    newName: string,
    overrides?: Partial<ProviderInput>
  ): Provider;

  /**
   * 获取当前服务商
   * @returns null 如果没有当前服务商
   */
  current(tool: Tool): Provider | null;

  /**
   * 根据 ID 获取服务商
   * @throws {Error} 如果服务商不存在
   */
  get(tool: Tool, id: string): Provider;

  /**
   * 根据 name 查找服务商
   */
  findByName(tool: Tool, name: string): Provider | undefined;
}
```

### 3.2 使用示例

#### 示例 1：添加服务商

```typescript
import { ProviderService } from '@ccman/core';

// 添加服务商
const provider = ProviderService.add('claude-code', {
  name: 'my-claude',
  baseUrl: 'https://api.anthropic.com',
  apiKey: 'sk-ant-xxx',
  desc: '我的 Claude 服务商',
});

console.log(provider);
// {
//   id: 'claude-1733556789000-abc123',
//   name: 'my-claude',
//   baseUrl: 'https://api.anthropic.com',
//   apiKey: 'sk-ant-xxx',
//   desc: '我的 Claude 服务商',
//   createdAt: 1733556789000,
//   updatedAt: 1733556789000
// }
```

#### 示例 2：应用服务商

```typescript
// 应用服务商（会同时更新 ccman 存储和 ~/.claude/settings.json）
const applied = ProviderService.apply('claude-code', 'my-claude');

console.log(applied.lastUsedAt);  // 1733556790000

// 验证官方配置已更新
import fs from 'fs';
const settings = JSON.parse(fs.readFileSync('~/.claude/settings.json', 'utf-8'));
console.log(settings.env.ANTHROPIC_AUTH_TOKEN);  // 'sk-ant-xxx'
console.log(settings.env.ANTHROPIC_BASE_URL);    // 'https://api.anthropic.com'
```

#### 示例 3：克隆服务商

```typescript
// 克隆现有服务商，修改 API Key
const cloned = ProviderService.clone('claude-code', 'my-claude', 'my-claude-key2', {
  apiKey: 'sk-ant-yyy',
});

console.log(cloned);
// {
//   id: 'claude-1733556800000-def456',  // 新 ID
//   name: 'my-claude-key2',
//   baseUrl: 'https://api.anthropic.com',  // 继承原服务商
//   apiKey: 'sk-ant-yyy',                  // 覆盖
//   desc: '我的 Claude 服务商',            // 继承原服务商
//   createdAt: 1733556800000,
//   updatedAt: 1733556800000
// }
```

#### 示例 4：列出和查询

```typescript
// 列出所有服务商
const providers = ProviderService.list('claude-code');
console.log(providers.length);  // 2

// 获取当前服务商
const current = ProviderService.current('claude-code');
console.log(current?.name);  // 'my-claude'

// 根据 name 查找
const found = ProviderService.findByName('claude-code', 'my-claude-key2');
console.log(found?.id);  // 'claude-1733556800000-def456'
```

---

## 四、McpService API

### 4.1 接口定义

```typescript
class McpService {
  /**
   * 列出所有 MCP 服务器
   */
  list(): MCPServer[];

  /**
   * 添加 MCP 服务器（自动生成 ID 和时间戳）
   */
  add(input: MCPServerInput): MCPServer;

  /**
   * 更新 MCP 服务器（自动更新 updatedAt）
   */
  update(name: string, data: Partial<MCPServerInput>): MCPServer;

  /**
   * 删除 MCP 服务器
   * @throws {Error} 如果 MCP 不存在
   */
  delete(name: string): void;

  /**
   * 应用 MCP 到指定工具（写入官方配置）
   * @throws {Error} 如果 MCP 不存在或工具不支持 mcp
   */
  apply(name: string, targetTools: Tool[]): MCPServer;

  /**
   * 获取 MCP 启用的工具列表
   */
  getEnabledApps(name: string): Tool[];

  /**
   * 根据 ID 获取 MCP 服务器
   * @throws {Error} 如果 MCP 不存在
   */
  get(id: string): MCPServer;

  /**
   * 根据 name 查找 MCP 服务器
   */
  findByName(name: string): MCPServer | undefined;
}
```

### 4.2 使用示例

#### 示例 1：添加 MCP 服务器

```typescript
import { McpService } from '@ccman/core';

// 添加 MCP 服务器
const server = McpService.add({
  name: 'filesystem',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed'],
  enabledApps: ['claude-code', 'gemini-cli'],
  desc: '文件系统访问',
});

console.log(server);
// {
//   id: 'mcp-1733556789000-abc123',
//   name: 'filesystem',
//   command: 'npx',
//   args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed'],
//   enabledApps: ['claude-code', 'gemini-cli'],
//   desc: '文件系统访问',
//   createdAt: 1733556789000,
//   updatedAt: 1733556789000
// }
```

#### 示例 2：应用 MCP 到工具

```typescript
// 应用 MCP（会同时更新 ccman 存储、~/.claude/settings.json、~/.gemini/settings.json）
const applied = McpService.apply('filesystem', ['claude-code', 'gemini-cli']);

console.log(applied.enabledApps);  // ['claude-code', 'gemini-cli']

// 验证官方配置已更新
const claudeSettings = JSON.parse(fs.readFileSync('~/.claude/settings.json', 'utf-8'));
console.log(claudeSettings.mcpServers.filesystem);
// {
//   command: 'npx',
//   args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed']
// }
```

#### 示例 3：更新 MCP 启用状态

```typescript
// 只启用 Claude，禁用 Gemini
McpService.update('filesystem', {
  enabledApps: ['claude-code'],
});

// 应用更新
McpService.apply('filesystem', ['claude-code']);

// 现在 ~/.gemini/settings.json 的 mcpServers 中不再有 filesystem
```

---

## 五、ConfigService API

### 5.1 接口定义

```typescript
class ConfigService {
  /**
   * 列出工具的所有配置文件路径
   * @returns { pathId: fsPath } 映射
   */
  listPaths(tool: Tool): Record<string, string>;

  /**
   * 读取配置文件
   * @param pathId 可选，不传则返回所有配置文件
   */
  get(
    tool: Tool,
    pathId?: string
  ): Record<string, unknown> | Record<string, Record<string, unknown>>;

  /**
   * 更新配置文件（支持深度合并）
   */
  update(
    tool: Tool,
    pathId: string,
    data: unknown,
    opts?: { mode?: MergeMode }
  ): void;
}
```

### 5.2 使用示例

#### 示例 1：列出配置路径

```typescript
import { ConfigService } from '@ccman/core';

// 列出 Codex 的所有配置文件路径
const paths = ConfigService.listPaths('codex');
console.log(paths);
// {
//   main: '/Users/xxx/.codex/config.toml',
//   auth: '/Users/xxx/.codex/auth.json'
// }
```

#### 示例 2：读取配置

```typescript
// 读取所有配置文件
const allConfigs = ConfigService.get('codex');
console.log(allConfigs);
// {
//   main: { model_provider: 'openai', model: 'gpt-5-codex', ... },
//   auth: { OPENAI_API_KEY: 'sk-xxx' }
// }

// 读取单个配置文件
const mainConfig = ConfigService.get('codex', 'main');
console.log(mainConfig.model_provider);  // 'openai'
```

#### 示例 3：更新配置

```typescript
// 更新配置（深度合并，old-override-new）
ConfigService.update('codex', 'main', {
  model_reasoning_effort: 'medium',
  custom_field: 'my-value',
}, { mode: 'old-override-new' });

// 验证更新
const updated = ConfigService.get('codex', 'main');
console.log(updated.model_reasoning_effort);  // 'medium'
console.log(updated.model_provider);  // 'openai' (保留原有字段)
console.log(updated.custom_field);    // 'my-value' (新增字段)
```

---

## 六、ToolOrchestrator API

### 6.1 接口定义

```typescript
class ToolOrchestrator {
  /**
   * 为工具应用服务商（同时更新 ccman 存储 + 工具官方配置）
   */
  applyToolService(tool: Tool, name: string): Provider;

  /**
   * 为工具添加服务商
   */
  addToolService(tool: Tool, input: ProviderInput): Provider;

  /**
   * 为工具更新服务商
   */
  updateToolService(tool: Tool, name: string, data: Partial<ProviderInput>): Provider;

  /**
   * 为工具删除服务商
   */
  deleteToolService(tool: Tool, name: string): void;

  /**
   * 为工具应用 MCP（同时更新 ccman 存储 + 工具官方配置）
   */
  applyToolMcp(name: string, targetTools: Tool[]): MCPServer;

  /**
   * 添加 MCP 服务器
   */
  addToolMcp(input: MCPServerInput): MCPServer;

  /**
   * 更新 MCP 服务器
   */
  updateToolMcp(name: string, data: Partial<MCPServerInput>): MCPServer;

  /**
   * 删除 MCP 服务器
   */
  deleteToolMcp(name: string): void;
}
```

### 6.2 使用示例

**ToolOrchestrator 是最常用的入口 API，建议优先使用。**

```typescript
import { ToolOrchestrator } from '@ccman/core';

// 添加并应用服务商
const provider = ToolOrchestrator.addToolService('claude-code', {
  name: 'my-claude',
  baseUrl: 'https://api.anthropic.com',
  apiKey: 'sk-ant-xxx',
});

ToolOrchestrator.applyToolService('claude-code', 'my-claude');

// 添加并应用 MCP
const server = ToolOrchestrator.addToolMcp({
  name: 'filesystem',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
  enabledApps: ['claude-code'],
});

ToolOrchestrator.applyToolMcp('filesystem', ['claude-code']);
```

---

## 七、路径管理 API

### 7.1 接口定义

```typescript
/**
 * 获取根目录
 * 决策顺序：CCMAN_ROOT > ~/.ccmanrc > NODE_ENV > os.homedir()
 */
function getRootDir(): string;

/**
 * 设置根目录（持久化到 ~/.ccmanrc）
 */
function setRootDir(root: string): void;

/**
 * 重置根目录（删除 ~/.ccmanrc，使用默认逻辑）
 */
function resetRootDir(): void;

// 工具目录
function getCcmanDir(): string;   // <root>/.ccman
function getCodexDir(): string;   // <root>/.codex
function getClaudeDir(): string;  // <root>/.claude
function getGeminiDir(): string;  // <root>/.gemini

// 配置文件路径
function getCodexConfigPath(): string;     // <root>/.codex/config.toml
function getCodexAuthPath(): string;       // <root>/.codex/auth.json
function getClaudeConfigPath(): string;    // <root>/.claude/settings.json
function getGeminiSettingsPath(): string;  // <root>/.gemini/settings.json
function getGeminiEnvPath(): string;       // <root>/.gemini/.env
```

### 7.2 使用示例

```typescript
import { getRootDir, setRootDir, getCcmanDir } from '@ccman/core';

// 查看当前根目录
console.log(getRootDir());  // '/Users/xxx' (默认)

// 切换根目录
setRootDir('/tmp/my-test');
console.log(getRootDir());  // '/tmp/my-test'
console.log(getCcmanDir());  // '/tmp/my-test/.ccman'

// 进程重启后仍然生效（因为持久化到 ~/.ccmanrc）
// ... 重启 ...
console.log(getRootDir());  // '/tmp/my-test'

// 重置为默认
resetRootDir();
console.log(getRootDir());  // '/Users/xxx'
```

---

## 八、同步 API (SyncService)

### 8.1 接口定义

```typescript
/**
 * 测试 WebDAV 连接
 */
function testWebDAVConnection(config: WebDAVConfig): Promise<void>;

/**
 * 上传到云端（覆盖云端）
 */
function uploadToCloud(profile?: string): Promise<SyncReport>;

/**
 * 从云端下载（覆盖本地）
 */
function downloadFromCloud(profile?: string): Promise<SyncReport>;

/**
 * 智能合并（云端 ↔ 本地）
 */
function mergeSync(profile?: string): Promise<SyncReport>;

// 同步报告
interface SyncReport {
  success: boolean;
  added: string[];      // 新增的项
  updated: string[];    // 更新的项
  deleted: string[];    // 删除的项
  conflicts: string[];  // 冲突的项（合并时）
  backupPath: string;   // 备份路径
}
```

### 8.2 使用示例

```typescript
import { uploadToCloud, downloadFromCloud, mergeSync } from '@ccman/core';

// 上传到云端
const report = await uploadToCloud();
console.log(report);
// {
//   success: true,
//   added: [],
//   updated: ['codex.json', 'claude.json'],
//   deleted: [],
//   conflicts: [],
//   backupPath: '/Users/xxx/.ccman/.backup/20251207-123456'
// }

// 从云端下载
await downloadFromCloud();

// 智能合并
const mergeReport = await mergeSync();
console.log(mergeReport.conflicts);  // 显示冲突项
```

---

## 九、导入导出 API

### 9.1 接口定义

```typescript
/**
 * 导出配置到目录
 */
function exportConfig(targetDir?: string): ExportResult;

/**
 * 从目录导入配置
 */
function importConfig(sourceDir: string): ImportResult;

/**
 * 验证导出目录
 */
function validateExport(targetDir: string): ExportValidation;

/**
 * 验证导入目录
 */
function validateImportDir(sourceDir: string): ImportValidation;

interface ExportResult {
  success: boolean;
  exportedFiles: string[];
  targetDir: string;
}

interface ImportResult {
  success: boolean;
  importedFiles: string[];
  backupDir: string;
}
```

### 9.2 使用示例

```typescript
import { exportConfig, importConfig } from '@ccman/core';

// 导出配置
const result = exportConfig('/tmp/backup');
console.log(result.exportedFiles);
// [
//   '/tmp/backup/.ccman/codex.json',
//   '/tmp/backup/.ccman/claude.json',
//   '/tmp/backup/.ccman/gemini.json',
//   '/tmp/backup/.ccman/mcp.json',
//   ...
// ]

// 导入配置
const importResult = importConfig('/tmp/backup');
console.log(importResult.backupDir);  // '/Users/xxx/.ccman/.backup/20251207-123456'
```

---

## 十、错误码与返回约定

### 10.0 统一错误码
| 错误码 | 触发场景 | 建议文案 |
| --- | --- | --- |
| TOOL_NOT_FOUND | ToolRegistry 无匹配工具 | 未找到工具，请检查名称 |
| SERVICE_NOT_FOUND | ProviderService 查无此服务商 | 服务商不存在，请检查名称 |
| MCP_NOT_FOUND | McpService 查无此 MCP | MCP 服务器不存在，请检查名称 |
| CONFIG_PATH_NOT_FOUND | ConfigService 路径 ID 不存在 | 配置路径不存在，请检查命令或 pathId |
| CONFIG_WRITE_FAILED | 写入文件失败（权限/锁/解析） | 写入失败，请重试或检查权限 |
| VALIDATION_FAILED | 必填字段校验未通过 | 参数不合法，请检查输入 |
| SYNC_CONFLICT | WebDAV 合并冲突 | 同步冲突，请手动选择版本 |

### 10.1 典型返回示例

#### applyService
```json
{
  "provider": {
    "id": "claude-1733556789000-abc123",
    "name": "my-claude",
    "baseUrl": "https://api.anthropic.com",
    "apiKey": "sk-ant-xxx",
    "lastUsedAt": 1733556790000
  },
  "writes": [
    "~/.ccman/claude.json",
    "~/.claude/settings.json"
  ],
  "backup": "~/.claude/settings.json.bak-20251207T120000"
}
```

---

## 十一、错误处理

### 11.1 错误类型

```typescript
// 工具不存在
class ToolNotFoundError extends Error {
  constructor(tool: Tool) {
    super(`Tool not found: ${tool}`);
    this.name = 'ToolNotFoundError';
  }
}

// 服务商不存在
class ProviderNotFoundError extends Error {
  constructor(id: string) {
    super(`Provider not found: ${id}`);
    this.name = 'ProviderNotFoundError';
  }
}

// MCP 不存在
class McpNotFoundError extends Error {
  constructor(name: string) {
    super(`MCP server not found: ${name}`);
    this.name = 'McpNotFoundError';
  }
}

// 配置路径不存在
class ConfigPathNotFoundError extends Error {
  constructor(tool: Tool, pathId: string) {
    super(`Config path not found: ${tool}.${pathId}`);
    this.name = 'ConfigPathNotFoundError';
  }
}

// 配置写入失败
class ConfigWriteFailedError extends Error {
  constructor(path: string, reason: string) {
    super(`Config write failed: ${path} - ${reason}`);
    this.name = 'ConfigWriteFailedError';
  }
}

// 验证失败
class ValidationFailedError extends Error {
  constructor(field: string, reason: string) {
    super(`Validation failed: ${field} - ${reason}`);
    this.name = 'ValidationFailedError';
  }
}

// 同步冲突
class SyncConflictError extends Error {
  constructor(conflicts: string[]) {
    super(`Sync conflict: ${conflicts.join(', ')}`);
    this.name = 'SyncConflictError';
  }
}
```

### 11.2 错误处理示例

```typescript
import { ProviderService, ProviderNotFoundError } from '@ccman/core';

try {
  ProviderService.apply('claude-code', 'non-existent');
} catch (error) {
  if (error instanceof ProviderNotFoundError) {
    console.error('服务商不存在，请检查名称');
  } else {
    console.error('未知错误:', error.message);
  }
}
```

---

**下一步：** 查看 [新工具添加指南](./03-新工具添加指南.md)

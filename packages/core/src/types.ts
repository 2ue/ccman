/**
 * 新架构类型定义
 *
 * 这个文件定义了插件化架构的所有核心类型
 */

// =============================================================================
// Tool Types
// =============================================================================

/**
 * 工具类型（扩展为支持任意字符串以允许新工具）
 */
export type Tool = 'ccman' | 'claude-code' | 'codex' | 'gemini-cli' | string

/**
 * 合并模式
 * - 'old-override-new': 老配置优先（保留用户自定义）
 * - 'new-override-old': 新配置优先（覆盖用户自定义）
 */
export type MergeMode = 'old-override-new' | 'new-override-old'

/**
 * 配置文件格式
 */
export type ConfigFormat = 'json' | 'toml' | 'env'

/**
 * 配置文件作用域
 */
export type ConfigScope = 'user' | 'project' | 'system'

// =============================================================================
// Provider Types
// =============================================================================

/**
 * Provider 输入类型（用于创建和更新）
 */
export interface ProviderInput {
  name: string // 服务商名称（必填）
  baseUrl?: string // API Base URL（可选，Gemini 可为空）
  apiKey?: string // API Key（可选，Gemini 可为空）
  model?: string | Record<string, any> // 模型信息（字符串或 JSON 元数据）
  desc?: string // 描述（可选）
}

/**
 * Provider 完整类型
 */
export interface Provider extends ProviderInput {
  id: string // 自动生成的唯一 ID
  name: string // 服务商名称
  createdAt: number // 创建时间戳
  updatedAt: number // 更新时间戳
  lastUsedAt?: number // 最后使用时间戳
}

// =============================================================================
// MCP Types
// =============================================================================

/**
 * MCP 服务器输入类型
 */
export interface MCPServerInput {
  name: string // 服务器名称（必填）
  command: string // 启动命令（必填）
  args?: string[] // 命令参数（可选）
  env?: Record<string, string> // 环境变量（可选）
  enabledApps?: Tool[] // 启用的工具列表（可选，默认 []）
  desc?: string // 描述（可选）
}

/**
 * MCP 服务器完整类型
 */
export interface MCPServer extends MCPServerInput {
  id: string // 自动生成的唯一 ID
  enabledApps: Tool[] // 启用的工具列表（非空数组）
  createdAt: number // 创建时间戳
  updatedAt: number // 更新时间戳
}

// =============================================================================
// Tool Configuration Types
// =============================================================================

/**
 * 配置文件路径定义
 */
export interface ConfigPath {
  id: string // 配置文件 ID（如 'main' | 'auth' | 'env'）
  path: string // 文件路径（支持 ~ 展开）
  format: ConfigFormat // 文件格式
  scope?: ConfigScope // 作用域（可选）
  readonly?: boolean // 是否只读（可选）
}

/**
 * 模板规范
 */
export interface TemplateSpec {
  pathId: string // 对应 ConfigPath.id
  templatePath: string // 模板文件路径（相对于 core/templates）
  placeholders?: Record<string, string> // 占位符映射（可选）
}

/**
 * 预设模板
 */
export interface PresetSpec {
  name: string // 预设名称
  baseUrl?: string // Base URL（可选）
  apiKey?: string // API Key（可选）
  model?: string | Record<string, any> // 模型信息
  description: string // 描述
  isBuiltIn: boolean // 是否内置
}

// =============================================================================
// Adapter Interfaces
// =============================================================================

/**
 * 配置文件适配器
 * 负责读/写/合并配置文件
 */
export interface ConfigAdapter {
  /**
   * 读取配置文件
   * @param pathId 配置文件 ID
   * @returns 配置内容（已解析）
   */
  read(pathId: string): unknown

  /**
   * 写入配置文件（支持合并模式）
   * @param pathId 配置文件 ID
   * @param data 要写入的数据
   * @param mode 合并模式（可选，默认 'old-override-new'）
   */
  write(pathId: string, data: unknown, mode?: MergeMode): void

  /**
   * 深度合并配置
   * @param pathId 配置文件 ID
   * @param base 基础配置
   * @param override 覆盖配置
   * @param mode 合并模式
   * @returns 合并后的配置
   */
  merge(pathId: string, base: unknown, override: unknown, mode?: MergeMode): unknown

  /**
   * 验证配置格式（可选）
   * @param pathId 配置文件 ID
   * @param data 要验证的数据
   * @throws {Error} 如果验证失败
   */
  validate?(pathId: string, data: unknown): void
}

/**
 * 服务商适配器
 * 负责将 Provider 映射到工具的官方配置
 */
export interface ServiceAdapter {
  /**
   * 将 Provider 写入工具的官方配置文件
   * @param provider Provider 对象
   */
  writeOfficial(provider: Provider): void

  /**
   * 从官方配置文件读取当前 Provider（可选）
   * @returns 当前 Provider 或 null
   */
  readCurrent?(): Provider | null

  /**
   * 验证 Provider 必填字段
   * @param provider 部分 Provider 对象
   * @throws {Error} 如果验证失败
   */
  validate(provider: Partial<Provider>): void
}

/**
 * MCP 适配器
 * 负责将 MCPServer[] 映射到工具的官方配置
 */
export interface McpAdapter {
  /**
   * 将 MCPServer[] 写入工具的官方配置文件
   * @param servers MCP 服务器列表
   */
  writeOfficial(servers: MCPServer[]): void

  /**
   * 从官方配置文件读取所有 MCP 服务器（可选）
   * @returns MCP 服务器列表
   */
  readAll?(): MCPServer[]

  /**
   * 验证 MCP 配置（可选）
   * @param servers MCP 服务器列表
   * @throws {Error} 如果验证失败
   */
  validate?(servers: MCPServer[]): void
}

// =============================================================================
// Tool Descriptor
// =============================================================================

/**
 * 工具描述符
 * 每个工具必须提供一个 ToolDescriptor 来声明其能力和配置
 */
export interface ToolDescriptor {
  // ========== 基础信息 ==========
  id: Tool // 工具唯一 ID
  short: string // 短名称（用于 CLI），如 'cx' | 'cc' | 'gc'
  displayName: string // 显示名称（用于 UI），如 'Codex' | 'Claude Code'
  description?: string // 工具描述（可选）

  // ========== 配置路径 ==========
  configPaths: ConfigPath[] // 工具的所有配置文件路径

  // ========== 适配器（处理官方配置） ==========
  adapters: {
    config?: ConfigAdapter // 配置文件读/写/合并适配器
    service?: ServiceAdapter // 服务商 → 官方配置的映射适配器
    mcp?: McpAdapter // MCP → 官方配置的映射适配器
  }

  // ========== 模板系统 ==========
  templates?: TemplateSpec[] // 配置文件模板及占位符

  // ========== 预设 ==========
  presets?: PresetSpec[] // 内置的服务商/MCP 预设

  // ========== 能力声明 ==========
  capabilities: ('service' | 'mcp' | 'config')[]
  // - 'service': 支持服务商管理
  // - 'mcp': 支持 MCP 管理
  // - 'config': 支持配置文件管理
}

// =============================================================================
// Tool Config Storage Types
// =============================================================================

/**
 * 工具配置存储格式（在 ~/.ccman/<tool>.json 中）
 */
export interface ToolConfig {
  /** 当前激活的 provider ID */
  currentProviderId?: string
  /** provider 列表 */
  providers: Provider[]
  /** 用户自定义预设列表 */
  presets?: PresetSpec[]
}

// =============================================================================
// Error Types
// =============================================================================

export class ToolNotFoundError extends Error {
  constructor(tool: Tool) {
    super(`Tool not found: ${tool}`)
    this.name = 'ToolNotFoundError'
  }
}

export class ProviderNotFoundError extends Error {
  constructor(id: string) {
    super(`Provider not found: ${id}`)
    this.name = 'ProviderNotFoundError'
  }
}

export class McpNotFoundError extends Error {
  constructor(name: string) {
    super(`MCP server not found: ${name}`)
    this.name = 'McpNotFoundError'
  }
}

export class ConfigPathNotFoundError extends Error {
  constructor(tool: Tool, pathId: string) {
    super(`Config path not found: ${tool}.${pathId}`)
    this.name = 'ConfigPathNotFoundError'
  }
}

export class ConfigWriteFailedError extends Error {
  constructor(path: string, reason: string) {
    super(`Config write failed: ${path} - ${reason}`)
    this.name = 'ConfigWriteFailedError'
  }
}

export class ValidationFailedError extends Error {
  constructor(field: string, reason: string) {
    super(`Validation failed: ${field} - ${reason}`)
    this.name = 'ValidationFailedError'
  }
}

export class SyncConflictError extends Error {
  constructor(conflicts: string[]) {
    super(`Sync conflict: ${conflicts.join(', ')}`)
    this.name = 'SyncConflictError'
  }
}

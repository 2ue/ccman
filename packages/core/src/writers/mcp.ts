import * as fs from 'fs'
import * as path from 'path'
import { getClaudeConfigPath, getCcmanDir, getClaudeDir, getGeminiDir, getGeminiSettingsPath } from '../paths.js'
import { fileExists, readJSON, writeJSON, ensureDir } from '../utils/file.js'
import type { Provider } from '../tool-manager.js'

/**
 * 支持的应用类型
 * 当前仅支持 Claude Code / Codex / Gemini CLI
 */
export type AppType = 'claude' | 'codex' | 'gemini'

/**
 * MCP 服务器配置（存储在 ~/.ccman/mcp.json）
 */
export interface MCPServer {
  /** 唯一标识符 */
  id: string
  /** 服务器名称（写入 ~/.claude.json 的 key）*/
  name: string
  /** 启动命令 */
  command: string
  /** 命令参数 */
  args: string[]
  /** 环境变量（可选）*/
  env?: Record<string, string | number>
  /** 描述（可选）*/
  description?: string
  /** 创建时间 */
  createdAt: number
  /** 最后修改时间 */
  lastModified: number
  /** 启用此 MCP 的应用列表 */
  enabledApps: AppType[]
}

/**
 * ccman MCP 配置文件结构
 */
export interface MCPConfig {
  /** MCP 服务器列表 */
  servers: MCPServer[]
  /** ccman 管理的 MCP 名称列表（按应用分组，用于区分用户手动配置）*/
  managedServerNames: Record<AppType, string[]>
}

/**
 * Claude Code MCP 配置格式（~/.claude.json 中的 mcpServers 字段）
 */
interface ClaudeMCPServers {
  [serverName: string]: {
    command: string
    args: string[]
    env?: Record<string, string | number>
  }
}

/**
 * 获取 MCP 配置文件路径
 */
export function getMCPConfigPath(): string {
  return path.join(getCcmanDir(), 'mcp.json')
}

/**
 * 迁移旧版本配置到新版本（向后兼容）
 *
 * 迁移内容：
 * 1. managedServerNames: string[] → Record<AppType, string[]>
 * 2. servers: 添加 enabledApps 字段（默认为 ['claude']）
 */
export function migrateMCPConfig(config: any): MCPConfig {
  // 迁移 managedServerNames
  if (Array.isArray(config.managedServerNames)) {
    config.managedServerNames = {
      claude: config.managedServerNames,
      codex: [],
      gemini: [],
    }
  } else if (!config.managedServerNames) {
    config.managedServerNames = {
      claude: [],
      codex: [],
      gemini: [],
    }
  }

  // 迁移 servers，添加 enabledApps 字段
  if (config.servers) {
    for (const server of config.servers) {
      if (!server.enabledApps) {
        // 旧配置默认启用 Claude
        server.enabledApps = ['claude']
      }
    }
  } else {
    // 旧版本可能没有 servers 字段(例如只包含 providers/presets)
    // 为了兼容,显式初始化为空数组,避免上层拿到 undefined
    config.servers = []
  }

  return config as MCPConfig
}

/**
 * 加载 MCP 配置（自动迁移旧版本配置）
 */
export function loadMCPConfig(): MCPConfig {
  const configPath = getMCPConfigPath()
  if (!fileExists(configPath)) {
    return {
      servers: [],
      managedServerNames: {
        claude: [],
        codex: [],
        gemini: [],
      },
    }
  }
  const config = readJSON<any>(configPath)
  return migrateMCPConfig(config)
}

/**
 * 保存 MCP 配置
 */
export function saveMCPConfig(config: MCPConfig): void {
  const configPath = getMCPConfigPath()
  writeJSON(configPath, config)
}

/**
 * 将 Provider 转换为 MCPServer
 *
 * 字段映射：
 * - baseUrl → command
 * - apiKey → args (空格分隔的字符串)
 * - model → { env, description } (JSON 字符串)
 */
export function providerToMCPServer(provider: Provider): MCPServer {
  // 从 model 字段中解析 env 和 description
  let env: Record<string, string | number> | undefined
  let description: string | undefined

  if (provider.model) {
    try {
      const modelData = JSON.parse(provider.model)
      env = modelData.env
      description = modelData.description
    } catch (error) {
      // 向后兼容：如果 model 不是 JSON 对象，尝试作为 env 解析
      env = JSON.parse(provider.model)
    }
  }

  return {
    id: provider.id,
    name: provider.name,
    command: provider.baseUrl,
    args: provider.apiKey.split(' ').filter((arg) => arg.length > 0),
    env,
    description,
    createdAt: provider.createdAt,
    lastModified: provider.lastModified,
    enabledApps: ['claude'], // 新创建的 MCP 默认启用 Claude
  }
}

/**
 * 将 MCPServer 转换为 Provider
 *
 * 字段映射：
 * - command → baseUrl
 * - args → apiKey (空格分隔的字符串)
 * - { env, description } → model (JSON 字符串)
 */
export function mcpServerToProvider(server: MCPServer): Provider {
  // 将 env 和 description 编码到 model 字段
  let model: string | undefined
  if (server.env || server.description) {
    model = JSON.stringify({
      env: server.env,
      description: server.description,
    })
  }

  return {
    id: server.id,
    name: server.name,
    baseUrl: server.command,
    apiKey: server.args.join(' '),
    model,
    createdAt: server.createdAt,
    lastModified: server.lastModified,
  }
}

/**
 * 为指定应用写入 MCP 配置（零破坏性）
 *
 * 策略：
 * 1. 读取 ccman 管理的所有 MCP，过滤出启用了该应用的
 * 2. 读取应用配置文件中现有的 MCP 配置
 * 3. 过滤掉 ccman 管理的 MCP（准备替换）
 * 4. 合并：用户 MCP + ccman MCP
 * 5. 原子写入
 *
 * @param app 应用类型
 * @param _provider 参数为了符合 ToolManager 接口，实际不使用
 */
export function writeMCPConfigForApp(app: AppType, _provider: Provider): void {
  // 1. 读取所有 ccman 管理的 MCP，过滤出启用了该应用的
  const mcpConfig = loadMCPConfig()
  const enabledServers = mcpConfig.servers.filter((server) =>
    server.enabledApps.includes(app)
  )

  // 2. 确定配置文件路径和目录
  let configPath: string
  let configDir: string

  switch (app) {
    case 'claude':
      configPath = getClaudeConfigPath()
      configDir = getClaudeDir()
      break
    case 'codex':
      // Codex 暂不支持 MCP
      return
    case 'gemini':
      configPath = getGeminiSettingsPath()
      configDir = getGeminiDir()
      break
  }

  // 3. 确保配置目录存在
  ensureDir(configDir)

  // 4. 读取应用配置文件
  let appConfig: any = {}

  if (fileExists(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8')
      appConfig = JSON.parse(content)
    } catch (error) {
      throw new Error(`无法读取 ${app} 配置文件: ${(error as Error).message}`)
    }
  }

  // 5. 获取用户手动配置的 MCP（不在 managedServerNames 中）
  const existingMCPs = appConfig.mcpServers || {}
  const userMCPs: ClaudeMCPServers = {}
  const managedNames = mcpConfig.managedServerNames[app] || []

  for (const [name, config] of Object.entries(existingMCPs)) {
    if (!managedNames.includes(name)) {
      userMCPs[name] = config as {
        command: string
        args: string[]
        env?: Record<string, string | number>
      }
    }
  }

  // 6. 转换 ccman MCP 为应用格式
  const ccmanMCPs: ClaudeMCPServers = {}
  for (const server of enabledServers) {
    ccmanMCPs[server.name] = {
      command: server.command,
      args: server.args,
      env: server.env,
    }
  }

  // 7. 合并（ccman 在前，用户在后，用户优先）
  appConfig.mcpServers = {
    ...ccmanMCPs, // ccman 管理的
    ...userMCPs, // 用户手动配置的（优先级更高）
  }

  // 8. 原子写入
  const tempPath = `${configPath}.tmp`
  fs.writeFileSync(tempPath, JSON.stringify(appConfig, null, 2), {
    mode: 0o600,
  })
  fs.renameSync(tempPath, configPath)
}

/**
 * 写入 MCP 配置到 ~/.claude.json（向后兼容接口）
 *
 * 注意：这个函数在任何 MCP 操作后都会被调用，确保配置同步
 * 默认写入 Claude Code 配置
 *
 * @param _provider 参数为了符合 ToolManager 接口，实际不使用
 */
export function writeMCPConfig(_provider: Provider): void {
  writeMCPConfigForApp('claude', _provider)
}

/**
 * 切换 MCP 在指定应用上的启用状态
 *
 * @param mcpId MCP 服务器 ID
 * @param app 应用类型
 * @param enabled 是否启用
 */
export function toggleMCPForApp(mcpId: string, app: AppType, enabled: boolean): void {
  const config = loadMCPConfig()
  const server = config.servers.find((s) => s.id === mcpId)

  if (!server) {
    throw new Error(`MCP 服务器不存在: ${mcpId}`)
  }

  // 更新 server.enabledApps
  if (enabled) {
    if (!server.enabledApps.includes(app)) {
      server.enabledApps.push(app)
    }
  } else {
    server.enabledApps = server.enabledApps.filter((a) => a !== app)
  }

  // 更新 managedServerNames
  if (!config.managedServerNames[app]) {
    config.managedServerNames[app] = []
  }

  if (enabled) {
    if (!config.managedServerNames[app].includes(server.name)) {
      config.managedServerNames[app].push(server.name)
    }
  } else {
    config.managedServerNames[app] = config.managedServerNames[app].filter(
      (name) => name !== server.name
    )
  }

  // 保存配置
  saveMCPConfig(config)

  // 同步到应用配置文件
  writeMCPConfigForApp(app, {} as Provider)
}

/**
 * 获取某个 MCP 在各个应用上的启用状态
 *
 * @param mcpId MCP 服务器 ID
 * @returns 应用启用状态映射
 */
export function getMCPAppStatus(mcpId: string): Record<AppType, boolean> {
  const config = loadMCPConfig()
  const server = config.servers.find((s) => s.id === mcpId)

  if (!server) {
    throw new Error(`MCP 服务器不存在: ${mcpId}`)
  }

  return {
    claude: server.enabledApps.includes('claude'),
    codex: server.enabledApps.includes('codex'),
    gemini: server.enabledApps.includes('gemini'),
  }
}

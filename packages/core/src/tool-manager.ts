/**
 * 工具管理器（Tool Manager）
 *
 * 统一管理 Codex、Claude Code、Gemini CLI、OpenCode、OpenClaw 和 MCP 的服务商配置
 * 采用工厂模式 + 数据驱动设计，零 if-else，易扩展
 *
 * 文件结构：
 * - 类型定义：已拆分至 tool-manager.types.ts（156 行）
 * - 配置映射：TOOL_CONFIGS（数据驱动，~40 行）
 * - 工厂函数：createToolManager（返回 13 个方法，~220 行）
 * - 导出函数：createCodexManager/createClaudeManager/createGeminiManager/createOpenCodeManager/createMCPManager（~20 行）
 *
 * 注：本文件虽然超过 300 行，但每个方法都简单清晰，工厂函数不应拆分
 */
/* eslint-disable max-lines */

import * as path from 'path'
import { getCcmanDir } from './paths.js'
import { readJSON, writeJSON, fileExists, ensureDir } from './utils/file.js'
import { writeCodexConfig } from './writers/codex.js'
import { writeClaudeConfig } from './writers/claude.js'
import {
  writeMCPConfig,
  loadMCPConfig,
  saveMCPConfig,
  providerToMCPServer,
  mcpServerToProvider,
} from './writers/mcp.js'
import { CODEX_PRESETS } from './presets/codex.js'
import { CC_PRESETS } from './presets/claude.js'
import { MCP_PRESETS } from './presets/mcp.js'
import { GEMINI_PRESETS } from './presets/gemini.js'
import { OPENCODE_PRESETS } from './presets/opencode.js'
import { OPENCLAW_PRESETS } from './presets/openclaw.js'
import { writeGeminiConfig } from './writers/gemini.js'
import { writeOpenCodeConfig } from './writers/opencode.js'
import { writeOpenClawConfig } from './writers/openclaw.js'
import type {
  ToolType,
  Provider,
  PresetTemplate,
  InternalPresetTemplate,
  ToolConfig,
  AddProviderInput,
  EditProviderInput,
  AddPresetInput,
  EditPresetInput,
  ToolManager,
} from './tool-manager.types.js'
import {
  ProviderNotFoundError,
  ProviderNameConflictError,
  PresetNameConflictError,
} from './tool-manager.types.js'

// 重新导出类型，保持向后兼容
export type {
  ToolType,
  Provider,
  PresetTemplate,
  AddProviderInput,
  EditProviderInput,
  AddPresetInput,
  EditPresetInput,
  ToolManager,
}
export { ProviderNotFoundError, ProviderNameConflictError, PresetNameConflictError }

/**
 * 工具配置映射（数据驱动，零 if-else）
 *
 * 扩展性：添加新工具只需在此添加配置项
 */
interface ToolConfigMapping {
  configPath: string
  builtinPresets: InternalPresetTemplate[]
  writer: (provider: Provider) => void
  /** 是否在每个操作（add/edit/remove）后自动同步配置 */
  autoSync?: boolean
  /** 自定义配置加载器（可选，用于特殊配置格式如 MCP）*/
  customLoader?: () => ToolConfig
  /** 自定义配置保存器（可选，用于特殊配置格式如 MCP）*/
  customSaver?: (config: ToolConfig) => void
}

const TOOL_CONFIGS: Record<ToolType, ToolConfigMapping> = {
  codex: {
    configPath: path.join(getCcmanDir(), 'codex.json'),
    builtinPresets: CODEX_PRESETS,
    writer: writeCodexConfig,
  },
  claude: {
    configPath: path.join(getCcmanDir(), 'claude.json'),
    builtinPresets: CC_PRESETS,
    writer: writeClaudeConfig,
  },
  mcp: {
    configPath: path.join(getCcmanDir(), 'mcp.json'),
    builtinPresets: MCP_PRESETS,
    writer: writeMCPConfig,
    autoSync: true, // MCP 需要在每个操作后自动同步到 ~/.claude.json
    // MCP 使用特殊的配置格式（MCPConfig），需要自定义 loader/saver
    customLoader: (): ToolConfig => {
      const mcpConfig = loadMCPConfig()
      // 将 MCPServer[] 转换为 Provider[]
      return {
        providers: mcpConfig.servers.map(mcpServerToProvider),
        presets: [],
      }
    },
    customSaver: (config: ToolConfig): void => {
      const mcpConfig = loadMCPConfig()
      // 将 Provider[] 转换为 MCPServer[]，保留 enabledApps 等字段
      mcpConfig.servers = config.providers.map((provider) => {
        // 查找原有的 server 以保留 enabledApps
        const existingServer = mcpConfig.servers.find((s) => s.id === provider.id)
        const mcpServer = providerToMCPServer(provider)
        // 保留原有的 enabledApps，如果不存在则使用新的默认值
        if (existingServer) {
          mcpServer.enabledApps = existingServer.enabledApps
        }
        return mcpServer
      })
      // 更新 managedServerNames（仅支持 claude/codex/gemini）
      for (const app of ['claude', 'codex', 'gemini'] as const) {
        mcpConfig.managedServerNames[app] = mcpConfig.servers
          .filter((s) => s.enabledApps.includes(app))
          .map((s) => s.name)
      }
      saveMCPConfig(mcpConfig)
    },
  },
  gemini: {
    configPath: path.join(getCcmanDir(), 'gemini.json'),
    builtinPresets: GEMINI_PRESETS,
    writer: writeGeminiConfig,
  },
  opencode: {
    configPath: path.join(getCcmanDir(), 'opencode.json'),
    builtinPresets: OPENCODE_PRESETS,
    writer: writeOpenCodeConfig,
  },
  openclaw: {
    configPath: path.join(getCcmanDir(), 'openclaw.json'),
    builtinPresets: OPENCLAW_PRESETS,
    writer: writeOpenClawConfig,
  },
}

/**
 * 统一工具管理器工厂函数（内部实现）
 *
 * 设计原则：
 * - 零 if-else（使用配置映射）
 * - 数据驱动（TOOL_CONFIGS）
 * - 易扩展（添加新工具只需修改 TOOL_CONFIGS）
 *
 * 注：此函数是工厂函数，返回包含 13 个方法的对象，每个方法都简单清晰
 * 函数"长度"来自返回多个方法，而非复杂逻辑，因此禁用 max-lines 检查
 */
// eslint-disable-next-line max-lines-per-function
function createToolManager(tool: ToolType): ToolManager {
  const toolConfig = TOOL_CONFIGS[tool]
  const configPath = toolConfig.configPath

  /**
   * 生成唯一 ID
   * 格式: {tool}-{timestamp}-{random}
   */
  function generateId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${tool}-${timestamp}-${random}`
  }

  /**
   * 加载配置文件
   */
  function loadConfig(): ToolConfig {
    // 使用自定义 loader（如果有）
    if (toolConfig.customLoader) {
      return toolConfig.customLoader()
    }

    // 默认 loader
    if (!fileExists(configPath)) {
      ensureDir(getCcmanDir())
      const initialConfig: ToolConfig = {
        providers: [],
        presets: [],
      }
      writeJSON(configPath, initialConfig)
      return initialConfig
    }

    return readJSON<ToolConfig>(configPath)
  }

  /**
   * 保存配置文件
   */
  function saveConfig(config: ToolConfig): void {
    // 使用自定义 saver（如果有）
    if (toolConfig.customSaver) {
      toolConfig.customSaver(config)
      return
    }

    // 默认 saver
    writeJSON(configPath, config)
  }

  function trimInput(value: string | undefined): string | undefined {
    if (value === undefined) return undefined
    return value.trim()
  }

  function trimProvider(input: AddProviderInput): AddProviderInput {
    return {
      ...input,
      name: input.name.trim(),
      desc: trimInput(input.desc),
      baseUrl: input.baseUrl.trim(),
      apiKey: input.apiKey.trim(),
      model: trimInput(input.model),
    }
  }

  function trimProviderUpdates(updates: EditProviderInput): EditProviderInput {
    return {
      ...updates,
      name: trimInput(updates.name),
      desc: trimInput(updates.desc),
      baseUrl: trimInput(updates.baseUrl),
      apiKey: trimInput(updates.apiKey),
      model: trimInput(updates.model),
    }
  }

  return {
    add(input: AddProviderInput): Provider {
      const config = loadConfig()
      const normalizedInput = trimProvider(input)

      if (!normalizedInput.name) {
        throw new Error('服务商名称不能为空')
      }

      // 检查名称冲突
      const nameExists = config.providers.some((p) => p.name.trim() === normalizedInput.name)
      if (nameExists) {
        throw new ProviderNameConflictError(normalizedInput.name)
      }

      const timestamp = Date.now()
      const provider: Provider = {
        id: generateId(),
        name: normalizedInput.name,
        desc: normalizedInput.desc,
        baseUrl: normalizedInput.baseUrl,
        apiKey: normalizedInput.apiKey,
        model: normalizedInput.model,
        createdAt: timestamp,
        lastModified: timestamp,
      }

      config.providers.push(provider)
      saveConfig(config)

      // 如果配置了自动同步，则立即同步配置
      if (toolConfig.autoSync) {
        toolConfig.writer(provider)
      }

      return provider
    },

    list(): Provider[] {
      const config = loadConfig()
      return config.providers
    },

    get(id: string): Provider {
      const config = loadConfig()
      const provider = config.providers.find((p) => p.id === id)

      if (!provider) {
        throw new ProviderNotFoundError(id)
      }

      return provider
    },

    findByName(name: string): Provider | undefined {
      const config = loadConfig()
      const lowerName = name.trim().toLowerCase()
      if (!lowerName) return undefined
      return config.providers.find((p) => p.name.trim().toLowerCase() === lowerName)
    },

    switch(id: string): void {
      const config = loadConfig()
      const provider = config.providers.find((p) => p.id === id)

      if (!provider) {
        throw new ProviderNotFoundError(id)
      }

      config.currentProviderId = id
      provider.lastUsedAt = Date.now()
      saveConfig(config)

      // 使用配置映射的 writer（零 if-else）
      toolConfig.writer(provider)
    },

    getCurrent(): Provider | null {
      const config = loadConfig()

      if (!config.currentProviderId) {
        return null
      }

      const provider = config.providers.find((p) => p.id === config.currentProviderId)
      return provider || null
    },

    // 注：edit 方法的"复杂度"来自必要的业务逻辑（检查存在性、名称冲突、更新 4 个可选字段、同步配置）
    // 每个 if 都不可避免，没有特殊情况或嵌套逻辑，因此禁用 complexity 检查
    // eslint-disable-next-line complexity
    edit(id: string, updates: EditProviderInput): Provider {
      const config = loadConfig()
      const provider = config.providers.find((p) => p.id === id)
      const normalizedUpdates = trimProviderUpdates(updates)

      if (!provider) {
        throw new ProviderNotFoundError(id)
      }

      if (normalizedUpdates.name !== undefined && !normalizedUpdates.name) {
        throw new Error('服务商名称不能为空')
      }

      // 检查名称冲突
      if (normalizedUpdates.name !== undefined && normalizedUpdates.name !== provider.name.trim()) {
        const nameConflict = config.providers.some(
          (p) => p.id !== id && p.name.trim() === normalizedUpdates.name
        )
        if (nameConflict) {
          throw new ProviderNameConflictError(normalizedUpdates.name)
        }
      }

      // 更新字段
      if (normalizedUpdates.name !== undefined) provider.name = normalizedUpdates.name
      if (normalizedUpdates.desc !== undefined) provider.desc = normalizedUpdates.desc
      if (normalizedUpdates.baseUrl !== undefined) provider.baseUrl = normalizedUpdates.baseUrl
      if (normalizedUpdates.apiKey !== undefined) provider.apiKey = normalizedUpdates.apiKey
      if (normalizedUpdates.model !== undefined) provider.model = normalizedUpdates.model

      provider.lastModified = Date.now()
      saveConfig(config)

      // 如果是当前激活的 provider,重新写入配置
      if (config.currentProviderId === id) {
        toolConfig.writer(provider)
      }

      // 如果配置了自动同步，则立即同步配置（即使不是当前激活的）
      if (toolConfig.autoSync) {
        toolConfig.writer(provider)
      }

      return provider
    },

    remove(id: string): void {
      const config = loadConfig()
      const index = config.providers.findIndex((p) => p.id === id)

      if (index === -1) {
        throw new ProviderNotFoundError(id)
      }

      if (config.currentProviderId === id) {
        config.currentProviderId = undefined
      }

      config.providers.splice(index, 1)
      saveConfig(config)

      // 如果配置了自动同步，则立即同步配置
      if (toolConfig.autoSync) {
        // 传递一个空 provider，writeMCPConfig 会读取所有 providers 并同步
        toolConfig.writer({} as Provider)
      }
    },

    clone(sourceId: string, newName: string): Provider {
      const source = this.get(sourceId)
      const config = loadConfig()
      const normalizedName = newName.trim()

      if (!normalizedName) {
        throw new Error('服务商名称不能为空')
      }

      const nameExists = config.providers.some((p) => p.name.trim() === normalizedName)
      if (nameExists) {
        throw new ProviderNameConflictError(normalizedName)
      }

      const timestamp = Date.now()

      // 使用展开操作符复制所有字段，然后覆盖需要改变的字段
      // 克隆时不继承 desc（显式设置为 undefined）
      const newProvider: Provider = {
        ...source,
        id: generateId(),
        name: normalizedName,
        desc: undefined,
        createdAt: timestamp,
        lastModified: timestamp,
        lastUsedAt: undefined,
      }

      config.providers.push(newProvider)
      saveConfig(config)

      return newProvider
    },

    addPreset(input: AddPresetInput): PresetTemplate {
      const config = loadConfig()
      const normalizedInput: AddPresetInput = {
        ...input,
        name: input.name.trim(),
        baseUrl: input.baseUrl.trim(),
        description: input.description.trim(),
      }

      if (!normalizedInput.name) {
        throw new Error('预置名称不能为空')
      }

      if (!config.presets) {
        config.presets = []
      }

      // 使用配置映射的内置预设（零 if-else）
      const allPresets = [...toolConfig.builtinPresets, ...config.presets]
      const nameExists = allPresets.some((p) => p.name.trim() === normalizedInput.name)
      if (nameExists) {
        throw new PresetNameConflictError(normalizedInput.name)
      }

      const preset: InternalPresetTemplate = {
        name: normalizedInput.name,
        baseUrl: normalizedInput.baseUrl,
        description: normalizedInput.description,
      }

      config.presets.push(preset)
      saveConfig(config)

      // 返回时添加 isBuiltIn 标记
      return {
        ...preset,
        isBuiltIn: false,
      }
    },

    listPresets(): PresetTemplate[] {
      const config = loadConfig()
      const userPresets = config.presets || []

      // 给内置预设添加 isBuiltIn 标记
      const builtinWithFlag = toolConfig.builtinPresets.map((p) => ({
        ...p,
        isBuiltIn: true,
      }))

      // 给用户预设添加 isBuiltIn 标记
      const userWithFlag = userPresets.map((p) => ({
        ...p,
        isBuiltIn: false,
      }))

      return [...builtinWithFlag, ...userWithFlag]
    },

    editPreset(name: string, updates: EditPresetInput): PresetTemplate {
      const config = loadConfig()
      const normalizedName = name.trim()
      const normalizedUpdates: EditPresetInput = {
        ...updates,
        name: trimInput(updates.name),
        baseUrl: trimInput(updates.baseUrl),
        description: trimInput(updates.description),
      }

      if (!config.presets) {
        config.presets = []
      }

      const preset = config.presets.find((p) => p.name.trim() === normalizedName)

      if (!preset) {
        throw new Error(`预置不存在: ${normalizedName}`)
      }

      if (normalizedUpdates.name !== undefined && !normalizedUpdates.name) {
        throw new Error('预置名称不能为空')
      }

      // 检查名称冲突
      if (normalizedUpdates.name !== undefined && normalizedUpdates.name !== preset.name.trim()) {
        const allPresets = [...toolConfig.builtinPresets, ...config.presets]
        const nameConflict = allPresets.some(
          (p) => p.name.trim() !== normalizedName && p.name.trim() === normalizedUpdates.name
        )
        if (nameConflict) {
          throw new PresetNameConflictError(normalizedUpdates.name)
        }
      }

      if (normalizedUpdates.name !== undefined) preset.name = normalizedUpdates.name
      if (normalizedUpdates.baseUrl !== undefined) preset.baseUrl = normalizedUpdates.baseUrl
      if (normalizedUpdates.description !== undefined)
        preset.description = normalizedUpdates.description

      saveConfig(config)

      // 返回时添加 isBuiltIn 标记
      return {
        ...preset,
        isBuiltIn: false,
      }
    },

    removePreset(name: string): void {
      const config = loadConfig()
      const normalizedName = name.trim()

      if (!config.presets) {
        return
      }

      const index = config.presets.findIndex((p) => p.name.trim() === normalizedName)

      if (index === -1) {
        throw new Error(`Preset not found: ${normalizedName}`)
      }

      config.presets.splice(index, 1)
      saveConfig(config)
    },
  }
}

/**
 * 创建 Codex 工具管理器（对外 API）
 */
export function createCodexManager(): ToolManager {
  return createToolManager('codex')
}

/**
 * 创建 Claude 工具管理器（对外 API）
 */
export function createClaudeManager(): ToolManager {
  return createToolManager('claude')
}

/**
 * 创建 MCP 管理器（对外 API）
 */
export function createMCPManager(): ToolManager {
  return createToolManager('mcp')
}

/**
 * 创建 Gemini CLI 管理器（对外 API）
 */
export function createGeminiManager(): ToolManager {
  return createToolManager('gemini')
}

/**
 * 创建 OpenCode 管理器（对外 API）
 */
export function createOpenCodeManager(): ToolManager {
  return createToolManager('opencode')
}

/**
 * 创建 OpenClaw 管理器（对外 API）
 */
export function createOpenClawManager(): ToolManager {
  return createToolManager('openclaw')
}

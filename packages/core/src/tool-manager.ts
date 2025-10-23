import * as path from 'path'
import { getCcmanDir } from './paths.js'
import { readJSON, writeJSON, fileExists, ensureDir } from './utils/file.js'
import { writeCodexConfig } from './writers/codex.js'
import { writeClaudeConfig } from './writers/claude.js'
import { CODEX_PRESETS } from './presets/codex.js'
import { CC_PRESETS } from './presets/claude.js'

/**
 * 工具类型
 */
export type ToolType = 'codex' | 'claude'

/**
 * Provider 配置(不包含 type 字段,因为配置已分离)
 */
export interface Provider {
  /** 唯一标识符(自动生成) */
  id: string
  /** 显示名称 */
  name: string
  /** API Base URL */
  baseUrl: string
  /** API Key */
  apiKey: string
  /** 模型名称(可选,仅 Codex 使用) */
  model?: string
  /** 创建时间(Unix timestamp) */
  createdAt: number
  /** 最后修改时间(Unix timestamp) */
  lastModified: number
  /** 最后使用时间(Unix timestamp,可选) */
  lastUsedAt?: number
}

/**
 * 预置模板(不包含 API Key)
 */
export interface PresetTemplate {
  /** 预设名称 */
  name: string
  /** 默认 Base URL */
  baseUrl: string
  /** 描述 */
  description: string
  /** 是否为内置预设 */
  isBuiltIn: boolean
}

/**
 * 工具配置文件结构
 */
interface ToolConfig {
  /** 当前激活的 provider ID */
  currentProviderId?: string
  /** provider 列表 */
  providers: Provider[]
  /** 用户自定义预置列表（不含 isBuiltIn） */
  presets?: InternalPresetTemplate[]
}

/**
 * 添加 provider 的输入参数
 */
export interface AddProviderInput {
  name: string
  baseUrl: string
  apiKey: string
  model?: string // 可选,仅 Codex 使用
}

/**
 * 编辑 provider 的输入参数
 */
export interface EditProviderInput {
  name?: string
  baseUrl?: string
  apiKey?: string
  model?: string // 可选,仅 Codex 使用
}

/**
 * 添加预置的输入参数
 */
export interface AddPresetInput {
  name: string
  baseUrl: string
  description: string
}

/**
 * 编辑预置的输入参数
 */
export interface EditPresetInput {
  name?: string
  baseUrl?: string
  description?: string
}

/**
 * 工具管理器接口
 */
export interface ToolManager {
  /** 添加 provider */
  add(input: AddProviderInput): Provider
  /** 列出所有 providers */
  list(): Provider[]
  /** 根据 ID 获取 provider */
  get(id: string): Provider
  /** 根据 name 查找 provider */
  findByName(name: string): Provider | undefined
  /** 切换当前 provider */
  switch(id: string): void
  /** 获取当前 provider */
  getCurrent(): Provider | null
  /** 编辑 provider */
  edit(id: string, updates: EditProviderInput): Provider
  /** 删除 provider */
  remove(id: string): void
  /** 克隆 provider */
  clone(sourceId: string, newName: string): Provider

  /** 添加预置 */
  addPreset(input: AddPresetInput): PresetTemplate
  /** 列出所有预置(内置 + 用户) */
  listPresets(): PresetTemplate[]
  /** 编辑预置 */
  editPreset(name: string, updates: EditPresetInput): PresetTemplate
  /** 删除预置 */
  removePreset(name: string): void
}

/**
 * 自定义错误类型
 */
export class ProviderNotFoundError extends Error {
  constructor(id: string) {
    super(`服务商不存在: ${id}`)
    this.name = 'ProviderNotFoundError'
  }
}

export class ProviderNameConflictError extends Error {
  constructor(name: string) {
    super(`服务商名称已存在: ${name}`)
    this.name = 'ProviderNameConflictError'
  }
}

export class PresetNameConflictError extends Error {
  constructor(name: string) {
    super(`预置名称已存在: ${name}`)
    this.name = 'PresetNameConflictError'
  }
}

/**
 * 内部预设模板（不含 isBuiltIn 字段）
 */
interface InternalPresetTemplate {
  name: string
  baseUrl: string
  description: string
}

/**
 * 工具配置映射（数据驱动，零 if-else）
 *
 * 扩展性：添加新工具只需在此添加配置项
 */
interface ToolConfigMapping {
  configPath: string
  builtinPresets: InternalPresetTemplate[]
  writer: (provider: Provider) => void
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
}

/**
 * 统一工具管理器工厂函数（内部实现）
 *
 * 设计原则：
 * - 零 if-else（使用配置映射）
 * - 数据驱动（TOOL_CONFIGS）
 * - 易扩展（添加新工具只需修改 TOOL_CONFIGS）
 */
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
    writeJSON(configPath, config)
  }

  return {
    add(input: AddProviderInput): Provider {
      const config = loadConfig()

      // 检查名称冲突
      const nameExists = config.providers.some((p) => p.name === input.name)
      if (nameExists) {
        throw new ProviderNameConflictError(input.name)
      }

      const timestamp = Date.now()
      const provider: Provider = {
        id: generateId(),
        name: input.name,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
        model: input.model,
        createdAt: timestamp,
        lastModified: timestamp,
      }

      config.providers.push(provider)
      saveConfig(config)

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
      const lowerName = name.toLowerCase()
      return config.providers.find((p) => p.name.toLowerCase() === lowerName)
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

    edit(id: string, updates: EditProviderInput): Provider {
      const config = loadConfig()
      const provider = config.providers.find((p) => p.id === id)

      if (!provider) {
        throw new ProviderNotFoundError(id)
      }

      // 检查名称冲突
      if (updates.name !== undefined && updates.name !== provider.name) {
        const nameConflict = config.providers.some((p) => p.id !== id && p.name === updates.name)
        if (nameConflict) {
          throw new ProviderNameConflictError(updates.name)
        }
      }

      // 更新字段
      if (updates.name !== undefined) provider.name = updates.name
      if (updates.baseUrl !== undefined) provider.baseUrl = updates.baseUrl
      if (updates.apiKey !== undefined) provider.apiKey = updates.apiKey
      if (updates.model !== undefined) provider.model = updates.model

      provider.lastModified = Date.now()
      saveConfig(config)

      // 如果是当前激活的 provider,重新写入配置
      if (config.currentProviderId === id) {
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
    },

    clone(sourceId: string, newName: string): Provider {
      const source = this.get(sourceId)
      const config = loadConfig()

      const nameExists = config.providers.some((p) => p.name === newName)
      if (nameExists) {
        throw new ProviderNameConflictError(newName)
      }

      const timestamp = Date.now()
      const newProvider: Provider = {
        ...source,
        id: generateId(),
        name: newName,
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

      if (!config.presets) {
        config.presets = []
      }

      // 使用配置映射的内置预设（零 if-else）
      const allPresets = [...toolConfig.builtinPresets, ...config.presets]
      const nameExists = allPresets.some((p) => p.name === input.name)
      if (nameExists) {
        throw new PresetNameConflictError(input.name)
      }

      const preset: InternalPresetTemplate = {
        name: input.name,
        baseUrl: input.baseUrl,
        description: input.description,
      }

      config.presets.push(preset)
      saveConfig(config)

      // 返回时添加 isBuiltIn 标记
      return {
        ...preset,
        isBuiltIn: false
      }
    },

    listPresets(): PresetTemplate[] {
      const config = loadConfig()
      const userPresets = config.presets || []

      // 给内置预设添加 isBuiltIn 标记
      const builtinWithFlag = toolConfig.builtinPresets.map(p => ({
        ...p,
        isBuiltIn: true
      }))

      // 给用户预设添加 isBuiltIn 标记
      const userWithFlag = userPresets.map(p => ({
        ...p,
        isBuiltIn: false
      }))

      return [...builtinWithFlag, ...userWithFlag]
    },

    editPreset(name: string, updates: EditPresetInput): PresetTemplate {
      const config = loadConfig()

      if (!config.presets) {
        config.presets = []
      }

      const preset = config.presets.find((p) => p.name === name)

      if (!preset) {
        throw new Error(`预置不存在: ${name}`)
      }

      // 检查名称冲突
      if (updates.name !== undefined && updates.name !== preset.name) {
        const allPresets = [...toolConfig.builtinPresets, ...config.presets]
        const nameConflict = allPresets.some((p) => p.name !== name && p.name === updates.name)
        if (nameConflict) {
          throw new PresetNameConflictError(updates.name)
        }
      }

      if (updates.name !== undefined) preset.name = updates.name
      if (updates.baseUrl !== undefined) preset.baseUrl = updates.baseUrl
      if (updates.description !== undefined) preset.description = updates.description

      saveConfig(config)

      // 返回时添加 isBuiltIn 标记
      return {
        ...preset,
        isBuiltIn: false
      }
    },

    removePreset(name: string): void {
      const config = loadConfig()

      if (!config.presets) {
        return
      }

      const index = config.presets.findIndex((p) => p.name === name)

      if (index === -1) {
        throw new Error(`Preset not found: ${name}`)
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

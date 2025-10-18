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
}

/**
 * 工具配置文件结构
 */
interface ToolConfig {
  /** 当前激活的 provider ID */
  currentProviderId?: string
  /** provider 列表 */
  providers: Provider[]
  /** 用户自定义预置列表 */
  presets?: PresetTemplate[]
}

/**
 * 添加 provider 的输入参数
 */
export interface AddProviderInput {
  name: string
  baseUrl: string
  apiKey: string
}

/**
 * 编辑 provider 的输入参数
 */
export interface EditProviderInput {
  name?: string
  baseUrl?: string
  apiKey?: string
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
 * 生成唯一的 provider ID
 * 格式: {tool}-{timestamp}-{random}
 */
function generateId(tool: ToolType): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${tool}-${timestamp}-${random}`
}

/**
 * 创建 Codex 工具管理器
 *
 * 硬编码 Codex 的所有逻辑,无条件判断
 */
export function createCodexManager(): ToolManager {
  const configPath = path.join(getCcmanDir(), 'codex.json')

  /**
   * 加载配置文件
   */
  function loadConfig(): ToolConfig {
    if (!fileExists(configPath)) {
      // 初始化配置
      // 注意：内置预置不写入文件，在 listPresets() 中动态合并
      ensureDir(getCcmanDir())
      const initialConfig: ToolConfig = {
        providers: [],
        presets: [], // 只存储用户自定义预置
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

      // 检查名称是否重复
      const nameExists = config.providers.some((p) => p.name === input.name)
      if (nameExists) {
        throw new ProviderNameConflictError(input.name)
      }

      const timestamp = Date.now()
      const provider: Provider = {
        id: generateId('codex'),
        name: input.name,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
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
      // 大小写不敏感匹配
      const lowerName = name.toLowerCase()
      return config.providers.find((p) => p.name.toLowerCase() === lowerName)
    },

    switch(id: string): void {
      const config = loadConfig()
      const provider = config.providers.find((p) => p.id === id)

      if (!provider) {
        throw new ProviderNotFoundError(id)
      }

      // 更新当前 provider
      config.currentProviderId = id

      // 更新最后使用时间
      provider.lastUsedAt = Date.now()

      saveConfig(config)

      // 硬编码:写入 Codex 配置
      writeCodexConfig(provider)
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

      // 如果要修改名称，检查新名称是否与其他provider冲突
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

      // 更新最后修改时间
      provider.lastModified = Date.now()

      saveConfig(config)

      // 如果是当前激活的 provider,重新写入配置
      if (config.currentProviderId === id) {
        writeCodexConfig(provider)
      }

      return provider
    },

    remove(id: string): void {
      const config = loadConfig()
      const index = config.providers.findIndex((p) => p.id === id)

      if (index === -1) {
        throw new ProviderNotFoundError(id)
      }

      // 如果删除的是当前 provider,清除 current
      if (config.currentProviderId === id) {
        config.currentProviderId = undefined
      }

      config.providers.splice(index, 1)
      saveConfig(config)
    },

    clone(sourceId: string, newName: string): Provider {
      const source = this.get(sourceId)
      const config = loadConfig()

      // 检查新名称是否重复
      const nameExists = config.providers.some((p) => p.name === newName)
      if (nameExists) {
        throw new ProviderNameConflictError(newName)
      }

      const timestamp = Date.now()
      const newProvider: Provider = {
        ...source,
        id: generateId('codex'),
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

      // 检查名称是否与内置presets或用户presets重复
      const allPresets = [...CODEX_PRESETS, ...config.presets]
      const nameExists = allPresets.some((p) => p.name === input.name)
      if (nameExists) {
        throw new PresetNameConflictError(input.name)
      }

      const preset: PresetTemplate = {
        name: input.name,
        baseUrl: input.baseUrl,
        description: input.description,
      }

      config.presets.push(preset)
      saveConfig(config)

      return preset
    },

    listPresets(): PresetTemplate[] {
      const config = loadConfig()
      const userPresets = config.presets || []
      return [...CODEX_PRESETS, ...userPresets]
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

      // 如果要修改名称，检查新名称是否与其他preset冲突
      if (updates.name !== undefined && updates.name !== preset.name) {
        const allPresets = [...CODEX_PRESETS, ...config.presets]
        const nameConflict = allPresets.some((p) => p.name !== name && p.name === updates.name)
        if (nameConflict) {
          throw new PresetNameConflictError(updates.name)
        }
      }

      if (updates.name !== undefined) preset.name = updates.name
      if (updates.baseUrl !== undefined) preset.baseUrl = updates.baseUrl
      if (updates.description !== undefined) preset.description = updates.description

      saveConfig(config)

      return preset
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
 * 创建 Claude 工具管理器
 *
 * 硬编码 Claude 的所有逻辑,无条件判断
 */
export function createClaudeManager(): ToolManager {
  const configPath = path.join(getCcmanDir(), 'claude.json')

  /**
   * 加载配置文件
   */
  function loadConfig(): ToolConfig {
    if (!fileExists(configPath)) {
      // 初始化配置
      // 注意：内置预置不写入文件，在 listPresets() 中动态合并
      ensureDir(getCcmanDir())
      const initialConfig: ToolConfig = {
        providers: [],
        presets: [], // 只存储用户自定义预置
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

      // 检查名称是否重复
      const nameExists = config.providers.some((p) => p.name === input.name)
      if (nameExists) {
        throw new ProviderNameConflictError(input.name)
      }

      const timestamp = Date.now()
      const provider: Provider = {
        id: generateId('claude'),
        name: input.name,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
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
      // 大小写不敏感匹配
      const lowerName = name.toLowerCase()
      return config.providers.find((p) => p.name.toLowerCase() === lowerName)
    },

    switch(id: string): void {
      const config = loadConfig()
      const provider = config.providers.find((p) => p.id === id)

      if (!provider) {
        throw new ProviderNotFoundError(id)
      }

      // 更新当前 provider
      config.currentProviderId = id

      // 更新最后使用时间
      provider.lastUsedAt = Date.now()

      saveConfig(config)

      // 硬编码:写入 Claude 配置
      writeClaudeConfig(provider)
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

      // 如果要修改名称，检查新名称是否与其他provider冲突
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

      // 更新最后修改时间
      provider.lastModified = Date.now()

      saveConfig(config)

      // 如果是当前激活的 provider,重新写入配置
      if (config.currentProviderId === id) {
        writeClaudeConfig(provider)
      }

      return provider
    },

    remove(id: string): void {
      const config = loadConfig()
      const index = config.providers.findIndex((p) => p.id === id)

      if (index === -1) {
        throw new ProviderNotFoundError(id)
      }

      // 如果删除的是当前 provider,清除 current
      if (config.currentProviderId === id) {
        config.currentProviderId = undefined
      }

      config.providers.splice(index, 1)
      saveConfig(config)
    },

    clone(sourceId: string, newName: string): Provider {
      const source = this.get(sourceId)
      const config = loadConfig()

      // 检查新名称是否重复
      const nameExists = config.providers.some((p) => p.name === newName)
      if (nameExists) {
        throw new ProviderNameConflictError(newName)
      }

      const timestamp = Date.now()
      const newProvider: Provider = {
        ...source,
        id: generateId('claude'),
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

      // 检查名称是否与内置presets或用户presets重复
      const allPresets = [...CC_PRESETS, ...config.presets]
      const nameExists = allPresets.some((p) => p.name === input.name)
      if (nameExists) {
        throw new PresetNameConflictError(input.name)
      }

      const preset: PresetTemplate = {
        name: input.name,
        baseUrl: input.baseUrl,
        description: input.description,
      }

      config.presets.push(preset)
      saveConfig(config)

      return preset
    },

    listPresets(): PresetTemplate[] {
      const config = loadConfig()
      const userPresets = config.presets || []
      return [...CC_PRESETS, ...userPresets]
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

      // 如果要修改名称，检查新名称是否与其他preset冲突
      if (updates.name !== undefined && updates.name !== preset.name) {
        const allPresets = [...CC_PRESETS, ...config.presets]
        const nameConflict = allPresets.some((p) => p.name !== name && p.name === updates.name)
        if (nameConflict) {
          throw new PresetNameConflictError(updates.name)
        }
      }

      if (updates.name !== undefined) preset.name = updates.name
      if (updates.baseUrl !== undefined) preset.baseUrl = updates.baseUrl
      if (updates.description !== undefined) preset.description = updates.description

      saveConfig(config)

      return preset
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

import * as path from 'path'
import { getCcmanDir } from './paths.js'
import { readJSON, writeJSON, fileExists, ensureDir } from './utils/file.js'
import { writeCodexConfig } from './writers/codex.js'
import { writeClaudeCodeConfig } from './writers/claudecode.js'
import { CODEX_PRESETS } from './presets/codex.js'
import { CLAUDECODE_PRESETS } from './presets/claudecode.js'

/**
 * 工具类型
 */
export type ToolType = 'codex' | 'claudecode'

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
  current?: string
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
    super(`Provider not found: ${id}`)
    this.name = 'ProviderNotFoundError'
  }
}

export class ProviderNameConflictError extends Error {
  constructor(name: string) {
    super(`Provider name already exists: ${name}`)
    this.name = 'ProviderNameConflictError'
  }
}

export class PresetNameConflictError extends Error {
  constructor(name: string) {
    super(`Preset name already exists: ${name}`)
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
      // 初始化空配置
      ensureDir(getCcmanDir())
      const emptyConfig: ToolConfig = {
        providers: [],
      }
      writeJSON(configPath, emptyConfig)
      return emptyConfig
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

      const provider: Provider = {
        id: generateId('codex'),
        name: input.name,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
        createdAt: Date.now(),
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
      return config.providers.find((p) => p.name === name)
    },

    switch(id: string): void {
      const config = loadConfig()
      const provider = config.providers.find((p) => p.id === id)

      if (!provider) {
        throw new ProviderNotFoundError(id)
      }

      // 更新当前 provider
      config.current = id

      // 更新最后使用时间
      provider.lastUsedAt = Date.now()

      saveConfig(config)

      // 硬编码:写入 Codex 配置
      writeCodexConfig(provider)
    },

    getCurrent(): Provider | null {
      const config = loadConfig()

      if (!config.current) {
        return null
      }

      const provider = config.providers.find((p) => p.id === config.current)
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

      saveConfig(config)

      // 如果是当前激活的 provider,重新写入配置
      if (config.current === id) {
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
      if (config.current === id) {
        config.current = undefined
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

      const newProvider: Provider = {
        ...source,
        id: generateId('codex'),
        name: newName,
        createdAt: Date.now(),
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
        throw new Error(`Preset not found: ${name}`)
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
 * 创建 Claude Code 工具管理器
 *
 * 硬编码 Claude Code 的所有逻辑,无条件判断
 */
export function createClaudeCodeManager(): ToolManager {
  const configPath = path.join(getCcmanDir(), 'claudecode.json')

  /**
   * 加载配置文件
   */
  function loadConfig(): ToolConfig {
    if (!fileExists(configPath)) {
      // 初始化空配置
      ensureDir(getCcmanDir())
      const emptyConfig: ToolConfig = {
        providers: [],
      }
      writeJSON(configPath, emptyConfig)
      return emptyConfig
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

      const provider: Provider = {
        id: generateId('claudecode'),
        name: input.name,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
        createdAt: Date.now(),
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
      return config.providers.find((p) => p.name === name)
    },

    switch(id: string): void {
      const config = loadConfig()
      const provider = config.providers.find((p) => p.id === id)

      if (!provider) {
        throw new ProviderNotFoundError(id)
      }

      // 更新当前 provider
      config.current = id

      // 更新最后使用时间
      provider.lastUsedAt = Date.now()

      saveConfig(config)

      // 硬编码:写入 Claude Code 配置
      writeClaudeCodeConfig(provider)
    },

    getCurrent(): Provider | null {
      const config = loadConfig()

      if (!config.current) {
        return null
      }

      const provider = config.providers.find((p) => p.id === config.current)
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

      saveConfig(config)

      // 如果是当前激活的 provider,重新写入配置
      if (config.current === id) {
        writeClaudeCodeConfig(provider)
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
      if (config.current === id) {
        config.current = undefined
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

      const newProvider: Provider = {
        ...source,
        id: generateId('claudecode'),
        name: newName,
        createdAt: Date.now(),
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
      const allPresets = [...CLAUDECODE_PRESETS, ...config.presets]
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
      return [...CLAUDECODE_PRESETS, ...userPresets]
    },

    editPreset(name: string, updates: EditPresetInput): PresetTemplate {
      const config = loadConfig()

      if (!config.presets) {
        config.presets = []
      }

      const preset = config.presets.find((p) => p.name === name)

      if (!preset) {
        throw new Error(`Preset not found: ${name}`)
      }

      // 如果要修改名称，检查新名称是否与其他preset冲突
      if (updates.name !== undefined && updates.name !== preset.name) {
        const allPresets = [...CLAUDECODE_PRESETS, ...config.presets]
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

/**
 * 工具管理器类型定义
 *
 * 本文件包含所有工具管理相关的类型定义和错误类
 * 从 tool-manager.ts 拆分出来，保持类型定义的稳定性和可维护性
 */

/**
 * 工具类型
 */
export type ToolType = 'codex' | 'claude' | 'mcp'

/**
 * Provider 配置(不包含 type 字段,因为配置已分离)
 */
export interface Provider {
  /** 唯一标识符(自动生成) */
  id: string
 /** 显示名称 */
  name: string
  /** 描述(可选,用于 UI 展示) */
  desc?: string
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
 * 内部预设模板（不含 isBuiltIn 字段）
 */
export interface InternalPresetTemplate {
  name: string
  baseUrl: string
  description: string
}

/**
 * 工具配置文件结构
 */
export interface ToolConfig {
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
  desc?: string
  baseUrl: string
  apiKey: string
  model?: string // 可选,仅 Codex 使用
}

/**
 * 编辑 provider 的输入参数
 */
export interface EditProviderInput {
  name?: string
  desc?: string
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

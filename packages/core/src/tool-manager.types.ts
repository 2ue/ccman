/**
 * 工具管理器类型定义
 *
 * 本文件从 @ccman/types 重新导出共享的类型，
 * 并定义 Core 模块内部使用的专用类型和接口。
 */

// 从 @ccman/types 重新导出共享类型
export {
  type ToolType,
  type Provider,
  type PresetTemplate,
  type AddProviderInput,
  type EditProviderInput,
  type AddPresetInput,
  type EditPresetInput,
} from '@ccman/types'

import type {
  Provider,
  PresetTemplate,
  AddProviderInput,
  EditProviderInput,
  AddPresetInput,
  EditPresetInput,
} from '@ccman/types'

/**
 * 内部预设模板（不含 isBuiltIn 字段）
 * Core 内部使用，用于存储用户自定义预设
 */
export interface InternalPresetTemplate {
  name: string
  baseUrl: string
  description: string
}

/**
 * 工具配置文件结构
 * Core 内部使用，定义配置文件的存储格式
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

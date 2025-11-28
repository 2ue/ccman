/**
 * WebDAV 同步相关类型定义
 *
 * 本文件从 @ccman/types 重新导出共享的同步相关类型，
 * 并定义 Core 内部使用的同步数据结构。
 */

// 从 @ccman/types 重新导出共享类型
export { type WebDAVAuthType, type SyncConfig } from '@ccman/types'

import type { Provider } from '../tool-manager.js'

/**
 * 工具配置（用于同步）
 */
export interface ToolConfigForSync {
  /** 当前激活的 provider ID */
  currentProviderId?: string
  /** provider 列表（不含 API Key） */
  providers: Omit<Provider, 'apiKey'>[]
}

/**
 * 同步数据结构（上传到 WebDAV 的数据）
 */
export interface SyncData {
  /** 数据版本 */
  version: string
  /** 时间戳 */
  timestamp: number
  /** Codex 配置 */
  codex: ToolConfigForSync
  /** Claude 配置 */
  claude: ToolConfigForSync
}

/**
 * 合并冲突的 Provider
 */
export interface MergedProvider {
  provider: Provider
  needsApiKey: boolean
}

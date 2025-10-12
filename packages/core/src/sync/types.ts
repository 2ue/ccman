/**
 * WebDAV 同步相关类型定义
 */

import type { Provider } from '../tool-manager.js'

/**
 * WebDAV 认证类型
 */
export type WebDAVAuthType = 'password' | 'digest'

/**
 * WebDAV 配置
 */
export interface SyncConfig {
  /** WebDAV 服务器地址（如 https://dav.example.com） */
  webdavUrl: string
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 认证类型（可选，默认 password = Basic Auth） */
  authType?: WebDAVAuthType
  /** 远程同步目录（可选，默认 / 根目录） */
  remoteDir?: string
}

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

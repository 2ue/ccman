/**
 * ccman 统一配置管理
 * 使用单一的 config.json 文件存储所有 ccman 相关配置
 */

import * as fs from 'fs'
import { getCcmanDir, getConfigPath } from './paths.js'
import type { SyncConfig } from './sync/types.js'

/**
 * ccman 统一配置结构
 */
export interface CcmanConfig {
  /** WebDAV 同步配置 */
  sync?: SyncConfig & {
    /** 是否记住同步密码 */
    rememberSyncPassword?: boolean
    /** 最后同步时间 */
    lastSync?: number
  }
  // 未来可以在这里添加其他配置字段
  // 例如: theme, language, autoUpdate, etc.
}

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  const dir = getCcmanDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  }
}

/**
 * 读取统一配置文件
 */
export function loadConfig(): CcmanConfig {
  const configPath = getConfigPath()

  if (!fs.existsSync(configPath)) {
    return {}
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    throw new Error(`Failed to load config: ${(error as Error).message}`)
  }
}

/**
 * 保存统一配置文件
 */
export function saveConfig(config: CcmanConfig): void {
  ensureConfigDir()
  const configPath = getConfigPath()

  try {
    // 原子写入
    const tempPath = `${configPath}.tmp`
    fs.writeFileSync(tempPath, JSON.stringify(config, null, 2), {
      mode: 0o600,
    })
    fs.renameSync(tempPath, configPath)
  } catch (error) {
    throw new Error(`Failed to save config: ${(error as Error).message}`)
  }
}

/**
 * 获取 WebDAV 同步配置
 */
export function getSyncConfig(): (SyncConfig & { rememberSyncPassword?: boolean; lastSync?: number }) | null {
  const config = loadConfig()
  return config.sync || null
}

/**
 * 保存 WebDAV 同步配置
 */
export function saveSyncConfig(
  syncConfig: SyncConfig & {
    rememberSyncPassword?: boolean
    lastSync?: number
  },
): void {
  const config = loadConfig()
  config.sync = syncConfig
  saveConfig(config)
}

/**
 * 删除 WebDAV 同步配置
 */
export function deleteSyncConfig(): void {
  const config = loadConfig()
  delete config.sync
  saveConfig(config)
}

/**
 * 更新最后同步时间
 */
export function updateLastSyncTime(): void {
  const config = loadConfig()
  if (config.sync) {
    config.sync.lastSync = Date.now()
    saveConfig(config)
  }
}

/**
 * CLI 同步配置管理工具
 *
 * CLI 和 Desktop 都使用明文存储 WebDAV 密码，依赖文件权限（0600）保护
 * 只有 API Key 需要加密（通过同步密码加密，存储在云端）
 */

import { getSyncConfig, saveSyncConfig as coreSaveSyncConfig, getConfigPath } from '@ccman/core'
import type { SyncConfig } from '@ccman/core'

/**
 * 扩展的同步配置（CLI 本地使用）
 */
export interface LocalSyncConfig extends SyncConfig {
  lastSync?: number
  rememberSyncPassword?: boolean
}

/**
 * 读取同步配置（从统一的 config.json）
 */
export function loadSyncConfig(): LocalSyncConfig | null {
  try {
    const config = getSyncConfig()
    if (!config) {
      return null
    }
    return config
  } catch (error) {
    throw new Error(`读取同步配置失败: ${(error as Error).message}`)
  }
}

/**
 * 保存同步配置（到统一的 config.json）
 */
export function saveSyncConfig(config: LocalSyncConfig): void {
  try {
    const configToSave = { ...config }

    // 不记住同步密码时删除该字段
    if (!configToSave.rememberSyncPassword) {
      delete configToSave.syncPassword
    }

    // 保存最后同步时间
    configToSave.lastSync = Date.now()

    // 使用 Core 的统一保存函数
    coreSaveSyncConfig(configToSave)
  } catch (error) {
    throw new Error(`保存同步配置失败: ${(error as Error).message}`)
  }
}

/**
 * 检查是否已配置同步
 */
export function hasSyncConfig(): boolean {
  const config = loadSyncConfig()
  return config !== null && !!config.webdavUrl && !!config.username && !!config.password
}

/**
 * 获取同步配置文件路径（用于显示给用户）
 * 现在使用统一的 config.json
 */
export function getSyncConfigPath(): string {
  return getConfigPath()
}

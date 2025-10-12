/**
 * CLI 同步配置管理工具
 *
 * 使用 Core 的统一 config.json，但在 CLI 层处理密码加密
 * （Desktop 不加密密码，由系统 Keychain 保护；CLI 需要自己加密）
 */

import crypto from 'crypto'
import os from 'os'
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
 * 获取机器标识（用于加密）
 * 返回 32 字节的密钥（AES-256 需要）
 */
function getMachineId(): Buffer {
  return crypto
    .createHash('sha256')
    .update(os.hostname() + os.userInfo().username)
    .digest() // 返回 Buffer (32 字节)
}

/**
 * 加密字符串
 */
function encrypt(text: string): string {
  const key = getMachineId()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

/**
 * 解密字符串
 */
function decrypt(encrypted: string): string {
  const parts = encrypted.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = parts[1]
  const key = getMachineId()
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
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

    // 解密密码字段（如果已加密）
    if (config.password && config.password.includes(':')) {
      try {
        config.password = decrypt(config.password)
      } catch {
        // 解密失败，可能是未加密的明文或其他格式，保持原样
      }
    }
    if (config.syncPassword && config.syncPassword.includes(':')) {
      try {
        config.syncPassword = decrypt(config.syncPassword)
      } catch {
        // 解密失败，保持原样
      }
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
    // 加密密码字段
    const configToSave = { ...config }
    if (configToSave.password) {
      configToSave.password = encrypt(configToSave.password)
    }
    if (configToSave.syncPassword && configToSave.rememberSyncPassword) {
      configToSave.syncPassword = encrypt(configToSave.syncPassword)
    } else {
      // 不记住密码时删除该字段
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

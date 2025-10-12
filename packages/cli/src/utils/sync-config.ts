/**
 * 同步配置管理工具
 *
 * 负责读写 ~/.ccman/sync.json
 * 密码使用简单加密存储
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import os from 'os'
import { getCcmanDir } from '@ccman/core'
import type { SyncConfig } from '@ccman/core'

const SYNC_CONFIG_FILE = 'sync.json'

/**
 * 扩展的同步配置（包含本地元数据）
 */
export interface LocalSyncConfig extends SyncConfig {
  lastSync?: number
  rememberSyncPassword?: boolean
}

/**
 * 获取机器标识（用于加密）
 */
function getMachineId(): string {
  return crypto
    .createHash('sha256')
    .update(os.hostname() + os.userInfo().username)
    .digest('hex')
    .slice(0, 32)
}

/**
 * 加密字符串
 */
function encrypt(text: string): string {
  const key = Buffer.from(getMachineId(), 'hex')
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
  const key = Buffer.from(getMachineId(), 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * 获取同步配置文件路径
 */
export function getSyncConfigPath(): string {
  return path.join(getCcmanDir(), SYNC_CONFIG_FILE)
}

/**
 * 读取同步配置
 */
export function loadSyncConfig(): LocalSyncConfig | null {
  const configPath = getSyncConfigPath()
  if (!fs.existsSync(configPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(content)

    // 解密密码字段
    if (config.password) {
      config.password = decrypt(config.password)
    }
    if (config.syncPassword) {
      config.syncPassword = decrypt(config.syncPassword)
    }

    return config
  } catch (error) {
    throw new Error(`读取同步配置失败: ${(error as Error).message}`)
  }
}

/**
 * 保存同步配置
 */
export function saveSyncConfig(config: LocalSyncConfig): void {
  const configPath = getSyncConfigPath()

  // 确保目录存在
  const dir = path.dirname(configPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  }

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

  try {
    fs.writeFileSync(configPath, JSON.stringify(configToSave, null, 2), {
      mode: 0o600,
    })
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

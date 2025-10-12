/**
 * 配置备份和数据处理逻辑
 *
 * 第一版策略：
 * 1. 下载前备份本地配置
 * 2. 直接覆盖本地配置
 * 3. 上传时移除 API Key
 */

import fs from 'fs'
import type { Provider } from '../tool-manager.js'

/**
 * 备份配置文件
 *
 * @param configPath - 配置文件路径
 * @returns 备份文件路径
 */
export function backupConfig(configPath: string): string {
  if (!fs.existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}`)
  }

  const timestamp = Date.now()
  const backupPath = `${configPath}.backup.${timestamp}`

  fs.copyFileSync(configPath, backupPath)

  return backupPath
}

/**
 * 去除 Provider 列表中的 API Key
 *
 * @param providers - Provider 列表
 * @returns 不含 API Key 的 Provider 列表
 */
export function stripApiKeys(
  providers: Provider[]
): Omit<Provider, 'apiKey'>[] {
  return providers.map(({ apiKey, ...rest }) => rest)
}

/**
 * 验证工具配置的完整性
 *
 * @param config - 工具配置
 * @returns 是否有效
 */
export function validateToolConfig(config: any): boolean {
  if (!config || typeof config !== 'object') return false
  if (!Array.isArray(config.providers)) return false
  return true
}

/**
 * 验证远程配置的完整性（旧版格式）
 * @deprecated 使用 validateToolConfig 替代
 *
 * @param data - 远程数据
 * @returns 是否有效
 */
export function validateSyncData(data: any): boolean {
  if (!data || typeof data !== 'object') return false
  if (!data.version || !data.timestamp) return false
  if (!data.codex || !data.claude) return false
  if (!Array.isArray(data.codex.providers)) return false
  if (!Array.isArray(data.claude.providers)) return false
  return true
}

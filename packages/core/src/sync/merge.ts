/**
 * 配置备份和数据处理逻辑
 *
 * 第一版策略：
 * 1. 下载前备份本地配置
 * 2. 直接覆盖本地配置
 * 3. 上传时移除 API Key
 */

import fs from 'fs'
import path from 'path'
import type { Provider } from '../tool-manager.js'

/**
 * 备份配置文件
 *
 * @param configPath - 配置文件路径
 * @param keepCount - 保留的备份数量（默认 3 个）
 * @returns 备份文件路径
 */
export function backupConfig(configPath: string, keepCount: number = 3): string {
  if (!fs.existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}`)
  }

  const timestamp = Date.now()
  const backupPath = `${configPath}.backup.${timestamp}`

  fs.copyFileSync(configPath, backupPath)

  // 自动清理旧备份
  cleanupOldBackups(configPath, keepCount)

  return backupPath
}

/**
 * 清理旧备份文件，只保留最近的 N 个
 *
 * @param configPath - 配置文件路径
 * @param keepCount - 保留的备份数量
 */
function cleanupOldBackups(configPath: string, keepCount: number): void {
  const dir = path.dirname(configPath)
  const basename = path.basename(configPath)
  const backupPrefix = `${basename}.backup.`

  try {
    // 读取目录中的所有文件
    const files = fs.readdirSync(dir)

    // 筛选出所有备份文件，提取时间戳并排序
    const backups = files
      .filter(f => f.startsWith(backupPrefix))
      .map(f => {
        const timestampStr = f.substring(backupPrefix.length)
        const timestamp = parseInt(timestampStr, 10)

        // 验证时间戳是否有效
        if (isNaN(timestamp)) {
          return null
        }

        return {
          name: f,
          path: path.join(dir, f),
          timestamp
        }
      })
      .filter((backup): backup is NonNullable<typeof backup> => backup !== null)
      .sort((a, b) => b.timestamp - a.timestamp) // 降序：最新的在前

    // 删除超出保留数量的旧备份
    const toDelete = backups.slice(keepCount)
    for (const backup of toDelete) {
      try {
        fs.unlinkSync(backup.path)
      } catch (error) {
        // 删除失败不影响主流程，静默处理
        console.warn(`无法删除旧备份文件 ${backup.name}: ${(error as Error).message}`)
      }
    }
  } catch (error) {
    // 清理失败不影响主流程，静默处理
    console.warn(`清理旧备份时出错: ${(error as Error).message}`)
  }
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
  return providers.map((provider) => {
    // 只用于移除 apiKey 字段,不需要使用其值
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { apiKey, ...rest } = provider
    return rest
  })
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

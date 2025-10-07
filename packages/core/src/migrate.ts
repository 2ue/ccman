import * as fs from 'fs'
import * as path from 'path'
import { getCcmanDir } from './paths.js'

/**
 * 旧版配置文件结构
 */
interface OldConfig {
  providers: Array<{
    id: string
    name: string
    type: 'codex' | 'claude'  // 旧版使用 'claude'
    baseUrl: string
    apiKey: string
    createdAt: number
    lastUsedAt?: number
  }>
  currentProviders: {
    claude?: string
    codex?: string
  }
}

/**
 * 新版配置文件结构
 */
interface NewConfig {
  current?: string
  providers: Array<{
    id: string
    name: string
    baseUrl: string
    apiKey: string
    createdAt: number
    lastUsedAt?: number
  }>
}

/**
 * 迁移配置文件从 v1 到 v2
 *
 * v1: 单一 config.json,providers 混合在一个数组,type 字段区分
 * v2: 分离为 codex.json 和 claudecode.json,无 type 字段
 *
 * @returns 迁移结果
 */
export function migrateConfig(): {
  success: boolean
  message: string
  details?: {
    codexProviders: number
    claudeCodeProviders: number
    backupPath?: string
  }
} {
  const ccmanDir = getCcmanDir()
  const oldConfigPath = path.join(ccmanDir, 'config.json')
  const codexConfigPath = path.join(ccmanDir, 'codex.json')
  const claudeCodeConfigPath = path.join(ccmanDir, 'claudecode.json')

  // 检查是否需要迁移
  if (!fs.existsSync(oldConfigPath)) {
    return {
      success: true,
      message: 'No migration needed: old config file not found',
    }
  }

  // 检查是否已经迁移过
  if (fs.existsSync(codexConfigPath) || fs.existsSync(claudeCodeConfigPath)) {
    return {
      success: true,
      message: 'Migration already completed',
    }
  }

  try {
    // 读取旧配置
    const oldConfigContent = fs.readFileSync(oldConfigPath, 'utf-8')
    const oldConfig: OldConfig = JSON.parse(oldConfigContent)

    // 分离 providers
    const codexProviders = oldConfig.providers
      .filter((p) => p.type === 'codex')
      .map((p) => {
        // 删除 type 字段
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { type, ...rest } = p
        return rest
      })

    const claudeCodeProviders = oldConfig.providers
      .filter((p) => p.type === 'claude')
      .map((p) => {
        // 删除 type 字段
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { type, ...rest } = p
        return rest
      })

    // 创建新配置
    const codexConfig: NewConfig = {
      current: oldConfig.currentProviders.codex,
      providers: codexProviders,
    }

    const claudeCodeConfig: NewConfig = {
      current: oldConfig.currentProviders.claude,
      providers: claudeCodeProviders,
    }

    // 写入新配置
    fs.writeFileSync(codexConfigPath, JSON.stringify(codexConfig, null, 2), { mode: 0o600 })
    fs.writeFileSync(claudeCodeConfigPath, JSON.stringify(claudeCodeConfig, null, 2), { mode: 0o600 })

    // 备份旧配置
    const backupPath = `${oldConfigPath}.bak`
    fs.renameSync(oldConfigPath, backupPath)

    return {
      success: true,
      message: 'Migration completed successfully',
      details: {
        codexProviders: codexProviders.length,
        claudeCodeProviders: claudeCodeProviders.length,
        backupPath,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `Migration failed: ${(error as Error).message}`,
    }
  }
}

/**
 * 回滚迁移(恢复旧配置)
 */
export function rollbackMigration(): {
  success: boolean
  message: string
} {
  const ccmanDir = getCcmanDir()
  const oldConfigPath = path.join(ccmanDir, 'config.json')
  const backupPath = `${oldConfigPath}.bak`

  if (!fs.existsSync(backupPath)) {
    return {
      success: false,
      message: 'Backup file not found, cannot rollback',
    }
  }

  try {
    // 恢复备份
    fs.renameSync(backupPath, oldConfigPath)

    // 删除新配置文件(如果存在)
    const codexConfigPath = path.join(ccmanDir, 'codex.json')
    const claudeCodeConfigPath = path.join(ccmanDir, 'claudecode.json')

    if (fs.existsSync(codexConfigPath)) {
      fs.unlinkSync(codexConfigPath)
    }

    if (fs.existsSync(claudeCodeConfigPath)) {
      fs.unlinkSync(claudeCodeConfigPath)
    }

    return {
      success: true,
      message: 'Rollback completed successfully',
    }
  } catch (error) {
    return {
      success: false,
      message: `Rollback failed: ${(error as Error).message}`,
    }
  }
}

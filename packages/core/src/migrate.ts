import * as fs from 'fs'
import * as path from 'path'
import { getCcmanDir } from './paths.js'

/**
 * v2.x 配置文件结构（旧版）
 */
interface V2Config {
  version: string
  currentProvider?: string
  claudeConfigPath?: string
  providers: {
    [key: string]: {
      name: string
      configFile: string
      lastUsed?: string
    }
  }
  settings?: {
    language?: string
    firstRun?: boolean
  }
  metadata?: {
    version: string
    createdAt: string
    updatedAt: string
  }
}

/**
 * v2.x Provider 详细配置
 */
interface V2ProviderDetail {
  name: string
  description?: string
  config: {
    env: {
      ANTHROPIC_AUTH_TOKEN: string
      ANTHROPIC_BASE_URL: string
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC?: number
      CLAUDE_CODE_MAX_OUTPUT_TOKENS?: number
    }
    permissions?: {
      allow: string[]
      deny: string[]
    }
  }
  metadata?: {
    createdAt: string
    updatedAt: string
    usageCount?: number
  }
}

/**
 * v1.x 配置文件结构（更早期）
 */
interface OldConfig {
  providers: Array<{
    id: string
    name: string
    type: 'codex' | 'claude' // 旧版使用 'claude'
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
  currentProviderId?: string
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
 * v2: 分离为 codex.json 和 claude.json,无 type 字段
 *
 * @returns 迁移结果
 */
export function migrateConfig(): {
  success: boolean
  message: string
  details?: {
    codexProviders: number
    claudeProviders: number
    backupPath?: string
  }
} {
  const ccmanDir = getCcmanDir()
  const oldConfigPath = path.join(ccmanDir, 'config.json')
  const codexConfigPath = path.join(ccmanDir, 'codex.json')
  const claudeConfigPath = path.join(ccmanDir, 'claude.json')

  // 检查是否需要迁移
  if (!fs.existsSync(oldConfigPath)) {
    return {
      success: true,
      message: 'No migration needed: old config file not found',
    }
  }

  // 检查是否已经迁移过
  if (fs.existsSync(codexConfigPath) || fs.existsSync(claudeConfigPath)) {
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

    const claudeProviders = oldConfig.providers
      .filter((p) => p.type === 'claude')
      .map((p) => {
        // 删除 type 字段
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { type, ...rest } = p
        return rest
      })

    // 创建新配置
    const codexConfig: NewConfig = {
      currentProviderId: oldConfig.currentProviders.codex,
      providers: codexProviders,
    }

    const claudeConfig: NewConfig = {
      currentProviderId: oldConfig.currentProviders.claude,
      providers: claudeProviders,
    }

    // 写入新配置
    fs.writeFileSync(codexConfigPath, JSON.stringify(codexConfig, null, 2), { mode: 0o600 })
    fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2), { mode: 0o600 })

    // 备份旧配置
    const backupPath = `${oldConfigPath}.bak`
    fs.renameSync(oldConfigPath, backupPath)

    return {
      success: true,
      message: 'Migration completed successfully',
      details: {
        codexProviders: codexProviders.length,
        claudeProviders: claudeProviders.length,
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
    const claudeConfigPath = path.join(ccmanDir, 'claude.json')

    if (fs.existsSync(codexConfigPath)) {
      fs.unlinkSync(codexConfigPath)
    }

    if (fs.existsSync(claudeConfigPath)) {
      fs.unlinkSync(claudeConfigPath)
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

/**
 * 生成唯一的 provider ID
 */
function generateProviderId(timestamp: number): string {
  const random = Math.random().toString(36).substring(2, 8)
  return `claude-${timestamp}-${random}`
}

/**
 * 将 ISO 时间字符串转换为 Unix timestamp
 */
function parseTimestamp(isoString: string): number {
  return new Date(isoString).getTime()
}

/**
 * 迁移 v2.x 配置到 v3.x
 *
 * v2.x: config.json + providers/*.json（多文件结构）
 * v3.x: claude.json（单文件结构）
 *
 * @returns 迁移结果
 */
export function migrateV2ToV3(): {
  success: boolean
  message: string
  details?: {
    migratedProviders: number
    currentProvider?: string
    skippedFiles?: string[]
  }
} {
  const ccmanDir = getCcmanDir()
  const v2ConfigPath = path.join(ccmanDir, 'config.json')
  const v2ProvidersDir = path.join(ccmanDir, 'providers')
  const v3ConfigPath = path.join(ccmanDir, 'claude.json')

  // 检查是否需要迁移
  if (!fs.existsSync(v2ConfigPath)) {
    return {
      success: true,
      message: '未找到旧版配置文件，无需迁移',
    }
  }

  if (!fs.existsSync(v2ProvidersDir)) {
    return {
      success: false,
      message: '未找到 providers 目录，配置文件可能已损坏',
    }
  }

  // 检查是否已经迁移过
  if (fs.existsSync(v3ConfigPath)) {
    return {
      success: true,
      message: '新版配置文件已存在，无需迁移',
    }
  }

  try {
    // 读取 v2 配置索引
    const v2ConfigContent = fs.readFileSync(v2ConfigPath, 'utf-8')
    const v2Config: V2Config = JSON.parse(v2ConfigContent)

    console.log(`📖 读取到 ${Object.keys(v2Config.providers).length} 个服务商配置`)

    // 转换所有 providers
    const migratedProviders: Array<{
      id: string
      name: string
      baseUrl: string
      apiKey: string
      createdAt: number
      lastUsedAt?: number
    }> = []

    const skippedFiles: string[] = []
    let currentProviderId: string | undefined

    for (const [providerKey, providerMeta] of Object.entries(v2Config.providers)) {
      const providerFilePath = path.join(v2ProvidersDir, providerMeta.configFile)

      // 检查 provider 文件是否存在
      if (!fs.existsSync(providerFilePath)) {
        console.warn(`⚠️  跳过不存在的文件: ${providerMeta.configFile}`)
        skippedFiles.push(providerMeta.configFile)
        continue
      }

      // 读取 provider 详细配置
      const providerDetailContent = fs.readFileSync(providerFilePath, 'utf-8')
      const providerDetail: V2ProviderDetail = JSON.parse(providerDetailContent)

      // 提取关键字段
      const baseUrl = providerDetail.config.env.ANTHROPIC_BASE_URL
      const apiKey = providerDetail.config.env.ANTHROPIC_AUTH_TOKEN

      // 验证必需字段
      if (!baseUrl || !apiKey) {
        console.warn(`⚠️  跳过缺少必需字段的配置: ${providerMeta.configFile}`)
        skippedFiles.push(providerMeta.configFile)
        continue
      }

      // 生成新的 provider ID
      const createdAt = providerDetail.metadata?.createdAt
        ? parseTimestamp(providerDetail.metadata.createdAt)
        : Date.now()

      const providerId = generateProviderId(createdAt)

      // 转换 lastUsedAt
      const lastUsedAt = providerMeta.lastUsed ? parseTimestamp(providerMeta.lastUsed) : undefined

      // 创建新的 provider 对象
      const newProvider = {
        id: providerId,
        name: providerDetail.name,
        baseUrl,
        apiKey,
        createdAt,
        lastUsedAt,
      }

      migratedProviders.push(newProvider)

      // 如果是当前激活的 provider，记录其 ID
      if (v2Config.currentProvider === providerKey) {
        currentProviderId = providerId
      }

      console.log(`✅ 迁移成功: ${providerDetail.name}`)
    }

    // 按最后使用时间排序（没有 lastUsedAt 的排在最后）
    migratedProviders.sort((a, b) => {
      if (!a.lastUsedAt && !b.lastUsedAt) return 0
      if (!a.lastUsedAt) return 1
      if (!b.lastUsedAt) return -1
      return b.lastUsedAt - a.lastUsedAt
    })

    // 创建新的 v3 配置
    const v3Config = {
      currentProviderId,
      providers: migratedProviders,
      presets: [],
    }

    // 写入新配置文件
    fs.writeFileSync(v3ConfigPath, JSON.stringify(v3Config, null, 2), { mode: 0o600 })

    console.log(`\n✨ 迁移完成！已生成新配置文件: ${v3ConfigPath}`)
    console.log(`📊 成功迁移 ${migratedProviders.length} 个服务商`)

    if (currentProviderId) {
      const currentProvider = migratedProviders.find((p) => p.id === currentProviderId)
      console.log(`🎯 当前激活: ${currentProvider?.name}`)
    }

    if (skippedFiles.length > 0) {
      console.log(`⚠️  跳过 ${skippedFiles.length} 个文件: ${skippedFiles.join(', ')}`)
    }

    return {
      success: true,
      message: `成功迁移 ${migratedProviders.length} 个服务商配置`,
      details: {
        migratedProviders: migratedProviders.length,
        currentProvider: currentProviderId,
        skippedFiles: skippedFiles.length > 0 ? skippedFiles : undefined,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `迁移失败: ${(error as Error).message}`,
    }
  }
}

/**
 * 验证迁移后的配置
 *
 * @returns 验证结果
 */
export function validateMigration(): {
  success: boolean
  message: string
  details?: {
    providersCount: number
    currentProvider?: string
    missingFields?: string[]
  }
} {
  const ccmanDir = getCcmanDir()
  const v3ConfigPath = path.join(ccmanDir, 'claude.json')

  if (!fs.existsSync(v3ConfigPath)) {
    return {
      success: false,
      message: '新版配置文件不存在',
    }
  }

  try {
    const v3ConfigContent = fs.readFileSync(v3ConfigPath, 'utf-8')
    const v3Config = JSON.parse(v3ConfigContent)

    // 验证必需字段
    const missingFields: string[] = []

    if (!Array.isArray(v3Config.providers)) {
      missingFields.push('providers (must be array)')
    }

    // 验证每个 provider
    if (Array.isArray(v3Config.providers)) {
      for (const [index, provider] of v3Config.providers.entries()) {
        const requiredFields = ['id', 'name', 'baseUrl', 'apiKey', 'createdAt']
        for (const field of requiredFields) {
          if (!provider[field]) {
            missingFields.push(`providers[${index}].${field}`)
          }
        }
      }
    }

    if (missingFields.length > 0) {
      return {
        success: false,
        message: '配置文件格式错误',
        details: {
          providersCount: v3Config.providers?.length || 0,
          missingFields,
        },
      }
    }

    // 验证 currentProviderId 是否存在于 providers 中
    if (v3Config.currentProviderId) {
      const currentExists = v3Config.providers.some(
        (p: { id: string }) => p.id === v3Config.currentProviderId
      )

      if (!currentExists) {
        return {
          success: false,
          message: '当前激活的 provider 不存在于 providers 列表中',
          details: {
            providersCount: v3Config.providers.length,
            currentProvider: v3Config.currentProviderId,
          },
        }
      }
    }

    const currentProvider = v3Config.currentProviderId
      ? v3Config.providers.find((p: { id: string }) => p.id === v3Config.currentProviderId)
      : null

    return {
      success: true,
      message: '配置验证通过',
      details: {
        providersCount: v3Config.providers.length,
        currentProvider: currentProvider?.name,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `验证失败: ${(error as Error).message}`,
    }
  }
}

// =============================================================================
// v3.2 → v3.3 数据迁移（统一工具标识）
// =============================================================================

/**
 * 配置文件映射（旧文件名 → 新文件名）
 */
const CONFIG_FILE_MIGRATION_MAP = {
  'claude.json': 'claude-code.json',
  'gemini.json': 'gemini-cli.json',
}

/**
 * 迁移单个配置文件
 *
 * @param oldFileName 旧文件名
 * @param newFileName 新文件名
 * @returns 迁移结果
 */
function migrateConfigFile(
  oldFileName: string,
  newFileName: string
): {
  action: 'renamed' | 'merged' | 'skipped'
  backupPath?: string
} {
  const ccmanDir = getCcmanDir()
  const oldPath = path.join(ccmanDir, oldFileName)
  const newPath = path.join(ccmanDir, newFileName)

  // 旧文件不存在，跳过
  if (!fs.existsSync(oldPath)) {
    return { action: 'skipped' }
  }

  // 如果新文件不存在，直接重命名
  if (!fs.existsSync(newPath)) {
    // 创建备份
    const backupPath = `${oldPath}.backup.${Date.now()}`
    fs.copyFileSync(oldPath, backupPath)

    // 重命名
    fs.renameSync(oldPath, newPath)

    return { action: 'renamed', backupPath }
  }

  // 新文件已存在，需要合并
  try {
    const oldContent = fs.readFileSync(oldPath, 'utf-8')
    const newContent = fs.readFileSync(newPath, 'utf-8')

    const oldConfig = JSON.parse(oldContent)
    const newConfig = JSON.parse(newContent)

    // 合并 providers（新文件优先，避免重复）
    const existingNames = new Set(newConfig.providers?.map((p: { name: string }) => p.name) || [])
    const oldProviders = (oldConfig.providers || []).filter(
      (p: { name: string }) => !existingNames.has(p.name)
    )

    if (oldProviders.length > 0) {
      newConfig.providers = [...(newConfig.providers || []), ...oldProviders]

      // 合并 presets（同样逻辑）
      const existingPresetNames = new Set(
        newConfig.presets?.map((p: { name: string }) => p.name) || []
      )
      const oldPresets = (oldConfig.presets || []).filter(
        (p: { name: string }) => !existingPresetNames.has(p.name)
      )

      if (oldPresets.length > 0) {
        newConfig.presets = [...(newConfig.presets || []), ...oldPresets]
      }

      // 写入合并后的配置
      fs.writeFileSync(newPath, JSON.stringify(newConfig, null, 2), { mode: 0o600 })
    }

    // 备份并删除旧文件
    const backupPath = `${oldPath}.backup.${Date.now()}`
    fs.renameSync(oldPath, backupPath)

    return { action: 'merged', backupPath }
  } catch {
    // 如果合并失败，跳过（不丢失数据）
    return { action: 'skipped' }
  }
}

/**
 * 迁移 v3.2 → v3.3（统一工具标识）
 *
 * 背景：
 * - v3.2 及之前版本使用 'claude' 和 'gemini' 作为工具标识
 * - v3.3 统一使用 'claude-code' 和 'gemini-cli'
 *
 * 迁移内容：
 * - claude.json → claude-code.json
 * - gemini.json → gemini-cli.json
 *
 * @returns 迁移结果
 */
export function migrateV32ToV33(): {
  success: boolean
  message: string
  details?: {
    migratedFiles: string[]
    mergedFiles: string[]
    skippedFiles: string[]
    backups: string[]
  }
} {
  const migratedFiles: string[] = []
  const mergedFiles: string[] = []
  const skippedFiles: string[] = []
  const backups: string[] = []

  try {
    for (const [oldFile, newFile] of Object.entries(CONFIG_FILE_MIGRATION_MAP)) {
      const result = migrateConfigFile(oldFile, newFile)

      switch (result.action) {
        case 'renamed':
          migratedFiles.push(`${oldFile} → ${newFile}`)
          if (result.backupPath) backups.push(result.backupPath)
          break
        case 'merged':
          mergedFiles.push(`${oldFile} → ${newFile}`)
          if (result.backupPath) backups.push(result.backupPath)
          break
        case 'skipped':
          skippedFiles.push(oldFile)
          break
      }
    }

    const totalMigrated = migratedFiles.length + mergedFiles.length

    if (totalMigrated === 0) {
      return {
        success: true,
        message: '无需迁移：配置文件已是最新格式',
        details: { migratedFiles, mergedFiles, skippedFiles, backups },
      }
    }

    return {
      success: true,
      message: `成功迁移 ${totalMigrated} 个配置文件`,
      details: { migratedFiles, mergedFiles, skippedFiles, backups },
    }
  } catch (error) {
    return {
      success: false,
      message: `迁移失败: ${(error as Error).message}`,
      details: { migratedFiles, mergedFiles, skippedFiles, backups },
    }
  }
}

/**
 * 运行所有迁移
 *
 * 按版本顺序执行所有迁移函数
 */
export function runAllMigrations(): {
  success: boolean
  messages: string[]
} {
  const messages: string[] = []
  let allSuccess = true

  // v1 → v2 迁移
  const v1Result = migrateConfig()
  messages.push(`[v1→v2] ${v1Result.message}`)
  if (!v1Result.success) allSuccess = false

  // v2 → v3 迁移
  const v2Result = migrateV2ToV3()
  messages.push(`[v2→v3] ${v2Result.message}`)
  if (!v2Result.success) allSuccess = false

  // v3.2 → v3.3 迁移
  const v32Result = migrateV32ToV33()
  messages.push(`[v3.2→v3.3] ${v32Result.message}`)
  if (!v32Result.success) allSuccess = false

  return {
    success: allSuccess,
    messages,
  }
}

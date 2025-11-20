/**
 * 三种同步模式实现
 *
 * 1. 上传到云端（Upload）：本地覆盖云端，加密 API Key
 * 2. 从云端下载（Download）：云端覆盖本地，解密 API Key
 * 3. 智能合并（Merge）：合并本地和云端，同步到云端
 */

import fs from 'fs'
import path from 'path'
import type { SyncConfig } from './types.js'
import type { Provider } from '../tool-manager.js'
import { updateLastSyncTime } from '../config.js'
import { uploadToWebDAV, downloadFromWebDAV, existsOnWebDAV } from './webdav-client.js'
import { encryptProviders, decryptProviders } from './crypto.js'
import { mergeProviders, mergePresets } from './merge-advanced.js'
import { backupConfig } from './merge.js'
import { getCcmanDir } from '../paths.js'
import { readJSON, writeJSON } from '../utils/file.js'
import { writeCodexConfig } from '../writers/codex.js'
import { writeClaudeConfig } from '../writers/claude.js'
import { writeGeminiConfig } from '../writers/gemini.js'
import { MAIN_TOOL_TYPES, type MainToolType } from '../constants.js'

/**
 * 单个工具的同步配置
 */
interface ToolSyncConfig {
  /** 远程文件路径（相对于 WebDAV 根目录） */
  remotePath: string
  /** 本地配置文件名 */
  configFilename: string
  /** 写入官方配置的函数 */
  writerFunc: (provider: Provider) => void
}

/**
 * 所有工具的同步配置映射
 *
 * 使用 Record<MainToolType, ...> 确保编译时类型安全：
 * - 如果在 constants.ts 的 MAIN_TOOL_TYPES 添加新工具
 * - 但忘记在此处添加配置
 * - TypeScript 会在编译时报错
 */
const TOOL_SYNC_CONFIG: Record<MainToolType, ToolSyncConfig> = {
  [MAIN_TOOL_TYPES.CODEX]: {
    remotePath: '.ccman/codex.json',
    configFilename: 'codex.json',
    writerFunc: writeCodexConfig,
  },
  [MAIN_TOOL_TYPES.CLAUDE]: {
    remotePath: '.ccman/claude.json',
    configFilename: 'claude.json',
    writerFunc: writeClaudeConfig,
  },
  [MAIN_TOOL_TYPES.GEMINI]: {
    remotePath: '.ccman/gemini.json',
    configFilename: 'gemini.json',
    writerFunc: writeGeminiConfig,
  },
} as const

/**
 * 工具配置文件结构
 */
interface ToolConfig {
  currentProviderId?: string
  providers: Provider[]
  presets?: any[]
  // 可能还有其他字段（通过扩展运算符自动保留）
}

/**
 * 模式1：上传到云端
 * 本地配置覆盖云端，加密 API Key
 *
 * @param config - WebDAV 配置
 * @param password - 同步密码
 */
export async function uploadToCloud(config: SyncConfig, password: string): Promise<void> {
  const ccmanDir = getCcmanDir()
  const toolKeys = Object.keys(TOOL_SYNC_CONFIG) as MainToolType[]

  // 遍历所有工具，上传配置到云端
  for (const tool of toolKeys) {
    const { remotePath, configFilename } = TOOL_SYNC_CONFIG[tool]
    const configPath = path.join(ccmanDir, configFilename)

    // 读取本地配置
    const localConfig = readJSON<ToolConfig>(configPath)

    // 加密 API Key（保留配置的所有其他字段）
    const encryptedProviders = encryptProviders(localConfig.providers, password)

    // 构建加密后的配置（使用扩展运算符保留所有字段）
    const encryptedConfig = {
      ...localConfig, // 保留所有字段
      providers: encryptedProviders, // 只替换 providers（加密后的）
    }

    // 上传到 WebDAV
    const jsonContent = JSON.stringify(encryptedConfig, null, 2)
    await uploadToWebDAV(config, remotePath, jsonContent)
  }

  // 更新最后同步时间
  updateLastSyncTime()

  console.log('✅ 配置已上传到云端')
}

/**
 * 模式2：从云端下载
 * 云端配置覆盖本地，解密 API Key
 *
 * @param config - WebDAV 配置
 * @param password - 同步密码
 * @returns 备份文件路径列表
 */
export async function downloadFromCloud(config: SyncConfig, password: string): Promise<string[]> {
  const ccmanDir = getCcmanDir()
  const toolKeys = Object.keys(TOOL_SYNC_CONFIG) as MainToolType[]

  // 检查远程是否存在至少一个配置文件
  const existsChecks = await Promise.all(
    toolKeys.map(async (tool) => {
      const { remotePath } = TOOL_SYNC_CONFIG[tool]
      return existsOnWebDAV(config, remotePath)
    })
  )

  if (!existsChecks.some((exists) => exists)) {
    throw new Error('远程配置不存在，请先上传配置')
  }

  // 下载所有工具的远程配置
  type RemoteConfigData = {
    tool: MainToolType
    config: ToolConfig | null
    decryptedProviders: Provider[] | null
  }

  const remoteConfigs: RemoteConfigData[] = []

  for (let i = 0; i < toolKeys.length; i++) {
    const tool = toolKeys[i]
    const { remotePath } = TOOL_SYNC_CONFIG[tool]

    if (existsChecks[i]) {
      const jsonContent = await downloadFromWebDAV(config, remotePath)
      const remoteConfig: ToolConfig = JSON.parse(jsonContent)

      try {
        const decryptedProviders = decryptProviders(remoteConfig.providers, password)
        remoteConfigs.push({ tool, config: remoteConfig, decryptedProviders })
      } catch (error) {
        throw new Error('解密失败：密码错误或数据损坏')
      }
    } else {
      remoteConfigs.push({ tool, config: null, decryptedProviders: null })
    }
  }

  // 备份本地配置
  const backupPaths: string[] = []

  try {
    for (const tool of toolKeys) {
      const { configFilename } = TOOL_SYNC_CONFIG[tool]
      const configPath = path.join(ccmanDir, configFilename)

      if (fs.existsSync(configPath)) {
        backupPaths.push(backupConfig(configPath))
      }
    }
  } catch (error) {
    throw new Error(`备份失败: ${(error as Error).message}`)
  }

  // 直接覆盖本地配置（覆盖策略：云端配置是什么就同步什么）
  try {
    for (const { tool, config: remoteConfig, decryptedProviders } of remoteConfigs) {
      if (!remoteConfig || !decryptedProviders) continue

      const { configFilename } = TOOL_SYNC_CONFIG[tool]
      const configPath = path.join(ccmanDir, configFilename)

      const newConfig = {
        ...remoteConfig, // 使用云端配置的所有字段
        providers: decryptedProviders, // 只替换 providers（解密后的）
      }

      writeJSON(configPath, newConfig)

      // 自动应用当前 provider 到官方工具配置
      applyCurrentProvider(tool, newConfig)
    }

    // 更新最后同步时间
    updateLastSyncTime()

    console.log('✅ 配置已从云端下载并应用')
    return backupPaths
  } catch (error) {
    // 恢复备份
    for (const backupPath of backupPaths) {
      const originalPath = backupPath.replace(/\.backup\.\d+$/, '')
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, originalPath)
      }
    }
    throw new Error(`覆盖配置失败，已恢复备份: ${(error as Error).message}`)
  }
}

/**
 * 模式3：智能合并
 * 合并本地和云端配置，同步到云端
 *
 * @param config - WebDAV 配置
 * @param password - 同步密码
 * @returns 合并结果
 */
export async function mergeSync(
  config: SyncConfig,
  password: string
): Promise<{
  hasChanges: boolean
  backupPaths: string[]
}> {
  const ccmanDir = getCcmanDir()
  const toolKeys = Object.keys(TOOL_SYNC_CONFIG) as MainToolType[]

  // 检查远程是否存在至少一个配置文件
  const existsChecks = await Promise.all(
    toolKeys.map(async (tool) => {
      const { remotePath } = TOOL_SYNC_CONFIG[tool]
      return existsOnWebDAV(config, remotePath)
    })
  )

  if (!existsChecks.some((exists) => exists)) {
    // 远程不存在，直接上传本地配置
    console.log('远程配置不存在，执行上传操作')
    await uploadToCloud(config, password)
    return {
      hasChanges: true,
      backupPaths: [],
    }
  }

  // 下载并解密所有工具的远程配置
  type MergeData = {
    tool: MainToolType
    localConfig: ToolConfig
    remoteProviders: Provider[]
    mergeResult: { merged: Provider[]; hasChanges: boolean }
  }

  const mergeDataList: MergeData[] = []

  for (let i = 0; i < toolKeys.length; i++) {
    const tool = toolKeys[i]
    const { remotePath, configFilename } = TOOL_SYNC_CONFIG[tool]
    const configPath = path.join(ccmanDir, configFilename)

    // 读取本地配置
    const localConfig = readJSON<ToolConfig>(configPath)

    // 下载并解密远程配置
    let remoteProviders: Provider[] = []

    if (existsChecks[i]) {
      try {
        const jsonContent = await downloadFromWebDAV(config, remotePath)
        const remoteConfig: ToolConfig = JSON.parse(jsonContent)
        remoteProviders = decryptProviders(remoteConfig.providers, password)
      } catch (error) {
        throw new Error('解密失败：密码错误或数据损坏')
      }
    }

    // 执行智能合并
    const mergeResult = mergeProviders(localConfig.providers, remoteProviders)

    mergeDataList.push({
      tool,
      localConfig,
      remoteProviders,
      mergeResult,
    })
  }

  // 检查是否有变化
  const hasChanges = mergeDataList.some((data) => data.mergeResult.hasChanges)

  if (!hasChanges) {
    console.log('ℹ️ 配置已同步，无需操作')
    return {
      hasChanges: false,
      backupPaths: [],
    }
  }

  // 备份本地配置
  const backupPaths: string[] = []

  try {
    for (const tool of toolKeys) {
      const { configFilename } = TOOL_SYNC_CONFIG[tool]
      const configPath = path.join(ccmanDir, configFilename)

      if (fs.existsSync(configPath)) {
        backupPaths.push(backupConfig(configPath))
      }
    }
  } catch (error) {
    throw new Error(`备份失败: ${(error as Error).message}`)
  }

  // 写入合并后的配置到本地并上传到云端
  try {
    for (let i = 0; i < mergeDataList.length; i++) {
      const { tool, localConfig, mergeResult } = mergeDataList[i]
      const { remotePath, configFilename } = TOOL_SYNC_CONFIG[tool]
      const configPath = path.join(ccmanDir, configFilename)

      // 获取远程配置（如果存在）用于合并 presets
      let remoteConfig: ToolConfig | null = null
      if (existsChecks[i]) {
        const jsonContent = await downloadFromWebDAV(config, remotePath)
        remoteConfig = JSON.parse(jsonContent)
      }

      // 合并 presets
      const mergedPresets = mergePresets(localConfig.presets, remoteConfig?.presets)

      // 构建合并后的配置（使用扩展运算符保留所有字段）
      const mergedConfig = {
        ...localConfig, // 保留本地配置的所有字段
        providers: mergeResult.merged, // 替换为合并后的 providers
        presets: mergedPresets, // 替换为合并后的 presets
      }

      // 写入本地
      writeJSON(configPath, mergedConfig)

      // 自动应用当前 provider 到官方工具配置
      applyCurrentProvider(tool, mergedConfig)

      // 上传到云端（加密）
      const encryptedProviders = encryptProviders(mergeResult.merged, password)
      const encryptedConfig = {
        ...mergedConfig, // 保留合并后配置的所有字段
        providers: encryptedProviders, // 只替换 providers（加密后的）
      }

      const jsonContent = JSON.stringify(encryptedConfig, null, 2)
      await uploadToWebDAV(config, remotePath, jsonContent)
    }

    // 更新最后同步时间
    updateLastSyncTime()

    console.log('✅ 配置已合并并同步到云端')

    return {
      hasChanges: true,
      backupPaths,
    }
  } catch (error) {
    // 恢复备份
    for (const backupPath of backupPaths) {
      const originalPath = backupPath.replace(/\.backup\.\d+$/, '')
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, originalPath)
      }
    }
    throw new Error(`合并配置失败，已恢复备份: ${(error as Error).message}`)
  }
}

/**
 * 应用当前 provider 到官方工具配置
 * 用于下载/合并配置后自动应用
 *
 * @param tool - 工具类型
 * @param config - 工具配置
 */
function applyCurrentProvider(tool: MainToolType, config: ToolConfig): void {
  if (!config.currentProviderId) {
    // 没有当前 provider，跳过
    return
  }

  const provider = config.providers.find((p) => p.id === config.currentProviderId)
  if (!provider) {
    // Provider 不存在（可能被删除），跳过
    return
  }

  // 从配置映射中获取对应的 writer 函数
  const { writerFunc } = TOOL_SYNC_CONFIG[tool]
  writerFunc(provider)
}

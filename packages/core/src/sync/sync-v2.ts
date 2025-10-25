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
import {
  uploadToWebDAV,
  downloadFromWebDAV,
  existsOnWebDAV,
} from './webdav-client.js'
import {
  encryptProviders,
  decryptProviders,
} from './crypto.js'
import { mergeProviders, mergePresets, areProvidersEqual } from './merge-advanced.js'
import { backupConfig } from './merge.js'
import { getCcmanDir } from '../paths.js'
import { readJSON, writeJSON } from '../utils/file.js'
import { writeCodexConfig } from '../writers/codex.js'
import { writeClaudeConfig } from '../writers/claude.js'

// 远程文件路径
const CODEX_REMOTE_PATH = '.ccman/codex.json'
const CLAUDE_REMOTE_PATH = '.ccman/claude.json'

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
export async function uploadToCloud(
  config: SyncConfig,
  password: string
): Promise<void> {
  const ccmanDir = getCcmanDir()

  // 读取本地配置
  const codexConfigPath = path.join(ccmanDir, 'codex.json')
  const claudeConfigPath = path.join(ccmanDir, 'claude.json')

  const codexConfig = readJSON<ToolConfig>(codexConfigPath)
  const claudeConfig = readJSON<ToolConfig>(claudeConfigPath)

  // 加密 API Key（保留配置的所有其他字段）
  const encryptedCodexProviders = encryptProviders(codexConfig.providers, password)
  const encryptedClaudeProviders = encryptProviders(claudeConfig.providers, password)

  // 构建加密后的配置（使用扩展运算符保留所有字段）
  const encryptedCodexConfig = {
    ...codexConfig,  // 保留所有字段
    providers: encryptedCodexProviders,  // 只替换 providers（加密后的）
  }

  const encryptedClaudeConfig = {
    ...claudeConfig,  // 保留所有字段
    providers: encryptedClaudeProviders,  // 只替换 providers（加密后的）
  }

  // 上传到 WebDAV
  const codexJson = JSON.stringify(encryptedCodexConfig, null, 2)
  const claudeJson = JSON.stringify(encryptedClaudeConfig, null, 2)

  await uploadToWebDAV(config, CODEX_REMOTE_PATH, codexJson)
  await uploadToWebDAV(config, CLAUDE_REMOTE_PATH, claudeJson)

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
export async function downloadFromCloud(
  config: SyncConfig,
  password: string
): Promise<string[]> {
  // 检查远程是否存在配置文件
  const codexExists = await existsOnWebDAV(config, CODEX_REMOTE_PATH)
  const claudeExists = await existsOnWebDAV(config, CLAUDE_REMOTE_PATH)

  if (!codexExists && !claudeExists) {
    throw new Error('远程配置不存在，请先上传配置')
  }

  // 下载远程配置
  const codexJson = codexExists
    ? await downloadFromWebDAV(config, CODEX_REMOTE_PATH)
    : null
  const claudeJson = claudeExists
    ? await downloadFromWebDAV(config, CLAUDE_REMOTE_PATH)
    : null

  const remoteCodexConfig: ToolConfig | null = codexJson
    ? JSON.parse(codexJson)
    : null
  const remoteClaudeConfig: ToolConfig | null = claudeJson
    ? JSON.parse(claudeJson)
    : null

  // 解密 API Key
  let decryptedCodexProviders: Provider[] | null = null
  let decryptedClaudeProviders: Provider[] | null = null

  try {
    if (remoteCodexConfig) {
      decryptedCodexProviders = decryptProviders(remoteCodexConfig.providers, password)
    }
    if (remoteClaudeConfig) {
      decryptedClaudeProviders = decryptProviders(remoteClaudeConfig.providers, password)
    }
  } catch (error) {
    throw new Error('解密失败：密码错误或数据损坏')
  }

  // 备份本地配置
  const backupPaths: string[] = []
  const ccmanDir = getCcmanDir()
  const codexConfigPath = path.join(ccmanDir, 'codex.json')
  const claudeConfigPath = path.join(ccmanDir, 'claude.json')

  try {
    if (fs.existsSync(codexConfigPath)) {
      backupPaths.push(backupConfig(codexConfigPath))
    }
    if (fs.existsSync(claudeConfigPath)) {
      backupPaths.push(backupConfig(claudeConfigPath))
    }
  } catch (error) {
    throw new Error(`备份失败: ${(error as Error).message}`)
  }

  // 直接覆盖本地配置（覆盖策略：云端配置是什么就同步什么）
  try {
    // 更新 Codex 配置
    if (remoteCodexConfig && decryptedCodexProviders) {
      const newCodexConfig = {
        ...remoteCodexConfig,  // 使用云端配置的所有字段
        providers: decryptedCodexProviders,  // 只替换 providers（解密后的）
      }
      writeJSON(codexConfigPath, newCodexConfig)

      // 自动应用当前 provider 到 Codex 官方配置
      applyCurrentProvider('codex', newCodexConfig)
    }

    // 更新 Claude 配置
    if (remoteClaudeConfig && decryptedClaudeProviders) {
      const newClaudeConfig = {
        ...remoteClaudeConfig,  // 使用云端配置的所有字段
        providers: decryptedClaudeProviders,  // 只替换 providers（解密后的）
      }
      writeJSON(claudeConfigPath, newClaudeConfig)

      // 自动应用当前 provider 到 Claude 官方配置
      applyCurrentProvider('claude', newClaudeConfig)
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
  // 检查远程是否存在配置文件
  const codexExists = await existsOnWebDAV(config, CODEX_REMOTE_PATH)
  const claudeExists = await existsOnWebDAV(config, CLAUDE_REMOTE_PATH)

  if (!codexExists && !claudeExists) {
    // 远程不存在，直接上传本地配置
    console.log('远程配置不存在，执行上传操作')
    await uploadToCloud(config, password)
    return {
      hasChanges: true,
      backupPaths: [],
    }
  }

  // 下载远程配置
  const codexJson = codexExists
    ? await downloadFromWebDAV(config, CODEX_REMOTE_PATH)
    : null
  const claudeJson = claudeExists
    ? await downloadFromWebDAV(config, CLAUDE_REMOTE_PATH)
    : null

  const remoteCodexConfig: ToolConfig | null = codexJson
    ? JSON.parse(codexJson)
    : null
  const remoteClaudeConfig: ToolConfig | null = claudeJson
    ? JSON.parse(claudeJson)
    : null

  // 解密远程配置
  let remoteCodexProviders: Provider[] = []
  let remoteClaudeProviders: Provider[] = []

  try {
    if (remoteCodexConfig) {
      remoteCodexProviders = decryptProviders(remoteCodexConfig.providers, password)
    }
    if (remoteClaudeConfig) {
      remoteClaudeProviders = decryptProviders(remoteClaudeConfig.providers, password)
    }
  } catch (error) {
    throw new Error('解密失败：密码错误或数据损坏')
  }

  // 读取本地配置
  const ccmanDir = getCcmanDir()
  const codexConfigPath = path.join(ccmanDir, 'codex.json')
  const claudeConfigPath = path.join(ccmanDir, 'claude.json')

  const localCodexConfig = readJSON<ToolConfig>(codexConfigPath)
  const localClaudeConfig = readJSON<ToolConfig>(claudeConfigPath)

  // 执行智能合并
  const codexMergeResult = mergeProviders(
    localCodexConfig.providers,
    remoteCodexProviders
  )
  const claudeMergeResult = mergeProviders(
    localClaudeConfig.providers,
    remoteClaudeProviders
  )

  // 检查是否有变化
  const hasChanges = codexMergeResult.hasChanges || claudeMergeResult.hasChanges

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
    if (fs.existsSync(codexConfigPath)) {
      backupPaths.push(backupConfig(codexConfigPath))
    }
    if (fs.existsSync(claudeConfigPath)) {
      backupPaths.push(backupConfig(claudeConfigPath))
    }
  } catch (error) {
    throw new Error(`备份失败: ${(error as Error).message}`)
  }

  // 合并 presets
  const mergedCodexPresets = mergePresets(localCodexConfig.presets, remoteCodexConfig?.presets)
  const mergedClaudePresets = mergePresets(localClaudeConfig.presets, remoteClaudeConfig?.presets)

  // 写入合并后的配置到本地（使用扩展运算符保留所有字段）
  try {
    const mergedCodexConfig = {
      ...localCodexConfig,  // 保留本地配置的所有字段
      providers: codexMergeResult.merged,  // 替换为合并后的 providers
      presets: mergedCodexPresets,  // 替换为合并后的 presets
    }

    const mergedClaudeConfig = {
      ...localClaudeConfig,  // 保留本地配置的所有字段
      providers: claudeMergeResult.merged,  // 替换为合并后的 providers
      presets: mergedClaudePresets,  // 替换为合并后的 presets
    }

    writeJSON(codexConfigPath, mergedCodexConfig)
    writeJSON(claudeConfigPath, mergedClaudeConfig)

    // 自动应用当前 provider 到官方工具配置
    applyCurrentProvider('codex', mergedCodexConfig)
    applyCurrentProvider('claude', mergedClaudeConfig)

    // 上传合并后的配置到云端（使用扩展运算符保留所有字段）
    const encryptedCodexProviders = encryptProviders(codexMergeResult.merged, password)
    const encryptedClaudeProviders = encryptProviders(claudeMergeResult.merged, password)

    const encryptedCodexConfig = {
      ...mergedCodexConfig,  // 保留合并后配置的所有字段
      providers: encryptedCodexProviders,  // 只替换 providers（加密后的）
    }

    const encryptedClaudeConfig = {
      ...mergedClaudeConfig,  // 保留合并后配置的所有字段
      providers: encryptedClaudeProviders,  // 只替换 providers（加密后的）
    }

    const codexJson = JSON.stringify(encryptedCodexConfig, null, 2)
    const claudeJson = JSON.stringify(encryptedClaudeConfig, null, 2)

    await uploadToWebDAV(config, CODEX_REMOTE_PATH, codexJson)
    await uploadToWebDAV(config, CLAUDE_REMOTE_PATH, claudeJson)

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
 * @param tool - 工具类型 ('codex' | 'claude')
 * @param config - 工具配置
 */
function applyCurrentProvider(tool: 'codex' | 'claude', config: ToolConfig): void {
  if (!config.currentProviderId) {
    // 没有当前 provider，跳过
    return
  }

  const provider = config.providers.find((p) => p.id === config.currentProviderId)
  if (!provider) {
    // Provider 不存在（可能被删除），跳过
    return
  }

  // 调用对应的 writer 函数
  if (tool === 'codex') {
    writeCodexConfig(provider)
  } else {
    writeClaudeConfig(provider)
  }
}

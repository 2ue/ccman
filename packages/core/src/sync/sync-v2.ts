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
import {
  uploadToWebDAV,
  downloadFromWebDAV,
  existsOnWebDAV,
} from './webdav-client.js'
import {
  encryptProviders,
  decryptProviders,
  type EncryptedProvider,
} from './crypto.js'
import { mergeProviders, areProvidersEqual } from './merge-advanced.js'
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
}

/**
 * 加密后的工具配置
 */
interface EncryptedToolConfig {
  currentProviderId?: string
  providers: EncryptedProvider[]
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

  // 加密 API Key
  const encryptedCodexProviders = encryptProviders(codexConfig.providers, password)
  const encryptedClaudeProviders = encryptProviders(claudeConfig.providers, password)

  // 构建加密后的配置
  const encryptedCodexConfig: EncryptedToolConfig = {
    currentProviderId: codexConfig.currentProviderId,
    providers: encryptedCodexProviders,
  }

  const encryptedClaudeConfig: EncryptedToolConfig = {
    currentProviderId: claudeConfig.currentProviderId,
    providers: encryptedClaudeProviders,
  }

  // 上传到 WebDAV
  const codexJson = JSON.stringify(encryptedCodexConfig, null, 2)
  const claudeJson = JSON.stringify(encryptedClaudeConfig, null, 2)

  await uploadToWebDAV(config, CODEX_REMOTE_PATH, codexJson)
  await uploadToWebDAV(config, CLAUDE_REMOTE_PATH, claudeJson)

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

  const remoteCodexConfig: EncryptedToolConfig | null = codexJson
    ? JSON.parse(codexJson)
    : null
  const remoteClaudeConfig: EncryptedToolConfig | null = claudeJson
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

  // 直接覆盖本地配置
  try {
    // 读取当前本地配置（用于保留 presets）
    const currentCodexConfig = readJSON<ToolConfig>(codexConfigPath)
    const currentClaudeConfig = readJSON<ToolConfig>(claudeConfigPath)

    // 更新 Codex 配置
    if (remoteCodexConfig && decryptedCodexProviders) {
      const newCodexConfig: ToolConfig = {
        currentProviderId: remoteCodexConfig.currentProviderId,
        providers: decryptedCodexProviders,
        presets: currentCodexConfig.presets, // 保留本地 presets
      }
      writeJSON(codexConfigPath, newCodexConfig)

      // 自动应用当前 provider 到 Codex 官方配置
      applyCurrentProvider('codex', newCodexConfig)
    }

    // 更新 Claude 配置
    if (remoteClaudeConfig && decryptedClaudeProviders) {
      const newClaudeConfig: ToolConfig = {
        currentProviderId: remoteClaudeConfig.currentProviderId,
        providers: decryptedClaudeProviders,
        presets: currentClaudeConfig.presets, // 保留本地 presets
      }
      writeJSON(claudeConfigPath, newClaudeConfig)

      // 自动应用当前 provider 到 Claude 官方配置
      applyCurrentProvider('claude', newClaudeConfig)
    }

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

  const remoteCodexConfig: EncryptedToolConfig | null = codexJson
    ? JSON.parse(codexJson)
    : null
  const remoteClaudeConfig: EncryptedToolConfig | null = claudeJson
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

  // 写入合并后的配置到本地
  try {
    const mergedCodexConfig: ToolConfig = {
      currentProviderId: localCodexConfig.currentProviderId,
      providers: codexMergeResult.merged,
      presets: localCodexConfig.presets,
    }

    const mergedClaudeConfig: ToolConfig = {
      currentProviderId: localClaudeConfig.currentProviderId,
      providers: claudeMergeResult.merged,
      presets: localClaudeConfig.presets,
    }

    writeJSON(codexConfigPath, mergedCodexConfig)
    writeJSON(claudeConfigPath, mergedClaudeConfig)

    // 自动应用当前 provider 到官方工具配置
    applyCurrentProvider('codex', mergedCodexConfig)
    applyCurrentProvider('claude', mergedClaudeConfig)

    // 上传合并后的配置到云端
    const encryptedCodexProviders = encryptProviders(codexMergeResult.merged, password)
    const encryptedClaudeProviders = encryptProviders(claudeMergeResult.merged, password)

    const encryptedCodexConfig: EncryptedToolConfig = {
      currentProviderId: mergedCodexConfig.currentProviderId,
      providers: encryptedCodexProviders,
    }

    const encryptedClaudeConfig: EncryptedToolConfig = {
      currentProviderId: mergedClaudeConfig.currentProviderId,
      providers: encryptedClaudeProviders,
    }

    const codexJson = JSON.stringify(encryptedCodexConfig, null, 2)
    const claudeJson = JSON.stringify(encryptedClaudeConfig, null, 2)

    await uploadToWebDAV(config, CODEX_REMOTE_PATH, codexJson)
    await uploadToWebDAV(config, CLAUDE_REMOTE_PATH, claudeJson)

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

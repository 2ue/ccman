/**
 * 配置同步逻辑
 *
 * 第一版策略：
 * 1. 上传：读取本地配置 → 移除 API Key → 上传到 WebDAV 指定目录
 * 2. 下载：备份本地配置 → 下载远程配置 → 直接覆盖本地
 *
 * 上传规则：{remoteDir}/.ccman/codex.json, {remoteDir}/.ccman/claude.json
 */

import fs from 'fs'
import path from 'path'
import type { SyncConfig, ToolConfigForSync } from './types.js'
import type { Provider } from '../tool-manager.js'
import {
  uploadToWebDAV,
  downloadFromWebDAV,
  existsOnWebDAV,
} from './webdav-client.js'
import { stripApiKeys, backupConfig, validateToolConfig } from './merge.js'
import { getCcmanDir } from '../paths.js'
import { readJSON, writeJSON } from '../utils/file.js'

// 远程文件路径
const CODEX_REMOTE_PATH = '.ccman/codex.json'
const CLAUDE_REMOTE_PATH = '.ccman/claude.json'

/**
 * 工具配置文件结构（与 tool-manager.ts 中的 ToolConfig 一致）
 */
interface ToolConfig {
  currentProviderId?: string
  providers: Provider[]
  presets?: any[]
}

/**
 * 获取 Codex 配置（不含 API Key）
 *
 * @returns Codex 同步数据
 */
export function getCodexSyncData(): ToolConfigForSync {
  const ccmanDir = getCcmanDir()
  const codexConfigPath = path.join(ccmanDir, 'codex.json')
  const codexConfig = readJSON<ToolConfig>(codexConfigPath)

  return {
    currentProviderId: codexConfig.currentProviderId,
    providers: stripApiKeys(codexConfig.providers),
  }
}

/**
 * 获取 Claude 配置（不含 API Key）
 *
 * @returns Claude 同步数据
 */
export function getClaudeSyncData(): ToolConfigForSync {
  const ccmanDir = getCcmanDir()
  const claudeConfigPath = path.join(ccmanDir, 'claude.json')
  const claudeConfig = readJSON<ToolConfig>(claudeConfigPath)

  return {
    currentProviderId: claudeConfig.currentProviderId,
    providers: stripApiKeys(claudeConfig.providers),
  }
}

/**
 * 获取本地配置的同步数据（不含 API Key）
 * @deprecated 使用 getCodexSyncData() 和 getClaudeSyncData() 替代
 */
export function getLocalSyncData() {
  return {
    version: '1.0.0',
    timestamp: Date.now(),
    codex: getCodexSyncData(),
    claude: getClaudeSyncData(),
  }
}

/**
 * 上传配置到 WebDAV
 *
 * @param syncConfig - WebDAV 配置
 */
export async function uploadConfig(syncConfig: SyncConfig): Promise<void> {
  // 分别上传 Codex 和 Claude 配置
  const codexSyncData = getCodexSyncData()
  const claudeSyncData = getClaudeSyncData()

  const codexJson = JSON.stringify(codexSyncData, null, 2)
  const claudeJson = JSON.stringify(claudeSyncData, null, 2)

  // 上传到 {remoteDir}/.ccman/codex.json 和 {remoteDir}/.ccman/claude.json
  await uploadToWebDAV(syncConfig, CODEX_REMOTE_PATH, codexJson)
  await uploadToWebDAV(syncConfig, CLAUDE_REMOTE_PATH, claudeJson)
}

/**
 * 下载并覆盖本地配置
 *
 * @param syncConfig - WebDAV 配置
 * @returns 备份文件路径列表
 */
export async function downloadAndOverwriteConfig(
  syncConfig: SyncConfig
): Promise<string[]> {
  // 检查远程是否存在配置文件
  const codexExists = await existsOnWebDAV(syncConfig, CODEX_REMOTE_PATH)
  const claudeExists = await existsOnWebDAV(syncConfig, CLAUDE_REMOTE_PATH)

  if (!codexExists && !claudeExists) {
    throw new Error('远程配置不存在，请先上传配置')
  }

  // 下载远程配置
  const codexJson = codexExists ? await downloadFromWebDAV(syncConfig, CODEX_REMOTE_PATH) : null
  const claudeJson = claudeExists ? await downloadFromWebDAV(syncConfig, CLAUDE_REMOTE_PATH) : null

  const remoteCodexConfig: ToolConfigForSync | null = codexJson ? JSON.parse(codexJson) : null
  const remoteClaudeConfig: ToolConfigForSync | null = claudeJson ? JSON.parse(claudeJson) : null

  // 验证数据
  if (remoteCodexConfig && !validateToolConfig(remoteCodexConfig)) {
    throw new Error('远程 Codex 配置格式无效')
  }
  if (remoteClaudeConfig && !validateToolConfig(remoteClaudeConfig)) {
    throw new Error('远程 Claude 配置格式无效')
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

  // 直接覆盖本地配置（保留本地 API Key）
  try {
    // 读取当前本地配置（用于保留 API Key）
    // 如果本地配置不存在（新环境），使用空配置
    const currentCodexConfig = fs.existsSync(codexConfigPath)
      ? readJSON<ToolConfig>(codexConfigPath)
      : { providers: [] }
    const currentClaudeConfig = fs.existsSync(claudeConfigPath)
      ? readJSON<ToolConfig>(claudeConfigPath)
      : { providers: [] }

    // 更新 Codex 配置
    if (remoteCodexConfig) {
      const newCodexConfig: ToolConfig = {
        ...currentCodexConfig,
        currentProviderId: remoteCodexConfig.currentProviderId,
        providers: remoteCodexConfig.providers.map((remoteProvider: any) => {
          // 尝试从本地找到相同 ID 的 provider 以保留 API Key
          const localProvider = currentCodexConfig.providers.find(
            (p: Provider) => p.id === remoteProvider.id
          )
          return {
            ...remoteProvider,
            apiKey: localProvider?.apiKey || '',
          } as Provider
        }),
      }
      writeJSON(codexConfigPath, newCodexConfig)
    }

    // 更新 Claude 配置
    if (remoteClaudeConfig) {
      const newClaudeConfig: ToolConfig = {
        ...currentClaudeConfig,
        currentProviderId: remoteClaudeConfig.currentProviderId,
        providers: remoteClaudeConfig.providers.map((remoteProvider: any) => {
          const localProvider = currentClaudeConfig.providers.find(
            (p: Provider) => p.id === remoteProvider.id
          )
          return {
            ...remoteProvider,
            apiKey: localProvider?.apiKey || '',
          } as Provider
        }),
      }
      writeJSON(claudeConfigPath, newClaudeConfig)
    }

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
 * 获取远程配置信息（不下载）
 *
 * @param syncConfig - WebDAV 配置
 * @returns 远程配置信息
 */
export async function getRemoteSyncInfo(
  syncConfig: SyncConfig
): Promise<{
  codexExists: boolean
  claudeExists: boolean
  codexData?: ToolConfigForSync
  claudeData?: ToolConfigForSync
}> {
  const codexExists = await existsOnWebDAV(syncConfig, CODEX_REMOTE_PATH)
  const claudeExists = await existsOnWebDAV(syncConfig, CLAUDE_REMOTE_PATH)

  const result: any = {
    codexExists,
    claudeExists,
  }

  try {
    if (codexExists) {
      const codexJson = await downloadFromWebDAV(syncConfig, CODEX_REMOTE_PATH)
      const codexData: ToolConfigForSync = JSON.parse(codexJson)

      if (!validateToolConfig(codexData)) {
        throw new Error('远程 Codex 配置格式无效')
      }

      result.codexData = codexData
    }

    if (claudeExists) {
      const claudeJson = await downloadFromWebDAV(syncConfig, CLAUDE_REMOTE_PATH)
      const claudeData: ToolConfigForSync = JSON.parse(claudeJson)

      if (!validateToolConfig(claudeData)) {
        throw new Error('远程 Claude 配置格式无效')
      }

      result.claudeData = claudeData
    }

    return result
  } catch (error) {
    throw new Error(`获取远程配置失败: ${(error as Error).message}`)
  }
}

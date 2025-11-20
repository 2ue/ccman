import * as fs from 'fs'
import { getGeminiDir, getGeminiSettingsPath, getGeminiEnvPath } from '../paths.js'
import { ensureDir, fileExists } from '../utils/file.js'
import type { Provider } from '../tool-manager.js'

/**
 * Gemini CLI settings.json 顶层结构（宽松定义，保持向后兼容）
 */
interface GeminiSettings {
  ide?: {
    enabled?: boolean
    // 预留其他字段
    [key: string]: unknown
  }
  security?: {
    auth?: {
      selectedType?: string
      enforcedType?: string
      useExternal?: boolean
      // 预留其他字段
      [key: string]: unknown
    }
    // 预留其他字段
    [key: string]: unknown
  }
  // 其他字段使用索引签名保留
  [key: string]: unknown
}

/**
 * 读取 .env 文件为键值对（简单解析 KEY=VALUE，忽略注释和空行）
 */
function loadEnvFile(envPath: string): Record<string, string> {
  if (!fileExists(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf-8')
  const result: Record<string, string> = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    if (!key) continue
    result[key] = value
  }

  return result
}

/**
 * 将键值对写入 .env 文件（简单覆盖，按 KEY 排序）
 */
function saveEnvFile(envPath: string, env: Record<string, string>): void {
  const lines: string[] = []
  const keys = Object.keys(env).sort()
  for (const key of keys) {
    lines.push(`${key}=${String(env[key])}`)
  }
  const content = lines.join('\n') + (lines.length ? '\n' : '')
  fs.writeFileSync(envPath, content, { mode: 0o600 })
}

/**
 * 将 Provider 应用到 Gemini CLI 的配置（按照官方文档）
 *
 * settings.json（官方配置）:
 * {
 *   "ide": { "enabled": true },
 *   "security": { "auth": { "selectedType": "gemini-api-key" } }
 * }
 *
 * ~/.gemini/.env（官方配置）:
 * GOOGLE_GEMINI_BASE_URL=https://www.packyapi.com
 * GEMINI_API_KEY=YOUR_API_KEY
 * GEMINI_MODEL=gemini-2.5-pro
 */
export function writeGeminiConfig(provider: Provider): void {
  const settingsPath = getGeminiSettingsPath()
  const envPath = getGeminiEnvPath()
  const dir = getGeminiDir()

  // 确保目录存在
  ensureDir(dir)

  // 1. 更新 settings.json
  let settings: GeminiSettings = {}

  if (fileExists(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && typeof parsed === 'object') {
        settings = parsed as GeminiSettings
      }
    } catch (error) {
      throw new Error(`无法读取 Gemini settings.json: ${(error as Error).message}`)
    }
  }

  // 确保启用 IDE 集成
  if (!settings.ide || typeof settings.ide !== 'object') {
    settings.ide = {}
  }
  if (settings.ide.enabled === undefined) {
    settings.ide.enabled = true
  }

  // 配置认证方式为 API Key（默认值，不覆盖用户自定义）
  if (!settings.security || typeof settings.security !== 'object') {
    settings.security = {}
  }
  if (!settings.security.auth || typeof settings.security.auth !== 'object') {
    settings.security.auth = {}
  }
  if (settings.security.auth.selectedType === undefined) {
    settings.security.auth.selectedType = 'gemini-api-key'
  }

  // 原子写入 settings.json
  try {
    const tempPath = `${settingsPath}.tmp`
    fs.writeFileSync(tempPath, JSON.stringify(settings, null, 2), {
      mode: 0o600,
    })
    fs.renameSync(tempPath, settingsPath)
  } catch (error) {
    throw new Error(`写入 Gemini settings.json 失败: ${(error as Error).message}`)
  }

  // 2. 更新 ~/.gemini/.env
  const env = loadEnvFile(envPath)

  // baseUrl → GOOGLE_GEMINI_BASE_URL
  if (provider.baseUrl && provider.baseUrl.trim().length > 0) {
    env.GOOGLE_GEMINI_BASE_URL = provider.baseUrl
  } else {
    delete env.GOOGLE_GEMINI_BASE_URL
  }

  // apiKey → GEMINI_API_KEY
  if (provider.apiKey && provider.apiKey.trim().length > 0) {
    env.GEMINI_API_KEY = provider.apiKey
  } else {
    delete env.GEMINI_API_KEY
  }

  // model → GEMINI_MODEL
  if (provider.model && provider.model.trim().length > 0) {
    env.GEMINI_MODEL = provider.model
  }

  saveEnvFile(envPath, env)
}

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
  model?: {
    name?: string
    [key: string]: unknown
  }
  // 其他字段使用索引签名保留
  [key: string]: unknown
}

interface GeminiProviderMeta {
  defaultModel?: string
  env?: Record<string, string | number>
}

/**
 * 从 Provider.model 字段解析 Gemini 额外配置
 * - 如果是合法 JSON，则读取 defaultModel / env
 * - 否则忽略，保持安全
 */
function parseGeminiMeta(provider: Provider): GeminiProviderMeta {
  if (!provider.model) return {}
  try {
    const parsed = JSON.parse(provider.model) as Partial<GeminiProviderMeta>
    const meta: GeminiProviderMeta = {}
    if (typeof parsed.defaultModel === 'string') {
      meta.defaultModel = parsed.defaultModel
    }
    if (parsed.env && typeof parsed.env === 'object') {
      meta.env = parsed.env as Record<string, string | number>
    }
    return meta
  } catch {
    // 非 JSON 或结构不符合时，忽略 meta
    return {}
  }
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
 * 将 Provider 应用到 Gemini CLI 的配置
 *
 * 策略：
 * - settings.json:
 *   - 仅在 meta.defaultModel 存在时更新 model.name
 *   - 其他字段全部保留
 * - ~/.gemini/.env:
 *   - baseUrl → GOOGLE_GEMINI_BASE_URL（空则删除该键）
 *   - apiKey → GEMINI_API_KEY（空则删除该键）
 *   - meta.env 中的键值合并进去
 */
export function writeGeminiConfig(provider: Provider): void {
  const settingsPath = getGeminiSettingsPath()
  const envPath = getGeminiEnvPath()
  const dir = getGeminiDir()

  // 确保目录存在
  ensureDir(dir)

  const meta = parseGeminiMeta(provider)

  // 1. 更新 settings.json（只管 model.name）
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

  // 更新 model.name（如果提供了 defaultModel）
  if (meta.defaultModel) {
    if (!settings.model || typeof settings.model !== 'object') {
      settings.model = {}
    }
    settings.model.name = meta.defaultModel
  }

  // 确保启用 IDE 集成（默认开启，但不覆盖用户显式关闭）
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

  // defaultModel → GEMINI_MODEL（如果未在现有 env 或 meta.env 中显式指定）
  if (meta.defaultModel && env.GEMINI_MODEL === undefined) {
    env.GEMINI_MODEL = meta.defaultModel
  }

  // 合并 meta.env
  if (meta.env) {
    for (const [key, value] of Object.entries(meta.env)) {
      env[key] = String(value)
    }
  }

  saveEnvFile(envPath, env)
}

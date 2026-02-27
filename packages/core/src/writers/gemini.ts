import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { getGeminiDir, getGeminiSettingsPath, getGeminiEnvPath } from '../paths.js'
import { ensureDir, fileExists } from '../utils/file.js'
import type { Provider } from '../tool-manager.js'
import { deepMerge } from '../utils/template.js'

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

// ESM 环境下获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function resolveTemplatePath(relativePath: string): string | null {
  const candidates = [
    // @ccman/core runtime (dist/writers -> templates)
    path.resolve(__dirname, '../../templates', relativePath),
    // Bundled CLI runtime (dist -> dist/templates)
    path.resolve(__dirname, 'templates', relativePath),
    // Fallback (some bundlers/layouts)
    path.resolve(__dirname, '../templates', relativePath),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  return null
}

const GEMINI_SETTINGS_TEMPLATE: GeminiSettings = {
  ide: {
    enabled: true,
  },
  security: {
    auth: {
      selectedType: 'gemini-api-key',
    },
  },
}

const GEMINI_ENV_TEMPLATE = [
  '# Managed by ccman',
  'GOOGLE_GEMINI_BASE_URL={{baseUrl}}',
  'GEMINI_API_KEY={{apiKey}}',
].join('\n')

/**
 * 读取 Gemini settings 模板
 *
 * 优先从 templates/gemini/settings.json 读取，
 * 如果不存在或读取失败，则回退到 GEMINI_SETTINGS_TEMPLATE
 */
function loadGeminiSettingsTemplate(): GeminiSettings {
  try {
    const templatePath = resolveTemplatePath('gemini/settings.json')
    if (templatePath) {
      const content = fs.readFileSync(templatePath, 'utf-8')
      return JSON.parse(content) as GeminiSettings
    }
  } catch {
    // 忽略错误，使用内置默认模板
  }

  return GEMINI_SETTINGS_TEMPLATE
}

/**
 * 读取 Gemini .env 模板（支持 {{baseUrl}}/{{apiKey}} 变量）
 */
function loadGeminiEnvTemplate(provider: Provider): Record<string, string> {
  let templateContent = GEMINI_ENV_TEMPLATE

  try {
    const templatePath = resolveTemplatePath('gemini/.env')
    if (templatePath) {
      templateContent = fs.readFileSync(templatePath, 'utf-8')
    }
  } catch {
    // 忽略错误，使用内置默认模板
  }

  const content = templateContent
    .replaceAll('{{baseUrl}}', provider.baseUrl || '')
    .replaceAll('{{apiKey}}', provider.apiKey || '')

  return parseEnvContent(content)
}

/**
 * 读取 .env 文件为键值对（简单解析 KEY=VALUE，忽略注释和空行）
 */
function parseEnvContent(content: string): Record<string, string> {
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

function loadEnvFile(envPath: string): Record<string, string> {
  if (!fileExists(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf-8')
  return parseEnvContent(content)
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
  const tempPath = `${envPath}.tmp`
  fs.writeFileSync(tempPath, content, { mode: 0o600 })
  fs.renameSync(tempPath, envPath)
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
 * GOOGLE_GEMINI_BASE_URL=https://gmn.chuangzuoli.com
 * GEMINI_API_KEY=YOUR_API_KEY
 * GEMINI_MODEL=gemini-2.5-pro
 */
export function writeGeminiConfig(provider: Provider): void {
  const settingsPath = getGeminiSettingsPath()
  const envPath = getGeminiEnvPath()
  const dir = getGeminiDir()

  // 确保目录存在
  ensureDir(dir)

  // 1. 更新 settings.json（模板 + 深度合并）
  let userSettings: GeminiSettings = {}

  if (fileExists(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && typeof parsed === 'object') {
        userSettings = parsed as GeminiSettings
      }
    } catch (error) {
      throw new Error(`无法读取 Gemini settings.json: ${(error as Error).message}`)
    }
  }

  const settingsTemplate = loadGeminiSettingsTemplate()
  const settings = deepMerge<GeminiSettings>(settingsTemplate, userSettings)

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
  const existingEnv = loadEnvFile(envPath)
  const templateEnv = loadGeminiEnvTemplate(provider)
  const env = {
    ...existingEnv,
    ...templateEnv,
  }

  // 模板变量为空时，显式移除对应键
  if (!templateEnv.GOOGLE_GEMINI_BASE_URL) {
    delete env.GOOGLE_GEMINI_BASE_URL
  }
  if (!templateEnv.GEMINI_API_KEY) {
    delete env.GEMINI_API_KEY
  }

  // 解析 provider.model（可能是 JSON 元数据或纯字符串）
  let modelMeta: { defaultModel?: string; env?: Record<string, string> } | null = null
  if (provider.model && provider.model.trim().length > 0) {
    try {
      const parsed = JSON.parse(provider.model)
      if (parsed && typeof parsed === 'object') {
        modelMeta = parsed
      }
    } catch {
      // 不是 JSON，当作普通模型名称
      env.GEMINI_MODEL = provider.model
    }
  }

  // 如果是 JSON 元数据，合并 env 并处理 fallback
  if (modelMeta) {
    // 合并 meta.env 到 .env
    if (modelMeta.env && typeof modelMeta.env === 'object') {
      for (const [key, value] of Object.entries(modelMeta.env)) {
        if (typeof value === 'string') {
          env[key] = value
        }
      }
    }
    // fallback: 如果没有 GEMINI_MODEL，从 defaultModel 提取
    if (!env.GEMINI_MODEL && modelMeta.defaultModel) {
      env.GEMINI_MODEL = modelMeta.defaultModel
    }
  }

  saveEnvFile(envPath, env)
}

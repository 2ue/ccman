import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { Provider } from '../tool-manager.js'
import { getOpenCodeConfigPath, getOpenCodeDir } from '../paths.js'
import { ensureDir, fileExists, readJSON, writeJSON } from '../utils/file.js'
import { replaceVariables, deepMerge } from '../utils/template.js'

const OPENCODE_SCHEMA = 'https://opencode.ai/config.json'
const DEFAULT_NPM_PACKAGE = '@ai-sdk/openai'

type ReasoningEffort = 'xhigh' | 'high' | 'medium' | 'low'

interface OpenCodeModelVariant {
  reasoningEffort: ReasoningEffort
  textVerbosity: 'low'
  reasoningSummary: 'auto'
}

interface OpenCodeModelConfig {
  variants: Record<ReasoningEffort, OpenCodeModelVariant>
}

interface OpenCodeModels {
  [modelName: string]: OpenCodeModelConfig
}

interface OpenCodeProviderOptions {
  baseURL: string
  apiKey: string
  [key: string]: unknown
}

interface OpenCodeProvider {
  npm: string
  name: string
  options: OpenCodeProviderOptions
  models?: OpenCodeModels
  [key: string]: unknown
}

interface OpenCodeConfig {
  $schema?: string
  provider?: Record<string, OpenCodeProvider>
  [key: string]: unknown
}

interface OpenCodeProviderMeta {
  npm?: string
  models?: OpenCodeModels
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

const DEFAULT_MODELS: OpenCodeModels = {
  'gpt-5.2-codex': {
    variants: {
      xhigh: {
        reasoningEffort: 'xhigh',
        textVerbosity: 'low',
        reasoningSummary: 'auto',
      },
      high: {
        reasoningEffort: 'high',
        textVerbosity: 'low',
        reasoningSummary: 'auto',
      },
      medium: {
        reasoningEffort: 'medium',
        textVerbosity: 'low',
        reasoningSummary: 'auto',
      },
      low: {
        reasoningEffort: 'low',
        textVerbosity: 'low',
        reasoningSummary: 'auto',
      },
    },
  },
}

const OPENCODE_CONFIG_TEMPLATE: OpenCodeConfig = {
  $schema: OPENCODE_SCHEMA,
  provider: {
    '{{providerKey}}': {
      npm: '{{npmPackage}}',
      name: '{{providerName}}',
      options: {
        baseURL: '{{baseUrl}}',
        apiKey: '{{apiKey}}',
      },
      models: DEFAULT_MODELS,
    },
  },
}

function loadOpenCodeTemplateConfig(): OpenCodeConfig {
  try {
    const templatePath = resolveTemplatePath('opencode/opencode.json')
    if (templatePath) {
      const content = fs.readFileSync(templatePath, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && typeof parsed === 'object') {
        return parsed as OpenCodeConfig
      }
    }
  } catch {
    // 忽略错误，使用内置默认模板
  }
  return OPENCODE_CONFIG_TEMPLATE
}

function parseProviderMeta(raw?: string): OpenCodeProviderMeta | null {
  if (!raw || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed as OpenCodeProviderMeta
    }
  } catch {
    // 兼容旧值：如果不是 JSON，则尝试当作 npm 包名
    return { npm: raw }
  }
  return null
}

function toProviderKey(name: string): string {
  const normalized = name.trim().toLowerCase()
  const collapsed = normalized.replace(/\s+/g, '-')
  const cleaned = collapsed.replace(/[^a-z0-9-_]/g, '')
  return cleaned || 'provider'
}

/**
 * 写入 OpenCode 配置（零破坏性）
 *
 * 策略：
 * 1. 读取现有配置并保留未管理字段
 * 2. 根据当前 provider 生成单一 provider 配置
 * 3. 写入 ~/.config/opencode/opencode.json
 */
export function writeOpenCodeConfig(provider: Provider): void {
  ensureDir(getOpenCodeDir())

  const configPath = getOpenCodeConfigPath()
  const existingConfig: OpenCodeConfig = fileExists(configPath)
    ? readJSON<OpenCodeConfig>(configPath)
    : {}

  const meta = parseProviderMeta(provider.model)
  const npmPackage = meta?.npm || DEFAULT_NPM_PACKAGE

  const providerKey = toProviderKey(provider.name)

  // 1) 生成默认配置（来自模板文件）
  const template = loadOpenCodeTemplateConfig()
  const defaultConfig = replaceVariables(template, {
    providerKey,
    providerName: provider.name,
    npmPackage,
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
  }) as OpenCodeConfig

  // 2) 合并用户现有配置（用户优先，保留未管理字段）
  const mergedConfig = deepMerge<OpenCodeConfig>(defaultConfig, existingConfig)

  // 3) 构建/更新当前 provider（强制更新认证与端点）
  const templateProvider = defaultConfig.provider?.[providerKey]
  const existingProvider = mergedConfig.provider?.[providerKey]

  const models =
    meta?.models || existingProvider?.models || templateProvider?.models || DEFAULT_MODELS

  const providerConfig: OpenCodeProvider = deepMerge<OpenCodeProvider>(templateProvider || {}, {
    ...(existingProvider || {}),
    npm: npmPackage,
    name: provider.name,
    options: {
      ...(existingProvider?.options || {}),
      baseURL: provider.baseUrl,
      apiKey: provider.apiKey,
    },
    models,
  })

  const existingProviders =
    mergedConfig.provider && typeof mergedConfig.provider === 'object'
      ? { ...mergedConfig.provider }
      : {}

  const nextConfig: OpenCodeConfig = {
    ...mergedConfig,
    $schema: OPENCODE_SCHEMA,
    provider: {
      ...existingProviders,
      [providerKey]: providerConfig,
    },
  }

  writeJSON(configPath, nextConfig)
}

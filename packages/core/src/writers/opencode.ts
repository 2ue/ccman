import type { Provider } from '../tool-manager.js'
import { getOpenCodeConfigPath, getOpenCodeDir } from '../paths.js'
import { ensureDir, fileExists, readJSON, writeJSON } from '../utils/file.js'

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
  const existingProvider = existingConfig.provider?.[providerKey]
  const models = meta?.models || existingProvider?.models || DEFAULT_MODELS

  const providerConfig: OpenCodeProvider = {
    ...existingProvider,
    npm: npmPackage,
    name: provider.name,
    options: {
      ...(existingProvider?.options || {}),
      baseURL: provider.baseUrl,
      apiKey: provider.apiKey,
    },
    models,
  }

  const existingProviders =
    existingConfig.provider && typeof existingConfig.provider === 'object'
      ? { ...existingConfig.provider }
      : {}

  const nextConfig: OpenCodeConfig = {
    ...existingConfig,
    $schema: OPENCODE_SCHEMA,
    provider: {
      ...existingProviders,
      [providerKey]: providerConfig,
    },
  }

  writeJSON(configPath, nextConfig)
}

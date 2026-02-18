import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { Provider } from '../tool-manager.js'
import { getOpenClawConfigPath, getOpenClawDir, getOpenClawModelsPath } from '../paths.js'
import { ensureDir, fileExists, readJSON, writeJSON } from '../utils/file.js'
import { deepMerge, replaceVariables } from '../utils/template.js'

interface OpenClawModelsFile {
  providers?: Record<string, unknown>
  [key: string]: unknown
}

interface OpenClawConfigFile {
  models?: Record<string, unknown>
  agents?: {
    defaults?: {
      workspace?: string
      model?: {
        primary?: string
        [key: string]: unknown
      }
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

const DEFAULT_PROVIDER_NAME = 'gmn'

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

const OPENCLAW_CONFIG_TEMPLATE: OpenClawConfigFile = {
  models: {
    mode: 'merge',
    providers: {
      '{{providerName}}': {
        baseUrl: '{{baseUrl}}',
        apiKey: '{{apiKey}}',
        api: 'openai-responses',
        headers: {
          'User-Agent': 'curl/8.0',
          'OpenAI-Beta': 'responses=v1',
        },
        authHeader: true,
        models: [
          {
            id: 'gpt-5.3-codex',
            name: 'gpt-5.3-codex',
            api: 'openai-responses',
            reasoning: false,
            input: ['text'],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: 'gpt-5.2-codex',
            name: 'gpt-5.2-codex',
            api: 'openai-responses',
            reasoning: false,
            input: ['text'],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      workspace: '',
      model: {
        primary: '{{providerName}}/gpt-5.3-codex',
      },
      thinkingDefault: 'xhigh',
    },
  },
}

const OPENCLAW_MODELS_TEMPLATE: OpenClawModelsFile = {
  providers: {
    '{{providerName}}': {
      baseUrl: '{{baseUrl}}',
      apiKey: '{{apiKey}}',
      api: 'openai-responses',
      authHeader: true,
      headers: {
        'User-Agent': 'curl/8.0',
        'OpenAI-Beta': 'responses=v1',
      },
      models: [
        {
          id: 'gpt-5.3-codex',
          name: 'gpt-5.3-codex',
          api: 'openai-responses',
          reasoning: false,
          input: ['text'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 200000,
          maxTokens: 8192,
        },
        {
          id: 'gpt-5.2-codex',
          name: 'gpt-5.2-codex',
          api: 'openai-responses',
          reasoning: false,
          input: ['text'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 200000,
          maxTokens: 8192,
        },
      ],
    },
  },
}

function loadTemplate<T extends object>(relativePath: string, fallback: T): T {
  try {
    const templatePath = resolveTemplatePath(relativePath)
    if (templatePath) {
      const content = fs.readFileSync(templatePath, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && typeof parsed === 'object') {
        return parsed as T
      }
    }
  } catch {
    // 忽略错误，使用内置默认模板
  }
  return fallback
}

function resolveProviderName(provider: Provider): string {
  const name = provider.name?.trim()
  if (name) return name
  return DEFAULT_PROVIDER_NAME
}

function loadExistingJSON<T extends object>(filePath: string): T | null {
  if (!fileExists(filePath)) return null
  try {
    return readJSON<T>(filePath)
  } catch {
    return null
  }
}

/**
 * 写入 OpenClaw 配置
 *
 * 策略：
 * 1. 模板优先 + 内置回退
 * 2. openclaw.json: models 增量覆盖 + agents 智能合并（强制切换 primary）
 * 3. models.json: providers 增量补充（仅更新当前 provider）
 * 3. 路径基于 HOME_DIR（通过 paths.ts 统一管理）
 */
export function writeOpenClawConfig(provider: Provider): void {
  const configPath = getOpenClawConfigPath()
  const modelsPath = getOpenClawModelsPath()
  const homeDir = path.dirname(getOpenClawDir())
  const providerName = resolveProviderName(provider)

  ensureDir(getOpenClawDir())
  ensureDir(path.dirname(modelsPath))

  const rawConfigTemplate = loadTemplate<OpenClawConfigFile>(
    'openclaw/openclaw.base.template.json',
    OPENCLAW_CONFIG_TEMPLATE
  )
  const rawModelsTemplate = loadTemplate<OpenClawModelsFile>(
    'openclaw/models.base.template.json',
    OPENCLAW_MODELS_TEMPLATE
  )

  const variables = {
    providerName,
    baseUrl: provider.baseUrl || '',
    apiKey: provider.apiKey || '',
  }

  const nextOpenClawConfig = replaceVariables(rawConfigTemplate, variables) as OpenClawConfigFile
  const nextModelsConfig = replaceVariables(rawModelsTemplate, variables) as OpenClawModelsFile
  const existingOpenClawConfig = loadExistingJSON<OpenClawConfigFile>(configPath) || {}
  const existingModelsConfig = loadExistingJSON<OpenClawModelsFile>(modelsPath) || {}

  const mergedConfigModels = deepMerge(
    existingOpenClawConfig.models || {},
    nextOpenClawConfig.models || {}
  )

  const mergedAgents = deepMerge(
    nextOpenClawConfig.agents || {},
    existingOpenClawConfig.agents || {}
  )
  const mergedDefaults = mergedAgents.defaults || {}
  const mergedModel = mergedDefaults.model || {}
  const templatePrimary =
    nextOpenClawConfig.agents?.defaults?.model?.primary || `${providerName}/gpt-5.3-codex`
  const workspace =
    typeof mergedDefaults.workspace === 'string' && mergedDefaults.workspace.trim()
      ? mergedDefaults.workspace
      : homeDir

  const finalOpenClawConfig: OpenClawConfigFile = {
    ...existingOpenClawConfig,
    models: mergedConfigModels,
    agents: {
      ...mergedAgents,
      defaults: {
        ...mergedDefaults,
        workspace,
        model: {
          ...mergedModel,
          primary: templatePrimary,
        },
      },
    },
  }

  const mergedProviders = deepMerge(
    existingModelsConfig.providers || {},
    nextModelsConfig.providers || {}
  )
  const finalModelsConfig: OpenClawModelsFile = {
    ...existingModelsConfig,
    providers: mergedProviders,
  }

  writeJSON(configPath, finalOpenClawConfig)
  writeJSON(modelsPath, finalModelsConfig)
}

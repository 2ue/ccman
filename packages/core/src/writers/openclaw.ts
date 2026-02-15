import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { Provider } from '../tool-manager.js'
import { getOpenClawConfigPath, getOpenClawDir, getOpenClawModelsPath } from '../paths.js'
import { ensureDir, writeJSON } from '../utils/file.js'
import { replaceVariables } from '../utils/template.js'

interface OpenClawModel {
  id: string
  name: string
  api: string
  reasoning: boolean
  input: string[]
  cost: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
  }
  contextWindow: number
  maxTokens: number
}

interface OpenClawModelsProvider {
  baseUrl?: string
  apiKey?: string
  api?: string
  authHeader?: boolean
  headers?: Record<string, string>
  models?: OpenClawModel[]
  [key: string]: unknown
}

interface OpenClawModelsFile {
  providers?: Record<string, OpenClawModelsProvider>
  [key: string]: unknown
}

interface OpenClawConfigFile {
  models?: {
    mode?: string
    providers?: Record<string, unknown>
    [key: string]: unknown
  }
  agents?: {
    defaults?: {
      workspace?: string
      model?: {
        primary?: string
        [key: string]: unknown
      }
      thinkingDefault?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface OpenClawModelMeta {
  providerKey?: string
  primaryModelId?: string
  secondaryModelId?: string
  includeSecondaryModel?: boolean
}

const DEFAULT_PROVIDER_KEY = 'sub2api'
const DEFAULT_PRIMARY_MODEL_ID = 'gpt-5.3-codex'
const DEFAULT_SECONDARY_MODEL_ID = 'gpt-5.2-codex'
const OPENAI_RESPONSES_API = 'openai-responses'

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
    providers: {},
  },
  agents: {
    defaults: {
      workspace: '',
      model: {
        primary: `${DEFAULT_PROVIDER_KEY}/${DEFAULT_PRIMARY_MODEL_ID}`,
      },
      thinkingDefault: 'xhigh',
    },
  },
}

const OPENCLAW_MODELS_TEMPLATE: OpenClawModelsFile = {
  providers: {
    [DEFAULT_PROVIDER_KEY]: {
      baseUrl: 'https://gmn.chuangzuoli.com/v1',
      apiKey: '',
      api: OPENAI_RESPONSES_API,
      authHeader: true,
      headers: {
        'User-Agent': 'curl/8.0',
        'OpenAI-Beta': 'responses=v1',
      },
      models: [
        {
          id: DEFAULT_PRIMARY_MODEL_ID,
          name: DEFAULT_PRIMARY_MODEL_ID,
          api: OPENAI_RESPONSES_API,
          reasoning: false,
          input: ['text'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 200000,
          maxTokens: 8192,
        },
        {
          id: DEFAULT_SECONDARY_MODEL_ID,
          name: DEFAULT_SECONDARY_MODEL_ID,
          api: OPENAI_RESPONSES_API,
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

function parseModelMeta(raw?: string): Required<OpenClawModelMeta> {
  const defaults: Required<OpenClawModelMeta> = {
    providerKey: DEFAULT_PROVIDER_KEY,
    primaryModelId: DEFAULT_PRIMARY_MODEL_ID,
    secondaryModelId: DEFAULT_SECONDARY_MODEL_ID,
    includeSecondaryModel: true,
  }

  if (!raw || !raw.trim()) {
    return defaults
  }

  // 兼容纯字符串：直接作为 primary model id
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return defaults
    }
    const obj = parsed as OpenClawModelMeta
    return {
      providerKey: (obj.providerKey || defaults.providerKey).trim(),
      primaryModelId: (obj.primaryModelId || defaults.primaryModelId).trim(),
      secondaryModelId: (obj.secondaryModelId || defaults.secondaryModelId).trim(),
      includeSecondaryModel:
        obj.includeSecondaryModel === undefined
          ? defaults.includeSecondaryModel
          : Boolean(obj.includeSecondaryModel),
    }
  } catch {
    return {
      ...defaults,
      primaryModelId: raw.trim(),
    }
  }
}

function createModel(id: string): OpenClawModel {
  return {
    id,
    name: id,
    api: OPENAI_RESPONSES_API,
    reasoning: false,
    input: ['text'],
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
    },
    contextWindow: 200000,
    maxTokens: 8192,
  }
}

/**
 * 写入 OpenClaw 配置
 *
 * 策略：
 * 1. 模板优先 + 内置回退
 * 2. 每次切换 provider 直接覆盖写入 openclaw.json / models.json
 * 3. 路径基于 HOME_DIR（通过 paths.ts 统一管理）
 */
export function writeOpenClawConfig(provider: Provider): void {
  const configPath = getOpenClawConfigPath()
  const modelsPath = getOpenClawModelsPath()
  const homeDir = path.dirname(getOpenClawDir())

  ensureDir(getOpenClawDir())
  ensureDir(path.dirname(modelsPath))

  const meta = parseModelMeta(provider.model)
  const providerKey = meta.providerKey || DEFAULT_PROVIDER_KEY
  const primaryModelId = meta.primaryModelId || DEFAULT_PRIMARY_MODEL_ID
  const secondaryModelId = meta.secondaryModelId || DEFAULT_SECONDARY_MODEL_ID
  const includeSecondaryModel =
    meta.includeSecondaryModel && secondaryModelId && secondaryModelId !== primaryModelId

  const rawConfigTemplate = loadTemplate<OpenClawConfigFile>(
    'openclaw/openclaw.base.template.json',
    OPENCLAW_CONFIG_TEMPLATE
  )
  const rawModelsTemplate = loadTemplate<OpenClawModelsFile>(
    'openclaw/models.base.template.json',
    OPENCLAW_MODELS_TEMPLATE
  )

  const variables = {
    homeDir,
    providerKey,
    baseUrl: provider.baseUrl || '',
    apiKey: provider.apiKey || '',
    primaryModelId,
    secondaryModelId,
  }

  const configTemplate = replaceVariables(rawConfigTemplate, variables) as OpenClawConfigFile
  const modelsTemplate = replaceVariables(rawModelsTemplate, variables) as OpenClawModelsFile

  // models.json：强制覆盖关键字段
  const nextModelsConfig: OpenClawModelsFile = {
    ...modelsTemplate,
    providers: {
      [providerKey]: {
        ...((modelsTemplate.providers || {})[providerKey] || {}),
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        api: OPENAI_RESPONSES_API,
        authHeader: true,
        headers: {
          'User-Agent': 'curl/8.0',
          'OpenAI-Beta': 'responses=v1',
        },
        models: includeSecondaryModel
          ? [createModel(primaryModelId), createModel(secondaryModelId)]
          : [createModel(primaryModelId)],
      },
    },
  }

  // openclaw.json：强制覆盖关键字段
  const defaults = configTemplate.agents?.defaults || {}
  const nextOpenClawConfig: OpenClawConfigFile = {
    ...configTemplate,
    models: {
      ...(configTemplate.models || {}),
      mode: configTemplate.models?.mode || 'merge',
      providers: configTemplate.models?.providers || {},
    },
    agents: {
      ...(configTemplate.agents || {}),
      defaults: {
        ...defaults,
        workspace: homeDir,
        model: {
          ...(defaults.model || {}),
          primary: `${providerKey}/${primaryModelId}`,
        },
        thinkingDefault: defaults.thinkingDefault || 'xhigh',
      },
    },
  }

  // 直接覆盖写入（不读取/不合并现有文件）
  writeJSON(configPath, nextOpenClawConfig)
  writeJSON(modelsPath, nextModelsConfig)
}

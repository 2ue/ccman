import * as fs from 'fs'
import { parse as parseToml, stringify as stringifyToml } from '@iarna/toml'
import type { Provider } from '../tool-manager.js'
import { getCodexConfigPath, getCodexAuthPath, getCodexDir } from '../paths.js'
import { ensureDir, fileExists } from '../utils/file.js'

/**
 * Codex config.toml 结构
 */
interface CodexConfig {
  model_provider?: string
  model?: string
  model_reasoning_effort?: string
  disable_response_storage?: boolean
  model_providers?: Record<string, CodexModelProvider>
  [key: string]: unknown // 保留其他用户自定义字段
}

interface CodexModelProvider {
  name: string
  base_url: string
  wire_api: string
  requires_openai_auth: boolean
}

/**
 * Codex auth.json 结构
 */
interface CodexAuth {
  OPENAI_API_KEY: string
  [key: string]: unknown // 保留其他字段
}

/**
 * 写入 Codex 配置（零破坏性）
 *
 * 管理的字段（强制覆盖）：
 * - model_provider
 * - model_providers[name].name
 * - model_providers[name].base_url
 * - OPENAI_API_KEY (auth.json)
 *
 * 固定字段（始终设置）：
 * - model_providers[name].wire_api = "responses"
 * - model_providers[name].requires_openai_auth = true
 *
 * 默认字段（如果用户未设置，则设置默认值；用户已设置则保留）：
 * - model = "gpt-5"
 * - model_reasoning_effort = "high"
 * - disable_response_storage = true
 */
export function writeCodexConfig(provider: Provider): void {
  // 确保目录存在
  ensureDir(getCodexDir())

  // 1. 处理 config.toml
  const configPath = getCodexConfigPath()
  let config: CodexConfig

  if (fileExists(configPath)) {
    // 读取现有配置
    const content = fs.readFileSync(configPath, 'utf-8')
    config = parseToml(content) as CodexConfig
  } else {
    // 创建新配置
    config = {}
  }

  // 1.1 ccman 管理的字段（强制覆盖）
  config.model_provider = provider.name
  config.model_providers = config.model_providers || {}
  config.model_providers[provider.name] = {
    name: provider.name,
    base_url: provider.baseUrl,
    wire_api: 'responses',              // 固定值
    requires_openai_auth: true,         // 固定值
  }

  // 1.2 默认字段（仅在不存在时设置）
  if (!config.model) {
    config.model = 'gpt-5'
  }
  if (!config.model_reasoning_effort) {
    config.model_reasoning_effort = 'high'
  }
  if (!('disable_response_storage' in config)) {
    config.disable_response_storage = true
  }

  // 写入配置文件
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fs.writeFileSync(configPath, stringifyToml(config as any), { mode: 0o600 })

  // 2. 处理 auth.json
  const authPath = getCodexAuthPath()
  let auth: CodexAuth

  if (fileExists(authPath)) {
    const content = fs.readFileSync(authPath, 'utf-8')
    auth = JSON.parse(content) as CodexAuth
  } else {
    auth = { OPENAI_API_KEY: '' }
  }

  // 只修改 OPENAI_API_KEY
  auth.OPENAI_API_KEY = provider.apiKey

  // 写入 auth.json
  fs.writeFileSync(authPath, JSON.stringify(auth, null, 2), { mode: 0o600 })
}

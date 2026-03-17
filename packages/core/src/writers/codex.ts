import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parse as parseToml, stringify as stringifyToml } from '@iarna/toml'
import type { Provider } from '../tool-manager.js'
import type { WriteOptions } from '../tool-manager.types.js'
import { getCodexConfigPath, getCodexAuthPath, getCodexDir } from '../paths.js'
import { ensureDir, fileExists, readJSON, writeJSON } from '../utils/file.js'
import { deepMerge } from '../utils/template.js'

/**
 * Codex config.toml 结构
 */
interface CodexConfig {
  model_provider?: string
  model?: string
  model_reasoning_effort?: string
  model_verbosity?: string
  web_search?: string
  network_access?: string
  disable_response_storage?: boolean
  sandbox_mode?: string
  windows_wsl_setup_acknowledged?: boolean
  approval_policy?: string
  profile?: string
  file_opener?: string
  history?: CodexHistory
  tui?: CodexTui
  shell_environment_policy?: CodexShellEnvironmentPolicy
  features?: CodexFeatures
  sandbox_workspace_write?: CodexSandboxWorkspaceWrite
  profiles?: Record<string, CodexProfile>
  notice?: CodexNotice
  model_providers?: Record<string, CodexModelProvider>
  [key: string]: unknown // 保留其他用户自定义字段
}

interface CodexHistory {
  persistence?: string
  [key: string]: unknown
}

interface CodexTui {
  notifications?: boolean
  [key: string]: unknown
}

interface CodexShellEnvironmentPolicy {
  inherit?: string
  ignore_default_excludes?: boolean
  [key: string]: unknown
}

interface CodexFeatures {
  apply_patch_freeform?: boolean
  unified_exec?: boolean
  suppress_unstable_features_warning?: boolean
  [key: string]: unknown
}

interface CodexSandboxWorkspaceWrite {
  network_access?: boolean
  [key: string]: unknown
}

interface CodexProfile {
  approval_policy?: string
  sandbox_mode?: string
  [key: string]: unknown
}

interface CodexNotice {
  hide_gpt5_1_migration_prompt?: boolean
  [key: string]: unknown
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

/**
 * Codex 默认配置模板（回退）
 *
 * 与 templates/codex/config.toml 保持一致
 * 版本迭代时优先修改模板，并同步更新此回退对象
 *
 * 注意：
 * - model_provider 和 model_providers 会在运行时动态设置（根据 Provider）
 * - 这里定义的是其他默认字段
 */
const CODEX_DEFAULT_CONFIG: Partial<CodexConfig> = {
  model: 'gpt-5.4',
  model_reasoning_effort: 'xhigh',
  disable_response_storage: true,
  sandbox_mode: 'danger-full-access',
  windows_wsl_setup_acknowledged: true,
  approval_policy: 'never',
  profile: 'auto-max',
  file_opener: 'vscode',
  web_search: 'cached',
  suppress_unstable_features_warning: true,
  history: {
    persistence: 'save-all',
  },
  tui: {
    notifications: true,
  },
  shell_environment_policy: {
    inherit: 'all',
    ignore_default_excludes: false,
  },
  sandbox_workspace_write: {
    network_access: true,
  },
  features: {
    plan_tool: true,
    apply_patch_freeform: true,
    view_image_tool: true,
    unified_exec: false,
    streamable_shell: false,
    rmcp_client: true,
    elevated_windows_sandbox: true,
  },
  profiles: {
    'auto-max': {
      approval_policy: 'never',
      sandbox_mode: 'workspace-write',
    },
    review: {
      approval_policy: 'on-request',
      sandbox_mode: 'workspace-write',
    },
  },
  notice: {
    hide_gpt5_1_migration_prompt: true,
  },
}

const GMN_PROVIDER_HOSTS = [
  'gmn.chuangzuoli.com',
  'cdn-gmn.chuangzuoli.com',
  'gmncodex.com',
  'gmncode.cn',
  'cdn.gmncode.cn',
  'gmncode.com',
  // Keep the historical typo for compatibility with previously written configs.
  'gmn.codex.com',
  'cdn.gmncode.com',
]

function resolveCodexProviderKey(provider: Provider): string {
  const baseUrl = (provider.baseUrl || '').toLowerCase()
  if (GMN_PROVIDER_HOSTS.some((host) => baseUrl.includes(host))) return 'gmn'
  return provider.name
}

/**
 * 加载 Codex 模板配置
 *
 * 优先从 templates/codex/config.toml 读取，
 * 如果不存在或读取失败，则回退到 CODEX_DEFAULT_CONFIG
 */
function loadCodexTemplateConfig(): Partial<CodexConfig> {
  try {
    const templatePath = resolveTemplatePath('codex/config.toml')
    if (templatePath) {
      const content = fs.readFileSync(templatePath, 'utf-8')
      return parseToml(content) as CodexConfig
    }
  } catch {
    // 忽略错误，使用内置默认配置
  }
  return CODEX_DEFAULT_CONFIG
}

function removeDeprecatedKeys(config: CodexConfig): void {
  if (
    config.features &&
    typeof config.features === 'object' &&
    !Array.isArray(config.features) &&
    'web_search_request' in config.features
  ) {
    delete (config.features as Record<string, unknown>).web_search_request
  }
  if ('web_search_request' in config) {
    delete (config as Record<string, unknown>).web_search_request
  }
}

function loadExistingCodexConfig(configPath: string): CodexConfig {
  if (!fileExists(configPath)) {
    return {}
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    return parseToml(content) as CodexConfig
  } catch {
    return {}
  }
}

function buildManagedProvider(provider: Provider, providerKey: string): CodexModelProvider {
  return {
    name: providerKey,
    base_url: provider.baseUrl,
    wire_api: 'responses',
    requires_openai_auth: true,
  }
}

function writeCodexConfigOverwrite(provider: Provider): void {
  ensureDir(getCodexDir())

  const configPath = getCodexConfigPath()
  const templateConfig = loadCodexTemplateConfig()
  const nextConfig: CodexConfig = { ...(templateConfig as CodexConfig) }

  removeDeprecatedKeys(nextConfig)

  const providerKey = resolveCodexProviderKey(provider)
  nextConfig.model_provider = providerKey
  nextConfig.model = provider.model || nextConfig.model || 'gpt-5.4'
  nextConfig.model_providers = {
    [providerKey]: buildManagedProvider(provider, providerKey),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fs.writeFileSync(configPath, stringifyToml(nextConfig as any), { mode: 0o600 })

  const authPath = getCodexAuthPath()
  const auth: CodexAuth = { OPENAI_API_KEY: provider.apiKey }
  writeJSON(authPath, auth)
}

function writeCodexConfigMerge(provider: Provider): void {
  ensureDir(getCodexDir())

  const configPath = getCodexConfigPath()
  const existingConfig = loadExistingCodexConfig(configPath)
  const templateConfig = loadCodexTemplateConfig()
  const nextConfig = deepMerge<CodexConfig>(templateConfig as CodexConfig, existingConfig)
  const providerKey = resolveCodexProviderKey(provider)

  removeDeprecatedKeys(nextConfig)

  nextConfig.model_provider = providerKey
  nextConfig.model = provider.model || nextConfig.model || 'gpt-5.4'

  const existingProviders =
    nextConfig.model_providers &&
    typeof nextConfig.model_providers === 'object' &&
    !Array.isArray(nextConfig.model_providers)
      ? { ...nextConfig.model_providers }
      : {}
  const lowerProviderKey = providerKey.toLowerCase()

  for (const key of Object.keys(existingProviders)) {
    if (key.toLowerCase() === lowerProviderKey) {
      delete existingProviders[key]
    }
  }

  nextConfig.model_providers = {
    ...existingProviders,
    [providerKey]: buildManagedProvider(provider, providerKey),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fs.writeFileSync(configPath, stringifyToml(nextConfig as any), { mode: 0o600 })

  const authPath = getCodexAuthPath()
  let existingAuth: CodexAuth = { OPENAI_API_KEY: '' }
  if (fileExists(authPath)) {
    try {
      existingAuth = readJSON<CodexAuth>(authPath)
    } catch {
      existingAuth = { OPENAI_API_KEY: '' }
    }
  }
  const nextAuth: CodexAuth = {
    ...existingAuth,
    OPENAI_API_KEY: provider.apiKey,
  }
  writeJSON(authPath, nextAuth)
}

/**
 * 写入 Codex 配置（覆盖写入）
 *
 * 策略：
 * 1. config.toml：用模板覆盖写入（仅写入必要字段）
 * 2. auth.json：覆盖写入（仅保留 OPENAI_API_KEY）
 *
 * 版本迭代：
 * - 只需修改 CODEX_DEFAULT_CONFIG 对象
 * - 新增/删除字段会自动处理（基于模板）
 *
 * 注意：
 * - TOML 解析器会丢失注释，这是已知限制
 * - 用户如果需要注释，建议放在单独的文档文件中
 */
export function writeCodexConfig(provider: Provider, options: WriteOptions = {}): void {
  if (options.mode === 'overwrite') {
    writeCodexConfigOverwrite(provider)
    return
  }

  writeCodexConfigMerge(provider)
}

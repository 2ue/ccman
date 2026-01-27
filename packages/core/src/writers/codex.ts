import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parse as parseToml, stringify as stringifyToml } from '@iarna/toml'
import type { Provider } from '../tool-manager.js'
import { getCodexConfigPath, getCodexAuthPath, getCodexDir } from '../paths.js'
import { ensureDir, fileExists } from '../utils/file.js'
import { deepMerge } from '../utils/template.js'

/**
 * Codex config.toml 结构
 */
interface CodexConfig {
  model_provider?: string
  model?: string
  model_reasoning_effort?: string
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
  plan_tool?: boolean
  apply_patch_freeform?: boolean
  view_image_tool?: boolean
  web_search_request?: boolean
  unified_exec?: boolean
  streamable_shell?: boolean
  rmcp_client?: boolean
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
  [key: string]: unknown // 保留其他字段
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
 * Codex 默认配置模板
 *
 * 与 templates/codex/config.toml 保持一致
 * 版本迭代时直接在此对象中添加/修改字段即可
 *
 * 注意：
 * - model_provider 和 model_providers 会在运行时动态设置（根据 Provider）
 * - 这里定义的是其他默认字段
 */
const CODEX_DEFAULT_CONFIG: Partial<CodexConfig> = {
  model: 'gpt-5.1-code-max',
  model_reasoning_effort: 'high',
  disable_response_storage: true,
  sandbox_mode: 'danger-full-access',
  windows_wsl_setup_acknowledged: true,
  approval_policy: 'never',
  profile: 'auto-max',
  file_opener: 'vscode',
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
  features: {
    plan_tool: true,
    apply_patch_freeform: true,
    view_image_tool: true,
    web_search_request: true,
    unified_exec: false,
    streamable_shell: false,
    rmcp_client: true,
  },
  sandbox_workspace_write: {
    network_access: true,
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

/**
 * 写入 Codex 配置（零破坏性）
 *
 * 策略：
 * 1. 深度合并默认配置和用户现有配置（用户配置优先）
 * 2. 设置 Provider 相关字段（model_provider, model_providers）
 * 3. 写入 config.toml（注释会丢失，但保留所有用户数据）
 * 4. 写入 auth.json（只更新 OPENAI_API_KEY）
 *
 * 版本迭代：
 * - 只需修改 CODEX_DEFAULT_CONFIG 对象
 * - 新增/删除字段会自动处理
 * - 用户的自定义配置始终保留
 *
 * 注意：
 * - TOML 解析器会丢失注释，这是已知限制
 * - 用户如果需要注释，建议放在单独的文档文件中
 */
export function writeCodexConfig(provider: Provider): void {
  // 确保目录存在
  ensureDir(getCodexDir())

  // 1. 处理 config.toml
  const configPath = getCodexConfigPath()
  let userConfig: CodexConfig = {}

  if (fileExists(configPath)) {
    // 读取现有配置
    const content = fs.readFileSync(configPath, 'utf-8')
    userConfig = parseToml(content) as CodexConfig
  }

  // 2. 深度合并（用户配置优先）
  const templateConfig = loadCodexTemplateConfig()
  const mergedConfig = deepMerge<CodexConfig>(templateConfig, userConfig)

  // 3. 设置 Provider 相关字段
  mergedConfig.model_provider = provider.name
  mergedConfig.model = provider.model || mergedConfig.model || 'gpt-5-codex'

  // 4. 设置 model_providers
  mergedConfig.model_providers = mergedConfig.model_providers || {}
  mergedConfig.model_providers[provider.name] = {
    name: provider.name,
    base_url: provider.baseUrl,
    wire_api: 'responses',
    requires_openai_auth: true,
  }

  // 5. 写入配置文件
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fs.writeFileSync(configPath, stringifyToml(mergedConfig as any), { mode: 0o600 })

  // 6. 处理 auth.json
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

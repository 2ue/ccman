import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parse as parseToml, stringify as stringifyToml } from '@iarna/toml'
import type { Provider } from '../tool-manager.js'
import { getCodexConfigPath, getCodexAuthPath, getCodexDir } from '../paths.js'
import { backupFile, ensureDir, fileExists, writeJSON } from '../utils/file.js'
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
  model: 'gpt-5.2-codex',
  model_reasoning_effort: 'high',
  model_verbosity: 'high',
  web_search: 'live',
  disable_response_storage: true,
  windows_wsl_setup_acknowledged: true,
  sandbox_mode: 'workspace-write',
  sandbox_workspace_write: {
    network_access: true,
  },
}

function resolveCodexProviderKey(provider: Provider): string {
  const baseUrl = (provider.baseUrl || '').toLowerCase()
  if (baseUrl.includes('gmn.chuangzuoli.com')) return 'gmn'
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

/**
 * 写入 Codex 配置（零破坏性）
 *
 * 策略：
 * 1. 深度合并默认配置和用户现有配置（用户配置优先）
 * 2. 设置 Provider 相关字段（model_provider, model_providers）
 * 3. 写入 config.toml（注释会丢失，但保留所有用户数据）
 * 4. 写入 auth.json（先备份，再覆盖写入，仅保留 OPENAI_API_KEY）
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

  // 2.5. 迁移/清理已废弃字段
  if (
    mergedConfig.features &&
    typeof mergedConfig.features === 'object' &&
    !Array.isArray(mergedConfig.features) &&
    'web_search_request' in mergedConfig.features
  ) {
    delete (mergedConfig.features as Record<string, unknown>).web_search_request
  }

  // 清理旧版本 ccman 写入过但已不再使用的 feature key（避免 Codex 新版本报错/告警）
  if (
    mergedConfig.features &&
    typeof mergedConfig.features === 'object' &&
    !Array.isArray(mergedConfig.features)
  ) {
    for (const key of ['plan_tool', 'view_image_tool', 'rmcp_client', 'streamable_shell']) {
      if (key in mergedConfig.features) {
        delete (mergedConfig.features as Record<string, unknown>)[key]
      }
    }
    if (Object.keys(mergedConfig.features as Record<string, unknown>).length === 0) {
      delete mergedConfig.features
    }
  }

  // 2.6. 缺省值：确保存在 web_search（新版本替代 web_search_request）
  if (!mergedConfig.web_search) {
    mergedConfig.web_search = 'live'
  }

  // 3. 设置 Provider 相关字段
  const providerKey = resolveCodexProviderKey(provider)
  mergedConfig.model_provider = providerKey
  mergedConfig.model = provider.model || mergedConfig.model || 'gpt-5.2-codex'

  // 4. 设置 model_providers
  mergedConfig.model_providers = mergedConfig.model_providers || {}
  if (providerKey !== provider.name) {
    delete mergedConfig.model_providers[provider.name]
  }
  mergedConfig.model_providers[providerKey] = {
    name: providerKey,
    base_url: provider.baseUrl,
    wire_api: 'responses',
    requires_openai_auth: true,
  }

  // 5. 写入配置文件
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fs.writeFileSync(configPath, stringifyToml(mergedConfig as any), { mode: 0o600 })

  // 6. 处理 auth.json
  const authPath = getCodexAuthPath()
  if (fileExists(authPath)) {
    try {
      backupFile(authPath)
    } catch {
      // 备份失败不影响写入（避免出现 config.toml 已更新但 auth.json 未更新的情况）
    }
  }

  const auth: CodexAuth = { OPENAI_API_KEY: provider.apiKey }
  writeJSON(authPath, auth)
}

import * as fs from 'fs'
import type { Provider } from '../tool-manager'
import { getClaudeConfigPath, getClaudeDir } from '../paths'
import { ensureDir, fileExists } from '../utils/file'

/**
 * Claude Code settings.json 结构
 */
interface ClaudeSettings {
  env?: ClaudeEnv
  permissions?: {
    allow?: string[]
    deny?: string[]
  }
  [key: string]: unknown // 保留其他用户自定义字段
}

interface ClaudeEnv {
  ANTHROPIC_AUTH_TOKEN?: string
  ANTHROPIC_BASE_URL?: string
  [key: string]: unknown // 保留其他环境变量
}

/**
 * 写入 Claude Code 配置（零破坏性）
 *
 * 管理的字段（强制覆盖）：
 * - ANTHROPIC_AUTH_TOKEN
 * - ANTHROPIC_BASE_URL
 *
 * 默认字段（如果用户未设置，则设置默认值；用户已设置则保留）：
 * - CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
 * - CLAUDE_CODE_MAX_OUTPUT_TOKENS
 * - permissions.allow
 * - permissions.deny
 */
export function writeClaudeCodeConfig(provider: Provider): void {
  // 确保目录存在
  ensureDir(getClaudeDir())

  const configPath = getClaudeConfigPath()
  let settings: ClaudeSettings

  if (fileExists(configPath)) {
    // 读取现有配置
    const content = fs.readFileSync(configPath, 'utf-8')
    settings = JSON.parse(content) as ClaudeSettings
  } else {
    // 创建新配置
    settings = {}
  }

  // 确保 env 对象存在
  if (!settings.env) {
    settings.env = {}
  }

  // 1. ccman 管理的字段（强制覆盖）
  settings.env.ANTHROPIC_AUTH_TOKEN = provider.apiKey
  settings.env.ANTHROPIC_BASE_URL = provider.baseUrl

  // 2. 默认字段（仅在不存在时设置）
  if (!('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC' in settings.env)) {
    settings.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = 1
  }
  if (!('CLAUDE_CODE_MAX_OUTPUT_TOKENS' in settings.env)) {
    settings.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = 32000
  }

  // 3. permissions 默认值（仅在不存在时设置）
  if (!settings.permissions) {
    settings.permissions = { allow: [], deny: [] }
  }
  if (!settings.permissions.allow) {
    settings.permissions.allow = []
  }
  if (!settings.permissions.deny) {
    settings.permissions.deny = []
  }

  // 写入配置文件
  fs.writeFileSync(configPath, JSON.stringify(settings, null, 2), { mode: 0o600 })
}

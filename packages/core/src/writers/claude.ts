import * as fs from 'fs'
import type { Provider } from '../tool-manager.js'
import { getClaudeConfigPath, getClaudeDir } from '../paths.js'
import { ensureDir, fileExists } from '../utils/file.js'
import { replaceVariables, deepMerge } from '../utils/template.js'

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
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC?: number
  CLAUDE_CODE_MAX_OUTPUT_TOKENS?: number
  [key: string]: unknown // 保留其他环境变量
}

/**
 * Claude Code 默认配置模板
 *
 * 变量说明：
 * - {{apiKey}}: Provider 的 API Key
 * - {{baseUrl}}: Provider 的 Base URL
 *
 * 版本迭代时直接在此对象中添加/修改字段即可
 */
const CLAUDE_CONFIG_TEMPLATE: ClaudeSettings = {
  env: {
    ANTHROPIC_AUTH_TOKEN: '{{apiKey}}',
    ANTHROPIC_BASE_URL: '{{baseUrl}}',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
    CLAUDE_CODE_MAX_OUTPUT_TOKENS: 32000,
  },
  permissions: {
    allow: [],
    deny: [],
  },
}


/**
 * 写入 Claude 配置（零破坏性）
 *
 * 策略：
 * 1. 使用模板生成默认配置（包含 Provider 的 apiKey 和 baseUrl）
 * 2. 深度合并用户现有配置（用户配置优先）
 * 3. 写入合并后的配置
 *
 * 版本迭代：
 * - 只需修改 CLAUDE_CONFIG_TEMPLATE 对象
 * - 新增/删除字段会自动处理
 * - 用户的自定义配置始终保留
 */
export function writeClaudeConfig(provider: Provider): void {
  // 确保目录存在
  ensureDir(getClaudeDir())

  const configPath = getClaudeConfigPath()

  // 1. 读取用户现有配置
  let userConfig: ClaudeSettings = {}
  if (fileExists(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8')
    userConfig = JSON.parse(content) as ClaudeSettings
  }

  // 2. 替换模板变量，生成默认配置
  const defaultConfig = replaceVariables(CLAUDE_CONFIG_TEMPLATE, {
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
  }) as ClaudeSettings

  // 3. 深度合并：默认配置为基础，用户配置覆盖
  const mergedConfig = deepMerge<ClaudeSettings>(defaultConfig, userConfig)

  // 4. 强制更新认证字段为最新值
  mergedConfig.env = mergedConfig.env || {}
  mergedConfig.env.ANTHROPIC_AUTH_TOKEN = provider.apiKey
  mergedConfig.env.ANTHROPIC_BASE_URL = provider.baseUrl

  // 5. 写入配置文件
  fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2), { mode: 0o600 })
}


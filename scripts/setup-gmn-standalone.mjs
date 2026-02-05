#!/usr/bin/env node
/**
 * GMN 快速配置脚本（独立版本，不依赖 ccman）
 *
 * 功能：直接修改 Claude Code、Codex、Gemini CLI、OpenCode 的配置文件
 *
 * 用法：
 *   node scripts/setup-gmn-standalone.mjs                    # 交互式输入（保护模式）
 *   node scripts/setup-gmn-standalone.mjs sk-ant-xxx         # 直接传入 API Key（保护模式）
 *   node scripts/setup-gmn-standalone.mjs --overwrite        # 全覆盖模式（交互式）
 *   node scripts/setup-gmn-standalone.mjs sk-ant-xxx --overwrite  # 全覆盖模式（直接传入）
 *
 * 模式说明：
 *   - 保护模式（默认）：深度合并现有配置，只更新认证字段，保留用户的其他配置
 *   - 全覆盖模式：使用默认配置覆盖所有字段（认证字段除外）
 *
 * 依赖：零依赖，只使用 Node.js 内置 API
 */

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const GMN_BASE_URLS = {
  claude: 'https://gmn.chuangzuoli.com/api',
  codex: 'https://gmn.chuangzuoli.com',
  gemini: 'https://gmn.chuangzuoli.com',
  opencode: 'https://gmn.chuangzuoli.com',
}
const HOME_DIR = os.homedir()

// 全局配置：写入模式
let OVERWRITE_MODE = false

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 })
  }
}

/**
 * 深度合并对象
 */
function deepMerge(target, source) {
  const result = { ...target }

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }

  return result
}

/**
 * 原子性写入文件
 */
function atomicWrite(filePath, content, mode = 0o600) {
  const tempPath = `${filePath}.tmp`
  fs.writeFileSync(tempPath, content, { mode })
  fs.renameSync(tempPath, filePath)
}

// ============================================================================
// Claude Code 配置
// ============================================================================

function configureClaudeCode(apiKey) {
  const configDir = path.join(HOME_DIR, '.claude')
  const configPath = path.join(configDir, 'settings.json')

  ensureDir(configDir)

  // 默认配置
  const defaultConfig = {
    env: {
      ANTHROPIC_AUTH_TOKEN: apiKey,
      ANTHROPIC_BASE_URL: GMN_BASE_URLS.claude,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
      CLAUDE_CODE_MAX_OUTPUT_TOKENS: 32000,
    },
    permissions: {
      allow: [],
      deny: [],
    },
  }

  let finalConfig

  if (OVERWRITE_MODE) {
    // 全覆盖模式：使用默认配置
    finalConfig = defaultConfig
  } else {
    // 保护模式：读取现有配置并深度合并
    let userConfig = {}
    if (fs.existsSync(configPath)) {
      try {
        userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      } catch (error) {
        console.warn(`  ⚠️  无法解析现有配置，将创建新配置`)
      }
    }

    // 深度合并：默认配置为基础，用户配置覆盖
    finalConfig = deepMerge(defaultConfig, userConfig)
  }

  // 无论哪种模式，都强制更新认证字段
  finalConfig.env = finalConfig.env || {}
  finalConfig.env.ANTHROPIC_AUTH_TOKEN = apiKey
  finalConfig.env.ANTHROPIC_BASE_URL = GMN_BASE_URLS.claude

  // 写入配置
  atomicWrite(configPath, JSON.stringify(finalConfig, null, 2))
}

// ============================================================================
// Codex 配置
// ============================================================================

function configureCodex(apiKey) {
  const configDir = path.join(HOME_DIR, '.codex')
  const configPath = path.join(configDir, 'config.toml')
  const authPath = path.join(configDir, 'auth.json')
  const providerKey = 'gmn'

  ensureDir(configDir)

  // 1. 处理 config.toml
  let tomlContent = ''

  if (!OVERWRITE_MODE && fs.existsSync(configPath)) {
    // 保护模式：读取现有配置
    tomlContent = fs.readFileSync(configPath, 'utf-8')
  }
  const minimalConfig = [
    `model_provider = "${providerKey}"`,
    'model = "gpt-5.2-codex"',
    'model_reasoning_effort = "high"',
    'model_verbosity = "high"',
    'disable_response_storage = true',
    'windows_wsl_setup_acknowledged = true',
    'web_search = "live"',
    'sandbox_mode = "workspace-write"',
    '',
    '[sandbox_workspace_write]',
    'network_access = true',
    '',
    `[model_providers.${providerKey}]`,
    `name = "${providerKey}"`,
    `base_url = "${GMN_BASE_URLS.codex}"`,
    'wire_api = "responses"',
    'requires_openai_auth = true',
    '',
  ].join('\n')

  // 全覆盖模式 / 空文件：直接写最小模板
  if (OVERWRITE_MODE || !tomlContent.trim()) {
    atomicWrite(configPath, minimalConfig)
  } else {
    const hasWebSearch = /^\s*web_search\s*=/.test(tomlContent)

    // 简单的 TOML 更新策略：
    // - 如果存在 model_provider，替换它
    // - 如果不存在，添加到文件开头
    // - 添加/更新 [model_providers.gmn] 部分（同时兼容清理旧的 [model_providers.GMN]）

    const lines = tomlContent.split('\n')
    let hasModelProvider = false
    const newLines = []

    // 第一遍：更新 model_provider + 清理废弃字段（不截断文件）
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('web_search_request')) {
        // 移除已废弃字段：新版本使用 web_search
        continue
      }
      if (trimmed.startsWith('model_provider')) {
        newLines.push(`model_provider = "${providerKey}"`)
        hasModelProvider = true
      } else {
        newLines.push(line)
      }
    }

    // 如果没有 model_provider，添加到开头
    if (!hasModelProvider) {
      newLines.unshift(`model_provider = "${providerKey}"`)
    }
    // 如果没有 web_search，添加默认值（避免新版本提示）
    if (!hasWebSearch) {
      const modelProviderIndex = newLines.findIndex((l) => l.trim().startsWith('model_provider'))
      const insertIndex = modelProviderIndex === -1 ? 0 : modelProviderIndex + 1
      newLines.splice(insertIndex, 0, 'web_search = "live"')
    }

    // 第二遍：移除旧的 [model_providers.gmn]/[model_providers.GMN] 块（如果存在）
    const finalLines = []
    let inGMNBlock = false

    for (const line of newLines) {
      const trimmed = line.trim()
      if (trimmed === '[model_providers.GMN]' || trimmed === '[model_providers.gmn]') {
        inGMNBlock = true
        continue
      }
      if (inGMNBlock && trimmed.startsWith('[')) {
        inGMNBlock = false
      }
      if (!inGMNBlock) {
        finalLines.push(line)
      }
    }

    // 添加新的 [model_providers.gmn] 块到文件末尾
    finalLines.push('')
    finalLines.push(`[model_providers.${providerKey}]`)
    finalLines.push(`name = "${providerKey}"`)
    finalLines.push(`base_url = "${GMN_BASE_URLS.codex}"`)
    finalLines.push('wire_api = "responses"')
    finalLines.push('requires_openai_auth = true')

    atomicWrite(configPath, finalLines.join('\n'))
  }

  // 2. 处理 auth.json
  let auth = {}

  if (!OVERWRITE_MODE && fs.existsSync(authPath)) {
    // 保护模式：读取现有配置
    try {
      auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'))
    } catch (error) {
      console.warn(`  ⚠️  无法解析 auth.json，将创建新文件`)
    }
  }

  // 无论哪种模式，都更新 OPENAI_API_KEY
  auth.OPENAI_API_KEY = apiKey
  atomicWrite(authPath, JSON.stringify(auth, null, 2))
}

// ============================================================================
// Gemini CLI 配置
// ============================================================================

function configureGeminiCLI(apiKey) {
  const configDir = path.join(HOME_DIR, '.gemini')
  const settingsPath = path.join(configDir, 'settings.json')
  const envPath = path.join(configDir, '.env')

  ensureDir(configDir)

  // 1. 处理 settings.json
  let settings = {}

  if (!OVERWRITE_MODE && fs.existsSync(settingsPath)) {
    // 保护模式：读取现有配置
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    } catch (error) {
      console.warn(`  ⚠️  无法解析 settings.json，将创建新配置`)
    }
  }

  // 确保启用 IDE 集成
  settings.ide = settings.ide || {}
  if (settings.ide.enabled === undefined) {
    settings.ide.enabled = true
  }

  // 配置认证方式
  settings.security = settings.security || {}
  settings.security.auth = settings.security.auth || {}
  if (settings.security.auth.selectedType === undefined) {
    settings.security.auth.selectedType = 'gemini-api-key'
  }

  atomicWrite(settingsPath, JSON.stringify(settings, null, 2))

  // 2. 处理 .env
  const env = {
    GEMINI_API_KEY: apiKey,
    GEMINI_MODEL: 'gemini-2.5-pro',
    GOOGLE_GEMINI_BASE_URL: GMN_BASE_URLS.gemini,
  }

  if (!OVERWRITE_MODE && fs.existsSync(envPath)) {
    // 保护模式：读取现有 .env（保留其他变量）
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      const value = trimmed.slice(eqIndex + 1).trim()
      if (key && !env[key]) {
        env[key] = value
      }
    }
  }

  // 写入 .env（按 KEY 排序）
  const lines = Object.keys(env)
    .sort()
    .map((key) => `${key}=${env[key]}`)
  atomicWrite(envPath, lines.join('\n') + '\n')
}

// ============================================================================
// OpenCode 配置
// ============================================================================

function configureOpenCode(apiKey) {
  const configDir = path.join(HOME_DIR, '.config', 'opencode')
  const configPath = path.join(configDir, 'opencode.json')

  ensureDir(configDir)

  // 构建 GMN provider 配置
  const gmnProvider = {
    npm: '@ai-sdk/openai',
    name: 'GMN',
    options: {
      baseURL: GMN_BASE_URLS.opencode,
      apiKey: apiKey,
    },
    models: {
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
    },
  }

  let config

  if (OVERWRITE_MODE) {
    // 全覆盖模式：只保留 GMN provider
    config = {
      $schema: 'https://opencode.ai/config.json',
      provider: {
        gmn: gmnProvider,
      },
    }
  } else {
    // 保护模式：读取现有配置并合并
    config = {}
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      } catch (error) {
        console.warn(`  ⚠️  无法解析现有配置，将创建新配置`)
      }
    }

    // 合并配置
    config.$schema = 'https://opencode.ai/config.json'
    config.provider = config.provider || {}
    config.provider.gmn = gmnProvider
  }

  atomicWrite(configPath, JSON.stringify(config, null, 2))
}

// ============================================================================
// 主函数
// ============================================================================

async function main() {
  console.log('🚀 GMN 快速配置工具（独立版本）\n')

  // 1. 解析命令行参数
  const args = process.argv.slice(2)
  let apiKey = null

  for (const arg of args) {
    if (arg === '--overwrite') {
      OVERWRITE_MODE = true
    } else if (!arg.startsWith('--')) {
      apiKey = arg
    }
  }

  // 2. 获取 API Key
  if (!apiKey) {
    const rl = createInterface({ input: stdin, output: stdout })
    apiKey = await rl.question('请输入 GMN API Key: ')
    rl.close()
  }

  if (!apiKey?.trim()) {
    throw new Error('API Key 不能为空')
  }

  // 3. 显示模式信息
  if (OVERWRITE_MODE) {
    console.log('⚠️  全覆盖模式：将使用默认配置覆盖所有字段（认证字段除外）')
    const rl = createInterface({ input: stdin, output: stdout })
    const confirm = await rl.question('确认继续？(y/N): ')
    rl.close()
    if (confirm.toLowerCase() !== 'y') {
      console.log('已取消')
      return
    }
  } else {
    console.log('✅ 保护模式：将保留现有配置，只更新认证字段')
  }

  console.log('\n开始配置...\n')

  // 4. 配置所有工具
  const tools = [
    { name: 'Claude Code', configure: configureClaudeCode },
    { name: 'Codex', configure: configureCodex },
    { name: 'Gemini CLI', configure: configureGeminiCLI },
    { name: 'OpenCode', configure: configureOpenCode },
  ]

  for (const { name, configure } of tools) {
    try {
      configure(apiKey)
      console.log(`✅ ${name}`)
    } catch (error) {
      console.error(`❌ ${name}: ${error.message}`)
    }
  }

  console.log('\n🎉 GMN 配置完成！')
  console.log('\n配置文件位置：')
  console.log(`  - Claude Code: ${path.join(HOME_DIR, '.claude/settings.json')}`)
  console.log(`  - Codex:       ${path.join(HOME_DIR, '.codex/config.toml')}`)
  console.log(`  - Codex:       ${path.join(HOME_DIR, '.codex/auth.json')}`)
  console.log(`  - Gemini CLI:  ${path.join(HOME_DIR, '.gemini/settings.json')}`)
  console.log(`  - Gemini CLI:  ${path.join(HOME_DIR, '.gemini/.env')}`)
  console.log(`  - OpenCode:    ${path.join(HOME_DIR, '.config/opencode/opencode.json')}`)
  console.log('\n提示：请重启对应的工具以使配置生效。')
}

main().catch((err) => {
  console.error(`\n❌ 错误: ${err.message}`)
  process.exit(1)
})

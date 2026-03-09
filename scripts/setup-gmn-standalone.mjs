#!/usr/bin/env node
/**
 * GMN 快速配置脚本（独立版本，不依赖 ccman）
 *
 * 功能：直接修改 Claude Code、Codex、Gemini CLI、OpenCode 的配置文件
 *
 * 用法：
 *   node scripts/setup-gmn-standalone.mjs                    # 交互式输入（快捷覆盖模式）
 *   node scripts/setup-gmn-standalone.mjs sk-ant-xxx         # 直接传入 API Key（快捷覆盖模式）
 *   node scripts/setup-gmn-standalone.mjs --overwrite        # 兼容旧参数（行为不变）
 *   node scripts/setup-gmn-standalone.mjs sk-ant-xxx --overwrite  # 兼容旧参数（行为不变）
 *
 * 策略说明：
 *   - 快捷配置入口统一采用覆盖写入：直接落下托管配置
 *   - 写入前会备份已有目标文件
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

// 快捷配置入口统一使用覆盖写入
let OVERWRITE_MODE = true

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

  // 1. 处理 config.toml（先备份，再覆盖写入）
  const minimalConfig = [
    `model_provider = "${providerKey}"`,
    'model = "gpt-5.2-codex"',
    'model_reasoning_effort = "high"',
    'network_access = "enabled"',
    'disable_response_storage = true',
    'windows_wsl_setup_acknowledged = true',
    'model_verbosity = "high"',
    '',
    `[model_providers.${providerKey}]`,
    `name = "${providerKey}"`,
    `base_url = "${GMN_BASE_URLS.codex}"`,
    'wire_api = "responses"',
    'requires_openai_auth = true',
    '',
  ].join('\n')

  if (fs.existsSync(configPath)) {
    const backupPath = `${configPath}.bak`
    fs.copyFileSync(configPath, backupPath)
    fs.chmodSync(backupPath, 0o600)
  }

  atomicWrite(configPath, minimalConfig)

  // 2. 处理 auth.json（先备份，再覆盖写入，仅保留 OPENAI_API_KEY）
  if (fs.existsSync(authPath)) {
    const backupPath = `${authPath}.bak`
    fs.copyFileSync(authPath, backupPath)
    fs.chmodSync(backupPath, 0o600)
  }

  const auth = { OPENAI_API_KEY: apiKey }
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

  // 3. 显示快捷写入信息
  console.log('⚠️  快捷覆盖模式：将直接覆盖托管配置，并在写入前备份已有目标文件')

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

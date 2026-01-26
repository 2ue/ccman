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
 * 依赖：Node.js 内置 API + inquirer（交互式选择）
 */

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import inquirer from 'inquirer'

const GMN_BASE_URLS = {
  claude: 'https://gmn.chuangzuoli.cn/api',
  openai: 'https://gmn.chuangzuoli.cn/openai',
  gemini: 'https://gmn.chuangzuoli.cn/gemini',
}
const GMN_OPENAI_COM_BASE_URL = 'https://gmn.chuangzuoli.com'
let OPENAI_BASE_URL = GMN_BASE_URLS.openai
const VALID_PLATFORMS = ['claude', 'codex', 'gemini', 'opencode']
const DEFAULT_PLATFORMS = ['codex', 'opencode']
const TOTAL_STEPS = 5

// 开发环境支持
const HOME_DIR = process.env.NODE_ENV === 'development'
  ? path.join(os.tmpdir(), 'ccman-dev')
  : os.homedir()

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
// 交互式输入
// ============================================================================

function renderStep(current, total, title) {
  const barLength = total
  const filledLength = Math.min(current, total)
  const bar = `${'■'.repeat(filledLength)}${'□'.repeat(barLength - filledLength)}`
  return `步骤 ${current}/${total} [${bar}] ${title}`
}

function printBanner() {
  console.log(
    [
      '  ██████╗  ███╗   ███╗███╗   ██╗',
      ' ██╔════╝  ████╗ ████║████╗  ██║',
      ' ██║  ███╗ ██╔████╔██║██╔██╗ ██║',
      ' ██║   ██║ ██║╚██╔╝██║██║╚██╗██║',
      ' ╚██████╔╝ ██║ ╚═╝ ██║██║ ╚████║',
      '  ╚═════╝  ╚═╝     ╚═╝╚═╝  ╚═══╝',
      '  GMN 一键配置向导 · 独立脚本',
      '  自动写入选中工具配置，支持多选与端点选择。\n',
    ].join('\n')
  )
}

function printKeyNotice() {
  console.log(
    [
      '提示：Codex 与 OpenCode 共享 OpenAI 套餐/端点；Gemini 与 Claude 需单独订阅。',
      '例如：Gemini 套餐不能用于 Codex/OpenCode，Claude 套餐也不能通用。',
      'VS Code 的 Codex 插件若使用本机默认配置，也会跟随本次写入生效。',
    ].join('\n')
  )
}

function parsePlatforms(platformArg) {
  if (platformArg === 'all') {
    return [...VALID_PLATFORMS]
  }

  const platforms = platformArg.split(',').map((p) => p.trim().toLowerCase())

  for (const platform of platforms) {
    if (!VALID_PLATFORMS.includes(platform)) {
      throw new Error(`无效的平台 "${platform}"。有效值: ${VALID_PLATFORMS.join(', ')}, all`)
    }
  }

  return platforms
}

async function promptMode() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: '选择写入模式:',
      choices: [
        { name: '保护模式（默认，保留现有配置）', value: 'protect' },
        { name: '全覆盖模式（覆盖配置，谨慎使用）', value: 'overwrite' },
      ],
      default: 'protect',
    },
  ])

  return answers.mode
}

async function promptPlatforms() {
  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'platforms',
      message: '选择要配置的工具（可多选，空格选择 / a全选 / i反选 / 回车确认）:',
      dontShowHints: true,
      choices: [
        { name: 'Claude Code（需单独订阅 Claude 套餐）', value: 'claude' },
        { name: 'Codex（需单独订阅 OpenAI 套餐）', value: 'codex' },
        { name: 'Gemini CLI（需单独订阅 Gemini 套餐）', value: 'gemini' },
        { name: 'OpenCode（与 Codex 共享 OpenAI 套餐）', value: 'opencode' },
        { name: '全部（将依次配置所有工具）', value: 'all' },
      ],
      default: DEFAULT_PLATFORMS,
      validate: (value) => {
        if (!value || value.length === 0) return '至少选择一个平台'
        return true
      },
    },
  ])

  const selected = answers.platforms
  if (selected.includes('all')) {
    return [...VALID_PLATFORMS]
  }
  return selected
}

async function promptOpenAIDomain() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'domain',
      message: '选择 Codex/OpenCode 的 OpenAI Base URL（只影响这两个工具）:',
      choices: [
        { name: `CN（国内）  ${GMN_BASE_URLS.openai}`, value: 'cn' },
        { name: `COM（国际） ${GMN_OPENAI_COM_BASE_URL}`, value: 'com' },
      ],
      default: 'cn',
    },
  ])

  return answers.domain
}

async function promptApiKey() {
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: '请输入 GMN API Key:',
      mask: '*',
      validate: (value) => {
        if (!value) return 'API Key 不能为空'
        return true
      },
    },
  ])

  return answers.apiKey
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

  ensureDir(configDir)

  // 1. 处理 config.toml
  let tomlContent = ''

  if (!OVERWRITE_MODE && fs.existsSync(configPath)) {
    // 保护模式：读取现有配置
    tomlContent = fs.readFileSync(configPath, 'utf-8')
  }

  // 简单的 TOML 更新策略：
  // - 如果存在 model_provider，替换它
  // - 如果不存在，添加到文件开头
  // - 添加/更新 [model_providers.GMN] 部分

  const lines = tomlContent.split('\n')
  let hasModelProvider = false
  const newLines = []

  // 第一遍：更新 model_provider
  for (const line of lines) {
    if (line.trim().startsWith('model_provider')) {
      newLines.push('model_provider = "GMN"')
      hasModelProvider = true
    } else if (line.trim().startsWith('[model_providers.GMN]')) {
      // 跳过，后面会重新添加
      break
    } else {
      newLines.push(line)
    }
  }

  // 如果没有 model_provider，添加到开头
  if (!hasModelProvider) {
    newLines.unshift('model_provider = "GMN"')
  }

  // 第二遍：移除旧的 [model_providers.GMN] 块（如果存在）
  const finalLines = []
  let inGMNBlock = false

  for (const line of newLines) {
    if (line.trim().startsWith('[model_providers.GMN]')) {
      inGMNBlock = true
      continue
    }
    if (inGMNBlock && line.trim().startsWith('[')) {
      inGMNBlock = false
    }
    if (!inGMNBlock) {
      finalLines.push(line)
    }
  }

  // 添加新的 [model_providers.GMN] 块到文件末尾
  finalLines.push('')
  finalLines.push('[model_providers.GMN]')
  finalLines.push('name = "GMN"')
  finalLines.push(`base_url = "${OPENAI_BASE_URL}"`)
  finalLines.push('wire_api = "responses"')
  finalLines.push('requires_openai_auth = true')

  atomicWrite(configPath, finalLines.join('\n'))

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
      baseURL: OPENAI_BASE_URL,
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
  printBanner()

  // 1. 解析命令行参数
  const args = process.argv.slice(2)
  let apiKey = null
  let platformArg = null
  let openaiBaseUrl = null
  let overwriteArgProvided = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--overwrite') {
      OVERWRITE_MODE = true
      overwriteArgProvided = true
    } else if (arg === '-p' || arg === '--platform') {
      platformArg = args[i + 1]
      i++ // 跳过下一个参数
    } else if (arg.startsWith('-p=')) {
      platformArg = arg.substring(3)
    } else if (arg.startsWith('--platform=')) {
      platformArg = arg.substring(11)
    } else if (arg === '--openai-base-url' || arg === '--base-url') {
      openaiBaseUrl = args[i + 1]
      i++ // 跳过下一个参数
    } else if (arg.startsWith('--openai-base-url=')) {
      openaiBaseUrl = arg.substring('--openai-base-url='.length)
    } else if (arg.startsWith('--base-url=')) {
      openaiBaseUrl = arg.substring('--base-url='.length)
    } else if (arg === '--gmn-com') {
      openaiBaseUrl = GMN_OPENAI_COM_BASE_URL
    } else if (!arg.startsWith('-')) {
      apiKey = arg
    }
  }

  // 2. 交互式补全参数（与 ccman gmn 一致）
  console.log(`\n${renderStep(1, TOTAL_STEPS, '选择写入模式')}`)
  if (!overwriteArgProvided) {
    const mode = await promptMode()
    OVERWRITE_MODE = mode === 'overwrite'
  } else {
    console.log(`已通过参数指定模式：${OVERWRITE_MODE ? '全覆盖模式' : '保护模式'}`)
  }

  if (OVERWRITE_MODE) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '全覆盖模式会覆盖配置，确认继续？',
        default: false,
      },
    ])
    if (!confirm) {
      console.log('已取消')
      return
    }
  }

  console.log(`\n${renderStep(2, TOTAL_STEPS, '选择要配置的工具')}`)
  let platforms
  try {
    if (platformArg && platformArg.trim().length > 0) {
      platforms = parsePlatforms(platformArg)
    } else {
      platforms = await promptPlatforms()
    }
  } catch (error) {
    console.error(`❌ ${(error as Error).message}`)
    process.exit(1)
  }

  console.log(`已选择: ${platforms.join(', ')}`)
  printKeyNotice()

  const needsOpenAIBaseUrl = platforms.includes('codex') || platforms.includes('opencode')

  console.log(`\n${renderStep(3, TOTAL_STEPS, '选择 OpenAI 端点 (仅 Codex/OpenCode)')}`)
  if (!needsOpenAIBaseUrl) {
    console.log('未选择 Codex/OpenCode，将跳过此步骤。')
  } else if (!openaiBaseUrl) {
    const domain = await promptOpenAIDomain()
    openaiBaseUrl = domain === 'com' ? GMN_OPENAI_COM_BASE_URL : GMN_BASE_URLS.openai
  } else {
    console.log(`已通过参数指定 OpenAI Base URL：${openaiBaseUrl}`)
  }

  console.log(`\n${renderStep(4, TOTAL_STEPS, '输入 API Key')}`)
  if (!apiKey) {
    apiKey = await promptApiKey()
  } else {
    console.log('已通过参数提供 API Key（已隐藏）')
  }

  // 4. 处理 OpenAI Base URL（Codex/OpenCode）
  if (platforms.includes('codex') || platforms.includes('opencode')) {
    if (!openaiBaseUrl || !openaiBaseUrl.trim()) {
      throw new Error('OpenAI Base URL 不能为空')
    }
    OPENAI_BASE_URL = openaiBaseUrl.trim()
  }

  if (!apiKey?.trim()) {
    throw new Error('API Key 不能为空')
  }

  console.log(`\n${renderStep(5, TOTAL_STEPS, '开始写入配置')}`)
  console.log(`模式: ${OVERWRITE_MODE ? '全覆盖模式' : '保护模式'}`)
  console.log(`平台: ${platforms.join(', ')}`)
  if (platforms.includes('codex') || platforms.includes('opencode')) {
    console.log(`OpenAI 端点: ${openaiBaseUrl}`)
  }
  console.log('\n开始配置...\n')

  // 6. 配置选中的工具
  const ALL_TOOLS = {
    claude: { name: 'Claude Code', configure: configureClaudeCode },
    codex: { name: 'Codex', configure: configureCodex },
    gemini: { name: 'Gemini CLI', configure: configureGeminiCLI },
    opencode: { name: 'OpenCode', configure: configureOpenCode },
  }

  const tools = platforms.map(p => ALL_TOOLS[p])

  let completed = 0
  for (const { name, configure } of tools) {
    try {
      console.log(`→ 配置 ${name}...`)
      configure(apiKey)
      completed += 1
      console.log(`✅ ${name}`)
    } catch (error) {
      console.error(`❌ ${name}: ${error.message}`)
    }
  }

  console.log(`\n🎉 GMN 配置完成！(${completed}/${tools.length})`)

  // 只显示配置的工具的文件位置
  console.log('\n配置文件位置：')
  if (platforms.includes('claude')) {
    console.log(`  - Claude Code: ${path.join(HOME_DIR, '.claude/settings.json')}`)
  }
  if (platforms.includes('codex')) {
    console.log(`  - Codex:       ${path.join(HOME_DIR, '.codex/config.toml')}`)
    console.log(`  - Codex:       ${path.join(HOME_DIR, '.codex/auth.json')}`)
  }
  if (platforms.includes('gemini')) {
    console.log(`  - Gemini CLI:  ${path.join(HOME_DIR, '.gemini/settings.json')}`)
    console.log(`  - Gemini CLI:  ${path.join(HOME_DIR, '.gemini/.env')}`)
  }
  if (platforms.includes('opencode')) {
    console.log(`  - OpenCode:    ${path.join(HOME_DIR, '.config/opencode/opencode.json')}`)
  }

  console.log('\n提示：请重启对应的工具以使配置生效。')
}

main().catch((err) => {
  console.error(`\n❌ 错误: ${err.message}`)
  process.exit(1)
})

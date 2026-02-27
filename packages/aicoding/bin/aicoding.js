#!/usr/bin/env node
/**
 * GMN 快速配置脚本（独立版本，不依赖 ccman）
 *
 * 功能：直接修改 Codex、OpenCode、OpenClaw 的配置文件
 *
 * 用法：
 *   node scripts/setup-gmn-standalone.mjs                    # 交互式输入（保护模式）
 *   node scripts/setup-gmn-standalone.mjs sk-ant-xxx         # 直接传入 API Key（保护模式）
 *   node scripts/setup-gmn-standalone.mjs --overwrite        # 全覆盖模式（交互式）
 *   node scripts/setup-gmn-standalone.mjs sk-ant-xxx --overwrite  # 全覆盖模式（直接传入）
 *
 * 模式说明：
 *   - 保护模式（默认）：尽量保留现有配置；认证字段强制更新（Codex 的 config.toml/auth.json 会先备份再覆盖写入）
 *   - 全覆盖模式：使用默认配置覆盖所有字段（认证字段除外）
 *
 * 依赖：Node.js 内置 API + inquirer（交互式选择）
 */

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import inquirer from 'inquirer'

const GMN_BASE_URLS = {
  openai: 'https://gmn.chuangzuoli.com',
  openclaw: 'https://gmn.chuangzuoli.com/v1',
}
let OPENAI_BASE_URL = GMN_BASE_URLS.openai
const VALID_PLATFORMS = ['codex', 'opencode', 'openclaw']
const DEFAULT_PLATFORMS = ['codex', 'opencode']
const TOTAL_STEPS = 4

// 统一路径策略（与 @ccman/core 保持一致）
const NODE_ENV = process.env.NODE_ENV
const HOME_DIR = NODE_ENV === 'test'
  ? path.join('/tmp', 'ccman-test')
  : NODE_ENV === 'development'
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
 * 原子性写入文件
 */
function atomicWrite(filePath, content, mode = 0o600) {
  const tempPath = `${filePath}.tmp`
  fs.writeFileSync(tempPath, content, { mode })
  fs.renameSync(tempPath, filePath)
}

function backupFileOrThrow(filePath, operation) {
  if (!fs.existsSync(filePath)) {
    return null
  }

  const backupPath = `${filePath}.bak`
  try {
    fs.copyFileSync(filePath, backupPath)
    fs.chmodSync(backupPath, 0o600)
    return backupPath
  } catch (error) {
    throw new Error(`备份失败，已中止后续写入（${operation}）: ${error.message}`)
  }
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
      '  自动写入选中工具配置，支持多选。\n',
    ].join('\n')
  )
}

function printKeyNotice() {
  console.log(
    [
      '提示：本命令支持 Codex、OpenCode、OpenClaw。',
      'Codex 与 OpenCode 共享 OpenAI 端点，OpenClaw 使用 /v1 端点。',
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
        { name: '保护模式（默认，尽量保留现有配置）', value: 'protect' },
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
        { name: 'Codex（需单独订阅 OpenAI 套餐）', value: 'codex' },
        { name: 'OpenCode（与 Codex 共享 OpenAI 套餐）', value: 'opencode' },
        { name: 'OpenClaw（GMN /v1 端点，默认不选中）', value: 'openclaw' },
        { name: '全部（将依次配置 Codex、OpenCode、OpenClaw）', value: 'all' },
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
    `base_url = "${OPENAI_BASE_URL}"`,
    'wire_api = "responses"',
    'requires_openai_auth = true',
    '',
  ].join('\n')

  if (fs.existsSync(configPath)) {
    backupFileOrThrow(configPath, 'aicoding.codex.config.toml')
  }

  atomicWrite(configPath, minimalConfig)

  // 2. 处理 auth.json（先备份，再覆盖写入，仅保留 OPENAI_API_KEY）
  if (fs.existsSync(authPath)) {
    backupFileOrThrow(authPath, 'aicoding.codex.auth.json')
  }

  const auth = { OPENAI_API_KEY: apiKey }
  atomicWrite(authPath, JSON.stringify(auth, null, 2))
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

  backupFileOrThrow(configPath, 'aicoding.opencode.opencode.json')
  atomicWrite(configPath, JSON.stringify(config, null, 2))
}

// ============================================================================
// OpenClaw 配置（始终直接覆盖）
// ============================================================================

function createOpenClawModel(id) {
  return {
    id,
    name: id,
    api: 'openai-responses',
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200000,
    maxTokens: 8192,
  }
}

function configureOpenClaw(apiKey) {
  const openclawDir = path.join(HOME_DIR, '.openclaw')
  const openclawPath = path.join(openclawDir, 'openclaw.json')
  const modelsPath = path.join(openclawDir, 'agents', 'main', 'agent', 'models.json')

  ensureDir(path.dirname(openclawPath))
  ensureDir(path.dirname(modelsPath))

  const providerKey = 'gmn'
  const primaryModelId = 'gpt-5.3-codex'
  const secondaryModelId = 'gpt-5.2-codex'

  const modelsConfig = {
    providers: {
      [providerKey]: {
        baseUrl: GMN_BASE_URLS.openclaw,
        apiKey,
        api: 'openai-responses',
        authHeader: true,
        headers: {
          'User-Agent': 'curl/8.0',
          'OpenAI-Beta': 'responses=v1',
        },
        models: [createOpenClawModel(primaryModelId), createOpenClawModel(secondaryModelId)],
      },
    },
  }

  const openclawConfig = {
    models: {
      mode: 'merge',
      providers: {
        [providerKey]: {
          baseUrl: GMN_BASE_URLS.openclaw,
          apiKey,
          api: 'openai-responses',
          headers: {
            'User-Agent': 'curl/8.0',
            'OpenAI-Beta': 'responses=v1',
          },
          authHeader: true,
          models: [createOpenClawModel(primaryModelId), createOpenClawModel(secondaryModelId)],
        },
      },
    },
    agents: {
      defaults: {
        workspace: HOME_DIR,
        model: {
          primary: `${providerKey}/${primaryModelId}`,
        },
        thinkingDefault: 'xhigh',
      },
    },
  }

  // OpenClaw 策略固定为直接覆盖，不受保护/全覆盖模式影响
  backupFileOrThrow(modelsPath, 'aicoding.openclaw.models.json')
  backupFileOrThrow(openclawPath, 'aicoding.openclaw.openclaw.json')
  atomicWrite(modelsPath, JSON.stringify(modelsConfig, null, 2))
  atomicWrite(openclawPath, JSON.stringify(openclawConfig, null, 2))
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
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ ${message}`)
    process.exit(1)
  }

  console.log(`已选择: ${platforms.join(', ')}`)
  printKeyNotice()

  const needsOpenAIBaseUrl = platforms.includes('codex') || platforms.includes('opencode')

  // 3. 处理 OpenAI Base URL（Codex/OpenCode）
  if (needsOpenAIBaseUrl) {
    const resolvedOpenaiBaseUrl =
      openaiBaseUrl && openaiBaseUrl.trim().length > 0 ? openaiBaseUrl.trim() : GMN_BASE_URLS.openai
    openaiBaseUrl = resolvedOpenaiBaseUrl
    OPENAI_BASE_URL = resolvedOpenaiBaseUrl
  }

  console.log(`\n${renderStep(3, TOTAL_STEPS, '输入 API Key')}`)
  if (!apiKey) {
    apiKey = await promptApiKey()
  } else {
    console.log('已通过参数提供 API Key（已隐藏）')
  }

  if (!apiKey?.trim()) {
    throw new Error('API Key 不能为空')
  }

  console.log(`\n${renderStep(4, TOTAL_STEPS, '开始写入配置')}`)
  console.log(`模式: ${OVERWRITE_MODE ? '全覆盖模式' : '保护模式'}`)
  console.log(`平台: ${platforms.join(', ')}`)
  if (needsOpenAIBaseUrl && openaiBaseUrl) {
    console.log(`OpenAI Base URL: ${openaiBaseUrl}`)
  }
  if (platforms.includes('openclaw')) {
    console.log(`OpenClaw Base URL: ${GMN_BASE_URLS.openclaw}`)
  }
  console.log('\n开始配置...\n')

  // 6. 配置选中的工具
  const ALL_TOOLS = {
    codex: { name: 'Codex', configure: configureCodex },
    opencode: { name: 'OpenCode', configure: configureOpenCode },
    openclaw: { name: 'OpenClaw', configure: configureOpenClaw },
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
  if (platforms.includes('codex')) {
    console.log(`  - Codex:       ${path.join(HOME_DIR, '.codex/config.toml')}`)
    console.log(`  - Codex:       ${path.join(HOME_DIR, '.codex/auth.json')}`)
  }
  if (platforms.includes('opencode')) {
    console.log(`  - OpenCode:    ${path.join(HOME_DIR, '.config/opencode/opencode.json')}`)
  }
  if (platforms.includes('openclaw')) {
    console.log(`  - OpenClaw:    ${path.join(HOME_DIR, '.openclaw/openclaw.json')}`)
    console.log(`  - OpenClaw:    ${path.join(HOME_DIR, '.openclaw/agents/main/agent/models.json')}`)
  }

  console.log('\n提示：请重启对应的工具以使配置生效。')
}

main().catch((err) => {
  console.error(`\n❌ 错误: ${err.message}`)
  process.exit(1)
})

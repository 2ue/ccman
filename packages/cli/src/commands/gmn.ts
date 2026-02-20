import {
  createCodexManager,
  createOpenCodeManager,
  createOpenClawManager,
  type Provider,
  getCcmanDir,
  getCodexAuthPath,
  getCodexConfigPath,
  getOpenCodeConfigPath,
  getOpenClawConfigPath,
  getOpenClawModelsPath,
} from '@ccman/core'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { printLogo } from '../utils/logo.js'

const DEFAULT_PROVIDER_NAME = 'gmn'

const VALID_PLATFORMS = ['codex', 'opencode', 'openclaw'] as const
type Platform = (typeof VALID_PLATFORMS)[number]
const DEFAULT_PLATFORMS: Platform[] = ['codex', 'opencode']

const GMN_OPENAI_BASE_URL = 'https://gmn.chuangzuoli.com'
const GMN_OPENCLAW_BASE_URL = 'https://gmn.chuangzuoli.com/v1'

const TOTAL_STEPS = 3

function renderStep(current: number, total: number, title: string): string {
  const barLength = total
  const filledLength = Math.min(current, total)
  const bar = `${'■'.repeat(filledLength)}${'□'.repeat(barLength - filledLength)}`
  return `步骤 ${current}/${total} [${bar}] ${title}`
}

function printBanner(): void {
  printLogo()
  console.log(
    chalk.cyanBright(
      [
        '  ██████╗  ███╗   ███╗███╗   ██╗',
        ' ██╔════╝  ████╗ ████║████╗  ██║',
        ' ██║  ███╗ ██╔████╔██║██╔██╗ ██║',
        ' ██║   ██║ ██║╚██╔╝██║██║╚██╗██║',
        ' ╚██████╔╝ ██║ ╚═╝ ██║██║ ╚████║',
        '  ╚═════╝  ╚═╝     ╚═╝╚═╝  ╚═══╝',
        '  CCMAN  GMN 一键配置向导',
      ].join('\n')
    )
  )
  console.log(chalk.gray('自动写入选中工具配置，支持多选。\n'))
}

function printKeyNotice(): void {
  console.log(
    chalk.yellow(
      [
        '提示：本命令支持 Codex、OpenCode、OpenClaw 三个平台。',
        'Codex 与 OpenCode 共享 OpenAI 端点；OpenClaw 使用 /v1 端点。',
        'VS Code 的 Codex 插件若使用本机默认配置，也会跟随本次写入生效。',
      ].join('\n')
    )
  )
}

function printWriteTargets(platforms: Platform[]): void {
  console.log(chalk.gray(`写入目录: ${getCcmanDir()}`))
  if (platforms.includes('codex')) {
    console.log(chalk.gray(`  - Codex: ${getCodexConfigPath()}`))
    console.log(chalk.gray(`  - Codex: ${getCodexAuthPath()}`))
  }
  if (platforms.includes('opencode')) {
    console.log(chalk.gray(`  - OpenCode: ${getOpenCodeConfigPath()}`))
  }
  if (platforms.includes('openclaw')) {
    console.log(chalk.gray(`  - OpenClaw: ${getOpenClawConfigPath()}`))
    console.log(chalk.gray(`  - OpenClaw: ${getOpenClawModelsPath()}`))
  }

  const env = process.env.NODE_ENV
  if (env === 'development' || env === 'test') {
    console.log(
      chalk.yellow(
        `⚠️ 当前 NODE_ENV=${env}，将写入开发/测试目录；如需写入真实 HOME，请在生产环境运行（unset NODE_ENV）。`
      )
    )
  }
}

/**
 * 解析平台参数
 */
function parsePlatforms(platformArg: string): Platform[] {
  if (platformArg === 'all') {
    return [...VALID_PLATFORMS]
  }

  const platforms = platformArg.split(',').map((p) => p.trim().toLowerCase())

  // 验证平台名称
  for (const platform of platforms) {
    if (!VALID_PLATFORMS.includes(platform as Platform)) {
      throw new Error(`无效的平台: ${platform}。有效值: ${VALID_PLATFORMS.join(', ')}, all`)
    }
  }

  return platforms as Platform[]
}

async function promptApiKey(): Promise<string> {
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: '请输入 GMN API Key:',
      mask: '*',
      validate: (value) => {
        if (!value?.trim()) return 'API Key 不能为空'
        return true
      },
    },
  ])
  return (answers.apiKey as string).trim()
}

async function promptPlatforms(): Promise<Platform[]> {
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

  const selected = answers.platforms as Array<Platform | 'all'>
  if (selected.includes('all')) {
    return [...VALID_PLATFORMS]
  }
  return selected as Platform[]
}

async function resolvePlatforms(platformArg?: string): Promise<Platform[]> {
  if (platformArg && platformArg.trim().length > 0) {
    return parsePlatforms(platformArg)
  }
  return promptPlatforms()
}

function resolveProviderName(providerNameArg?: string): string {
  if (providerNameArg === undefined) {
    return DEFAULT_PROVIDER_NAME
  }

  const providerName = providerNameArg.trim()
  if (!providerName) {
    throw new Error('服务商名称不能为空')
  }

  // 兼容历史 GMN 大小写写法，统一落为小写 gmn
  if (providerName.toLowerCase() === DEFAULT_PROVIDER_NAME) {
    return DEFAULT_PROVIDER_NAME
  }

  return providerName
}

function findPreferredProvider(providers: Provider[], targetName: string): Provider | undefined {
  const exact = providers.find((p) => p.name.trim() === targetName)
  if (exact) return exact

  const lowerTarget = targetName.toLowerCase()
  return providers.find((p) => p.name.trim().toLowerCase() === lowerTarget)
}

export async function gmnCommand(apiKey?: string, platformArg?: string, providerNameArg?: string) {
  printBanner()

  let platforms: Platform[]
  let providerName: string
  try {
    console.log(chalk.cyan(`\n${renderStep(1, TOTAL_STEPS, '选择要配置的工具')}`))
    platforms = await resolvePlatforms(platformArg)
    providerName = resolveProviderName(providerNameArg)
  } catch (error) {
    console.error(chalk.red(`❌ ${(error as Error).message}`))
    process.exit(1)
  }
  console.log(chalk.gray(`已选择: ${platforms.join(', ')}`))
  console.log(chalk.gray(`服务商名称: ${providerName}`))
  printKeyNotice()

  let resolvedApiKey = apiKey?.trim()
  console.log(chalk.cyan(`\n${renderStep(2, TOTAL_STEPS, '输入 API Key')}`))
  if (!resolvedApiKey) {
    resolvedApiKey = await promptApiKey()
  } else {
    console.log(chalk.gray('已通过参数提供 API Key（已隐藏）'))
  }

  if (!resolvedApiKey?.trim()) {
    console.error(chalk.red('❌ 错误: API Key 不能为空'))
    process.exit(1)
  }

  const openaiBaseUrl = GMN_OPENAI_BASE_URL
  const platformBaseUrls: Record<Platform, string> = {
    codex: openaiBaseUrl,
    opencode: openaiBaseUrl,
    openclaw: GMN_OPENCLAW_BASE_URL,
  }

  console.log(chalk.cyan(`\n${renderStep(3, TOTAL_STEPS, '开始写入配置')}`))
  console.log(chalk.gray(`已选择平台: ${platforms.join(', ')}`))
  if (platforms.includes('codex') || platforms.includes('opencode')) {
    console.log(chalk.gray(`OpenAI Base URL: ${openaiBaseUrl}`))
  }
  if (platforms.includes('openclaw')) {
    console.log(chalk.gray(`OpenClaw Base URL: ${GMN_OPENCLAW_BASE_URL}`))
  }
  printWriteTargets(platforms)
  console.log()

  const ALL_TOOLS = {
    codex: { name: 'Codex', manager: createCodexManager() },
    opencode: { name: 'OpenCode', manager: createOpenCodeManager() },
    openclaw: { name: 'OpenClaw', manager: createOpenClawManager() },
  }

  const tools = platforms.map((platform) => ({
    platform,
    ...ALL_TOOLS[platform],
  }))

  let completed = 0
  for (const { platform, name, manager } of tools) {
    try {
      console.log(chalk.gray(`→ 配置 ${name}...`))
      const baseUrl = platformBaseUrls[platform]
      const existing = findPreferredProvider(manager.list(), providerName)
      const provider = existing
        ? manager.edit(existing.id, { name: providerName, baseUrl, apiKey: resolvedApiKey })
        : manager.add({ name: providerName, baseUrl, apiKey: resolvedApiKey })

      manager.switch(provider.id)
      completed += 1
      console.log(chalk.green(`✅ ${name}`))
    } catch (error) {
      console.error(chalk.red(`❌ ${name}: ${(error as Error).message}`))
    }
  }

  console.log(chalk.green(`\n🎉 GMN 配置完成！(${completed}/${tools.length})`))
  console.log(chalk.gray('提示：请重启对应工具/插件以使配置生效。'))
}

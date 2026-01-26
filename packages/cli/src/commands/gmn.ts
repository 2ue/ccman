import {
  createClaudeManager,
  createCodexManager,
  createGeminiManager,
  createOpenCodeManager,
} from '@ccman/core'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { printLogo } from '../utils/logo.js'

const PROVIDER_NAME = 'GMN'

const VALID_PLATFORMS = ['claude', 'codex', 'gemini', 'opencode'] as const
type Platform = (typeof VALID_PLATFORMS)[number]
const DEFAULT_PLATFORMS: Platform[] = ['codex', 'opencode']

const GMN_BASE_URLS: Pick<Record<Platform, string>, 'claude' | 'gemini'> = {
  claude: 'https://gmn.chuangzuoli.cn/api',
  gemini: 'https://gmn.chuangzuoli.cn/gemini',
}
const GMN_OPENAI_BASE_URLS = {
  cn: 'https://gmn.chuangzuoli.cn/openai',
  com: 'https://gmn.chuangzuoli.com',
} as const
type OpenAIDomain = keyof typeof GMN_OPENAI_BASE_URLS

const TOTAL_STEPS = 4

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
  console.log(chalk.gray('自动写入选中工具配置，支持多选与端点选择。\n'))
}

function printKeyNotice(): void {
  console.log(
    chalk.yellow(
      [
        '提示：Codex 与 OpenCode 共享 OpenAI 套餐/端点；Gemini 与 Claude 需单独订阅。',
        '例如：Gemini 套餐不能用于 Codex/OpenCode，Claude 套餐也不能通用。',
        'VS Code 的 Codex 插件若使用本机默认配置，也会跟随本次写入生效。',
      ].join('\n')
    )
  )
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
        if (!value) return 'API Key 不能为空'
        return true
      },
    },
  ])
  return answers.apiKey as string
}

async function promptPlatforms(): Promise<Platform[]> {
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

async function resolveOpenAIDomain(
  domainArg: string | undefined,
  platforms: Platform[]
): Promise<OpenAIDomain> {
  const needsOpenAI = platforms.includes('codex') || platforms.includes('opencode')
  if (!needsOpenAI) {
    return 'cn'
  }

  if (domainArg && domainArg.trim().length > 0) {
    const normalized = domainArg.trim().toLowerCase() as OpenAIDomain
    if (normalized === 'cn' || normalized === 'com') {
      return normalized
    }
    throw new Error(`无效的 domain: ${domainArg} (可选: cn, com)`)
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'domain',
      message: '选择 Codex/OpenCode 的 OpenAI Base URL（只影响这两个工具）:',
      choices: [
        { name: `CN（国内）  ${GMN_OPENAI_BASE_URLS.cn}`, value: 'cn' },
        { name: `COM（国际） ${GMN_OPENAI_BASE_URLS.com}`, value: 'com' },
      ],
      default: 'cn',
    },
  ])
  return answers.domain as OpenAIDomain
}

export async function gmnCommand(apiKey?: string, platformArg?: string, domainArg?: string) {
  printBanner()

  let platforms: Platform[]
  try {
    console.log(chalk.cyan(`\n${renderStep(1, TOTAL_STEPS, '选择要配置的工具')}`))
    platforms = await resolvePlatforms(platformArg)
  } catch (error) {
    console.error(chalk.red(`❌ ${(error as Error).message}`))
    process.exit(1)
  }
  console.log(chalk.gray(`已选择: ${platforms.join(', ')}`))
  printKeyNotice()

  let openaiDomain: OpenAIDomain
  try {
    if (platforms.includes('codex') || platforms.includes('opencode')) {
      console.log(
        chalk.cyan(`\n${renderStep(2, TOTAL_STEPS, '选择 OpenAI 端点 (仅 Codex/OpenCode)')}`)
      )
    } else {
      console.log(chalk.cyan(`\n${renderStep(2, TOTAL_STEPS, '选择 OpenAI 端点 (已跳过)')}`))
      console.log(chalk.gray('未选择 Codex/OpenCode，将跳过此步骤。'))
    }
    openaiDomain = await resolveOpenAIDomain(domainArg, platforms)
  } catch (error) {
    console.error(chalk.red(`❌ ${(error as Error).message}`))
    process.exit(1)
  }

  let resolvedApiKey = apiKey?.trim()
  console.log(chalk.cyan(`\n${renderStep(3, TOTAL_STEPS, '输入 API Key')}`))
  if (!resolvedApiKey) {
    resolvedApiKey = await promptApiKey()
  } else {
    console.log(chalk.gray('已通过参数提供 API Key（已隐藏）'))
  }

  if (!resolvedApiKey?.trim()) {
    console.error(chalk.red('❌ 错误: API Key 不能为空'))
    process.exit(1)
  }

  const openaiBaseUrl = GMN_OPENAI_BASE_URLS[openaiDomain]
  const platformBaseUrls: Record<Platform, string> = {
    claude: GMN_BASE_URLS.claude,
    codex: openaiBaseUrl,
    gemini: GMN_BASE_URLS.gemini,
    opencode: openaiBaseUrl,
  }

  console.log(chalk.cyan(`\n${renderStep(4, TOTAL_STEPS, '开始写入配置')}`))
  console.log(chalk.gray(`已选择平台: ${platforms.join(', ')}`))
  if (platforms.includes('codex') || platforms.includes('opencode')) {
    console.log(chalk.gray(`OpenAI 端点: ${openaiBaseUrl}`))
  }
  console.log()

  const ALL_TOOLS = {
    claude: { name: 'Claude Code', manager: createClaudeManager() },
    codex: { name: 'Codex', manager: createCodexManager() },
    gemini: { name: 'Gemini CLI', manager: createGeminiManager() },
    opencode: { name: 'OpenCode', manager: createOpenCodeManager() },
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
      const existing = manager.findByName(PROVIDER_NAME)
      const provider = existing
        ? manager.edit(existing.id, { baseUrl, apiKey: resolvedApiKey })
        : manager.add({ name: PROVIDER_NAME, baseUrl, apiKey: resolvedApiKey })

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

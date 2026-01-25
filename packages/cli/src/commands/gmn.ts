import {
  createClaudeManager,
  createCodexManager,
  createGeminiManager,
  createOpenCodeManager,
} from '@ccman/core'
import chalk from 'chalk'
import inquirer from 'inquirer'

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
      message: '选择平台:',
      choices: [
        { name: 'Claude Code', value: 'claude' },
        { name: 'Codex', value: 'codex' },
        { name: 'Gemini CLI', value: 'gemini' },
        { name: 'OpenCode', value: 'opencode' },
        { name: '全部 (all)', value: 'all' },
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
      message: '选择 Codex/OpenCode 的 OpenAI Base URL:',
      choices: [
        { name: `CN  ${GMN_OPENAI_BASE_URLS.cn}`, value: 'cn' },
        { name: `COM ${GMN_OPENAI_BASE_URLS.com}`, value: 'com' },
      ],
      default: 'cn',
    },
  ])
  return answers.domain as OpenAIDomain
}

export async function gmnCommand(apiKey?: string, platformArg?: string, domainArg?: string) {
  let resolvedApiKey = apiKey?.trim()
  if (!resolvedApiKey) {
    resolvedApiKey = await promptApiKey()
  }

  let platforms: Platform[]
  try {
    platforms = await resolvePlatforms(platformArg)
  } catch (error) {
    console.error(chalk.red(`❌ ${(error as Error).message}`))
    process.exit(1)
  }

  let openaiDomain: OpenAIDomain
  try {
    openaiDomain = await resolveOpenAIDomain(domainArg, platforms)
  } catch (error) {
    console.error(chalk.red(`❌ ${(error as Error).message}`))
    process.exit(1)
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

  console.log(chalk.cyan('🚀 开始配置 GMN...'))
  console.log(chalk.gray(`平台: ${platforms.join(', ')}\n`))

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

  for (const { platform, name, manager } of tools) {
    try {
      const baseUrl = platformBaseUrls[platform]
      const existing = manager.findByName(PROVIDER_NAME)
      const provider = existing
        ? manager.edit(existing.id, { baseUrl, apiKey: resolvedApiKey })
        : manager.add({ name: PROVIDER_NAME, baseUrl, apiKey: resolvedApiKey })

      manager.switch(provider.id)
      console.log(chalk.green(`✅ ${name}`))
    } catch (error) {
      console.error(chalk.red(`❌ ${name}: ${(error as Error).message}`))
    }
  }

  console.log(chalk.green('\n🎉 GMN 配置完成！'))
  console.log(chalk.gray('提示：请重启对应的工具以使配置生效。'))
}

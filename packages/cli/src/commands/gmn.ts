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
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { printLogo } from '../utils/logo.js'
import {
  type EndpointCandidate,
  type EndpointProbeResult,
  normalizeEndpointUrl,
  pickDefaultEndpoint,
  probeEndpointCandidates,
  sortEndpointProbeResults,
} from '../utils/endpoint-latency.js'

const DEFAULT_PROVIDER_NAME = 'gmn'

const VALID_PLATFORMS = ['codex', 'opencode', 'openclaw'] as const
type Platform = (typeof VALID_PLATFORMS)[number]
const DEFAULT_PLATFORMS: Platform[] = ['codex', 'opencode']

interface GmnProfile {
  commandName: 'gmn' | 'gmn1'
  title: string
  baseUrls: EndpointCandidate[]
}

const GMN_BASE_URLS: EndpointCandidate[] = [
  {
    label: '原始地址',
    url: 'https://gmn.chuangzuoli.com',
    description: 'GMN 原始入口',
  },
  {
    label: '旧域名 CDN',
    url: 'https://cdn.gmnchuangzuoli.com',
    description: 'CDN 回国加速',
  },
  {
    label: '阿里云 CDN',
    url: 'https://gmncodex.com',
    description: '阿里云解析 CDN 回国加速',
  },
  {
    label: '全球边缘 A',
    url: 'https://gmncode.cn',
    description: '全球边缘节点加速',
  },
  {
    label: 'CF CDN A',
    url: 'https://cdn.gmncode.cn',
    description: 'CF 解析 CDN 回国加速',
  },
  {
    label: '全球边缘 B',
    url: 'https://gmn.codex.com',
    description: '全球边缘节点加速',
  },
  {
    label: 'CF CDN B',
    url: 'https://cdn.gmncode.com',
    description: 'CF 解析 CDN 回国加速',
  },
]

const GMN_PROFILE: GmnProfile = {
  commandName: 'gmn',
  title: 'GMN',
  baseUrls: GMN_BASE_URLS,
}

const GMN1_PROFILE: GmnProfile = {
  commandName: 'gmn1',
  title: 'GMN1',
  baseUrls: [
    {
      label: 'GMN1 默认线路',
      url: 'https://gmncode.cn',
      description: '全球边缘节点加速',
    },
  ],
}

const TOTAL_STEPS = 4
const BASE_URL_PROBE_SAMPLE_COUNT = 3
const BASE_URL_PROBE_TIMEOUT_MS = 2500

function renderStep(current: number, total: number, title: string): string {
  const barLength = total
  const filledLength = Math.min(current, total)
  const bar = `${'■'.repeat(filledLength)}${'□'.repeat(barLength - filledLength)}`
  return `步骤 ${current}/${total} [${bar}] ${title}`
}

function printBanner(title: string): void {
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
        `  CCMAN  ${title} 一键配置向导`,
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

async function promptApiKey(title: string): Promise<string> {
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: `请输入 ${title} API Key:`,
      mask: '*',
      validate: (value) => {
        if (!value?.trim()) return 'API Key 不能为空'
        return true
      },
    },
  ])
  return (answers.apiKey as string).trim()
}

async function promptPlatforms(title: string): Promise<Platform[]> {
  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'platforms',
      message: '选择要配置的工具（可多选，空格选择 / a全选 / i反选 / 回车确认）:',
      dontShowHints: true,
      choices: [
        { name: 'Codex（需单独订阅 OpenAI 套餐）', value: 'codex' },
        { name: 'OpenCode（与 Codex 共享 OpenAI 套餐）', value: 'opencode' },
        { name: `OpenClaw（${title} /v1 端点，默认不选中）`, value: 'openclaw' },
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

async function resolvePlatforms(platformArg?: string, title = 'GMN'): Promise<Platform[]> {
  if (platformArg && platformArg.trim().length > 0) {
    return parsePlatforms(platformArg)
  }
  return promptPlatforms(title)
}

function formatLatency(result: EndpointProbeResult): string {
  if (result.latencyMs === null) {
    return result.error || '测速失败'
  }
  return `${result.latencyMs} ms`
}

function buildProbeCandidates(
  baseUrls: EndpointCandidate[],
  platforms: Platform[]
): EndpointCandidate[] {
  const openClawOnly = platforms.length === 1 && platforms[0] === 'openclaw'

  return baseUrls.map((item) => ({
    ...item,
    probeUrl: openClawOnly ? buildOpenClawBaseUrl(item.url) : item.url,
  }))
}

function printBaseUrlProbeResults(results: EndpointProbeResult[], platforms: Platform[]): void {
  const usingOpenClawPath = platforms.length === 1 && platforms[0] === 'openclaw'
  console.log(
    chalk.gray(
      `测速方式：HTTPS 首包延迟（${BASE_URL_PROBE_SAMPLE_COUNT} 次中位数）${
        usingOpenClawPath ? '，当前仅检测 OpenClaw 的 /v1 端点' : ''
      }`
    )
  )

  for (const result of results) {
    const latencyText =
      result.latencyMs === null
        ? chalk.red(formatLatency(result))
        : chalk.green(formatLatency(result))

    console.log(`  ${chalk.cyan(result.label)} · ${latencyText}`)
    console.log(chalk.gray(`    ${result.url}`))
    console.log(chalk.gray(`    ${result.description}`))
  }
}

async function resolveOpenAiBaseUrl(
  profile: GmnProfile,
  platforms: Platform[],
  baseUrlArg?: string
): Promise<string> {
  if (baseUrlArg && baseUrlArg.trim().length > 0) {
    const normalized = normalizeEndpointUrl(baseUrlArg)
    console.log(chalk.gray(`已通过参数指定 Base URL: ${normalized}`))
    return normalized
  }

  const probeResults = sortEndpointProbeResults(
    await probeEndpointCandidates(buildProbeCandidates(profile.baseUrls, platforms), {
      sampleCount: BASE_URL_PROBE_SAMPLE_COUNT,
      timeoutMs: BASE_URL_PROBE_TIMEOUT_MS,
    })
  )

  if (probeResults.length === 0) {
    throw new Error('没有可用的 Base URL 候选项')
  }

  printBaseUrlProbeResults(probeResults, platforms)

  const defaultResult = pickDefaultEndpoint(probeResults) || probeResults[0]
  const allFailed = probeResults.every((result) => result.latencyMs === null)
  if (allFailed) {
    console.log(chalk.yellow('⚠️ 所有候选地址测速失败，将默认选中第一个地址，你也可以手动切换。'))
  } else {
    console.log(chalk.gray(`默认已选延迟最低地址：${defaultResult.url}`))
  }

  if (probeResults.length === 1) {
    console.log(chalk.green(`已自动选择: ${defaultResult.url}`))
    return defaultResult.url
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log(chalk.yellow(`非交互环境，已自动使用默认地址：${defaultResult.url}`))
    return defaultResult.url
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'baseUrl',
      message: '选择要使用的 Base URL（默认已选延迟最低）:',
      choices: probeResults.map((result) => ({
        name: `${result.label} · ${result.url} · ${formatLatency(result)} · ${result.description}`,
        value: result.url,
      })),
      default: defaultResult.url,
    },
  ])

  return answers.baseUrl as string
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

interface BackupEntry {
  originalPath: string
  backupPath: string | null
  existed: boolean
}

interface PlatformBackupResult {
  backupDir: string
  entries: BackupEntry[]
}

function getPlatformTargetFiles(platform: Platform): string[] {
  const ccmanDir = getCcmanDir()

  switch (platform) {
    case 'codex':
      return [path.join(ccmanDir, 'codex.json'), getCodexConfigPath(), getCodexAuthPath()]
    case 'opencode':
      return [path.join(ccmanDir, 'opencode.json'), getOpenCodeConfigPath()]
    case 'openclaw':
      return [
        path.join(ccmanDir, 'openclaw.json'),
        getOpenClawConfigPath(),
        getOpenClawModelsPath(),
      ]
  }
}

function createPlatformBackupOrThrow(
  platform: Platform,
  backupRootDir: string
): PlatformBackupResult {
  const backupDir = path.join(backupRootDir, platform)
  const entries: BackupEntry[] = []
  const targetFiles = getPlatformTargetFiles(platform)

  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 })

  for (const [index, originalPath] of targetFiles.entries()) {
    const existed = fs.existsSync(originalPath)
    if (!existed) {
      entries.push({ originalPath, backupPath: null, existed: false })
      continue
    }

    const fileName = path.basename(originalPath).replace(/[^\w.-]/g, '_')
    const backupPath = path.join(backupDir, `${String(index).padStart(2, '0')}-${fileName}.bak`)

    try {
      fs.copyFileSync(originalPath, backupPath)
      fs.chmodSync(backupPath, 0o600)
      entries.push({ originalPath, backupPath, existed: true })
    } catch (error) {
      throw new Error(`备份失败，已中止后续写入（${platform}）: ${(error as Error).message}`)
    }
  }

  const manifestPath = path.join(backupDir, 'manifest.json')
  const manifest = {
    platform,
    createdAt: new Date().toISOString(),
    entries,
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 })

  return { backupDir, entries }
}

function rollbackFromBackupOrThrow(result: PlatformBackupResult): void {
  const errors: string[] = []

  for (const entry of result.entries) {
    try {
      if (entry.existed) {
        if (!entry.backupPath || !fs.existsSync(entry.backupPath)) {
          throw new Error(`备份文件缺失: ${entry.backupPath || entry.originalPath}`)
        }
        fs.mkdirSync(path.dirname(entry.originalPath), { recursive: true })
        fs.copyFileSync(entry.backupPath, entry.originalPath)
      } else if (fs.existsSync(entry.originalPath)) {
        fs.rmSync(entry.originalPath, { force: true })
      }
    } catch (error) {
      errors.push(`${entry.originalPath}: ${(error as Error).message}`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`回滚失败: ${errors.join('; ')}`)
  }
}

function buildOpenClawBaseUrl(openaiBaseUrl: string): string {
  const normalized = openaiBaseUrl.replace(/\/+$/, '')
  return `${normalized}/v1`
}

async function runGmnCommand(
  profile: GmnProfile,
  apiKey?: string,
  platformArg?: string,
  providerNameArg?: string,
  baseUrlArg?: string
) {
  printBanner(profile.title)

  let platforms: Platform[]
  let providerName: string
  try {
    console.log(chalk.cyan(`\n${renderStep(1, TOTAL_STEPS, '选择要配置的工具')}`))
    platforms = await resolvePlatforms(platformArg, profile.title)
    providerName = resolveProviderName(providerNameArg)
  } catch (error) {
    console.error(chalk.red(`❌ ${(error as Error).message}`))
    process.exit(1)
  }
  console.log(chalk.gray(`已选择: ${platforms.join(', ')}`))
  console.log(chalk.gray(`服务商名称: ${providerName}`))
  printKeyNotice()

  console.log(chalk.cyan(`\n${renderStep(2, TOTAL_STEPS, '测速并选择 Base URL')}`))
  let openaiBaseUrl: string
  try {
    openaiBaseUrl = await resolveOpenAiBaseUrl(profile, platforms, baseUrlArg)
  } catch (error) {
    console.error(chalk.red(`❌ ${(error as Error).message}`))
    process.exit(1)
  }
  const openclawBaseUrl = buildOpenClawBaseUrl(openaiBaseUrl)
  const platformBaseUrls: Record<Platform, string> = {
    codex: openaiBaseUrl,
    opencode: openaiBaseUrl,
    openclaw: openclawBaseUrl,
  }

  let resolvedApiKey = apiKey?.trim()
  console.log(chalk.cyan(`\n${renderStep(3, TOTAL_STEPS, '输入 API Key')}`))
  if (!resolvedApiKey) {
    resolvedApiKey = await promptApiKey(profile.title)
  } else {
    console.log(chalk.gray('已通过参数提供 API Key（已隐藏）'))
  }

  if (!resolvedApiKey?.trim()) {
    console.error(chalk.red('❌ 错误: API Key 不能为空'))
    process.exit(1)
  }

  console.log(chalk.cyan(`\n${renderStep(4, TOTAL_STEPS, '开始写入配置')}`))
  console.log(chalk.gray(`已选择平台: ${platforms.join(', ')}`))
  console.log(chalk.gray(`OpenAI Base URL: ${openaiBaseUrl}`))
  if (platforms.includes('openclaw')) {
    console.log(chalk.gray(`OpenClaw Base URL: ${openclawBaseUrl}`))
  }
  printWriteTargets(platforms)
  console.log()

  const backupRootDir = path.join(
    getCcmanDir(),
    'backups',
    `${profile.commandName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  )
  fs.mkdirSync(backupRootDir, { recursive: true, mode: 0o700 })
  console.log(chalk.gray(`备份根目录: ${backupRootDir}`))
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

  const successBackups: Array<{
    name: string
    backupDir: string
    backupFiles: string[]
  }> = []
  let completed = 0
  for (const { platform, name, manager } of tools) {
    let backupResult: PlatformBackupResult | null = null

    try {
      console.log(chalk.gray(`→ 配置 ${name}...`))
      backupResult = createPlatformBackupOrThrow(platform, backupRootDir)

      const backupFiles = backupResult.entries
        .map((entry) => entry.backupPath)
        .filter((p): p is string => p !== null)
      if (backupFiles.length > 0) {
        console.log(chalk.gray(`  已备份 ${backupFiles.length} 个文件`))
      } else {
        console.log(chalk.gray('  无历史文件可备份'))
      }

      const baseUrl = platformBaseUrls[platform]
      const existing = findPreferredProvider(manager.list(), providerName)
      const provider = existing
        ? manager.edit(
            existing.id,
            { name: providerName, baseUrl, apiKey: resolvedApiKey },
            { applyWrite: false }
          )
        : manager.add({ name: providerName, baseUrl, apiKey: resolvedApiKey })

      manager.switch(provider.id, { mode: 'overwrite' })
      completed += 1
      console.log(chalk.green(`✅ ${name}`))
      successBackups.push({
        name,
        backupDir: backupResult.backupDir,
        backupFiles,
      })
    } catch (error) {
      const operationError = error as Error
      if (backupResult !== null) {
        try {
          rollbackFromBackupOrThrow(backupResult)
          console.error(chalk.red(`❌ ${name}: ${operationError.message}（已回滚历史文件）`))
        } catch (rollbackError) {
          console.error(
            chalk.red(
              `❌ ${name}: ${operationError.message}；回滚也失败: ${(rollbackError as Error).message}`
            )
          )
        }
      } else {
        console.error(chalk.red(`❌ ${name}: ${operationError.message}`))
      }
    }
  }

  console.log(chalk.green(`\n🎉 ${profile.title} 配置完成！(${completed}/${tools.length})`))
  console.log()
  console.log(chalk.bold('备份信息:'))
  if (successBackups.length === 0) {
    console.log(chalk.gray('  无成功配置项，未生成可用备份目录。'))
  } else {
    for (const item of successBackups) {
      console.log(chalk.gray(`  ${item.name}: ${item.backupDir}`))
      if (item.backupFiles.length === 0) {
        console.log(chalk.gray('    - 无历史文件可备份'))
      } else {
        for (const file of item.backupFiles) {
          console.log(chalk.gray(`    - ${file}`))
        }
      }
    }
  }
  console.log(chalk.gray('提示：请重启对应工具/插件以使配置生效。'))
}

export async function gmnCommand(
  apiKey?: string,
  platformArg?: string,
  providerNameArg?: string,
  baseUrlArg?: string
) {
  await runGmnCommand(GMN_PROFILE, apiKey, platformArg, providerNameArg, baseUrlArg)
}

export async function gmn1Command(
  apiKey?: string,
  platformArg?: string,
  providerNameArg?: string,
  baseUrlArg?: string
) {
  await runGmnCommand(GMN1_PROFILE, apiKey, platformArg, providerNameArg, baseUrlArg)
}

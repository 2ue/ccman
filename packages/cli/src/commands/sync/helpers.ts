/**
 * Sync 命令辅助函数
 */

import chalk from 'chalk'
import { Command, Option } from 'commander'
import inquirer from 'inquirer'
import type { SyncConfig, WebDAVAuthType } from '@ccman/core'
import { loadSyncConfig, type LocalSyncConfig } from '../../utils/sync-config.js'
import { promptConfirm } from '../../utils/confirm.js'

const SYNC_ENV_KEYS = {
  webdavUrl: 'CCMAN_WEBDAV_URL',
  username: 'CCMAN_WEBDAV_USERNAME',
  password: 'CCMAN_WEBDAV_PASSWORD',
  authType: 'CCMAN_WEBDAV_AUTH_TYPE',
  remoteDir: 'CCMAN_WEBDAV_REMOTE_DIR',
  syncPassword: 'CCMAN_SYNC_PASSWORD',
} as const

type SyncFieldKey =
  | 'webdavUrl'
  | 'username'
  | 'password'
  | 'authType'
  | 'remoteDir'
  | 'syncPassword'

const REQUIRED_CONNECTION_FIELDS = ['webdavUrl', 'username', 'password'] as const

export interface SyncCommandOptions {
  webdavUrl?: string
  username?: string
  password?: string
  authType?: WebDAVAuthType
  remoteDir?: string
  syncPassword?: string
  rememberSyncPassword?: boolean
  forgetSyncPassword?: boolean
  yes?: boolean
  test?: boolean
}

export interface SyncCommandInput {
  overrides: Partial<LocalSyncConfig>
  rememberSyncPassword?: boolean
  yes: boolean
  shouldTest: boolean
  nonInteractive: boolean
}

function normalizeText(value?: string): string | undefined {
  if (value === undefined) {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function resolveTextOption(
  cliValue: string | undefined,
  envKey: (typeof SYNC_ENV_KEYS)[SyncFieldKey],
  env: NodeJS.ProcessEnv
): string | undefined {
  return normalizeText(cliValue) ?? normalizeText(env[envKey])
}

function resolveAuthType(
  cliValue: string | undefined,
  env: NodeJS.ProcessEnv
): WebDAVAuthType | undefined {
  const value = resolveTextOption(cliValue, SYNC_ENV_KEYS.authType, env)
  if (!value) {
    return undefined
  }

  if (value === 'password' || value === 'digest') {
    return value
  }

  throw new Error(`无效的认证类型: ${value}，仅支持 password 或 digest`)
}

function hasSyncEnvInput(env: NodeJS.ProcessEnv): boolean {
  return Object.values(SYNC_ENV_KEYS).some((key) => normalizeText(env[key]))
}

function formatMissingFields(fields: readonly string[]): string {
  const labels: Record<string, string> = {
    webdavUrl: '--webdav-url',
    username: '--username',
    password: '--password',
    authType: '--auth-type',
    remoteDir: '--remote-dir',
    syncPassword: '--sync-password',
  }

  return fields.map((field) => labels[field] || field).join(', ')
}

export function addSyncConnectionOptions(
  command: Command,
  options: {
    includeSyncPassword?: boolean
    includeConfirm?: boolean
    includeRememberFlags?: boolean
    includeTestFlag?: boolean
  } = {}
): void {
  command
    .option('--webdav-url <url>', `WebDAV 服务器地址（或环境变量 ${SYNC_ENV_KEYS.webdavUrl}）`)
    .option('--username <username>', `WebDAV 用户名（或环境变量 ${SYNC_ENV_KEYS.username}）`)
    .option('--password <password>', `WebDAV 密码（或环境变量 ${SYNC_ENV_KEYS.password}）`)
    .addOption(
      new Option(
        '--auth-type <type>',
        `认证类型（password|digest，或环境变量 ${SYNC_ENV_KEYS.authType}）`
      ).choices(['password', 'digest'])
    )
    .option('--remote-dir <dir>', `远程同步目录（或环境变量 ${SYNC_ENV_KEYS.remoteDir}）`)

  if (options.includeSyncPassword) {
    command.option(
      '--sync-password <password>',
      `同步密码（或环境变量 ${SYNC_ENV_KEYS.syncPassword}）`
    )
  }

  if (options.includeConfirm) {
    command.option('-y, --yes', '跳过确认提示')
  }

  if (options.includeRememberFlags) {
    command
      .option('--remember-sync-password', '保存同步密码到本地配置')
      .option('--forget-sync-password', '不保存同步密码到本地配置')
  }

  if (options.includeTestFlag) {
    command.option('--test', '保存后立即测试连接')
  }
}

export function collectSyncCommandInput(
  options: SyncCommandOptions = {},
  env: NodeJS.ProcessEnv = process.env
): SyncCommandInput {
  if (options.rememberSyncPassword && options.forgetSyncPassword) {
    throw new Error('不能同时使用 --remember-sync-password 和 --forget-sync-password')
  }

  const overrides: Partial<LocalSyncConfig> = {
    webdavUrl: resolveTextOption(options.webdavUrl, SYNC_ENV_KEYS.webdavUrl, env),
    username: resolveTextOption(options.username, SYNC_ENV_KEYS.username, env),
    password: resolveTextOption(options.password, SYNC_ENV_KEYS.password, env),
    authType: resolveAuthType(options.authType, env),
    remoteDir: resolveTextOption(options.remoteDir, SYNC_ENV_KEYS.remoteDir, env),
    syncPassword: resolveTextOption(options.syncPassword, SYNC_ENV_KEYS.syncPassword, env),
  }

  const rememberSyncPassword = options.rememberSyncPassword
    ? true
    : options.forgetSyncPassword
      ? false
      : undefined

  const nonInteractive =
    options.yes === true ||
    rememberSyncPassword !== undefined ||
    hasSyncEnvInput(env) ||
    Object.values(overrides).some((value) => value !== undefined)

  return {
    overrides,
    rememberSyncPassword,
    yes: options.yes === true,
    shouldTest: options.test === true,
    nonInteractive,
  }
}

function mergeSyncConfig(
  baseConfig: LocalSyncConfig | null,
  overrides: Partial<LocalSyncConfig>
): Partial<LocalSyncConfig> {
  return {
    ...(baseConfig || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined)),
  }
}

export function getMissingConnectionFields(config: Partial<SyncConfig>): string[] {
  return REQUIRED_CONNECTION_FIELDS.filter((field) => !normalizeText(config[field]))
}

export function buildRuntimeSyncConfig(
  existingConfig: LocalSyncConfig | null,
  input: SyncCommandInput
): Partial<LocalSyncConfig> {
  return mergeSyncConfig(existingConfig, input.overrides)
}

function assertCompleteSyncConfig(
  config: Partial<LocalSyncConfig>
): asserts config is LocalSyncConfig {
  const missingFields = getMissingConnectionFields(config)
  if (missingFields.length > 0) {
    throw new Error(`缺少同步配置参数: ${formatMissingFields(missingFields)}`)
  }
}

/**
 * 检查 WebDAV 配置是否存在，如果不存在则询问用户是否配置
 *
 * @returns 配置对象，如果用户选择不配置则返回 null
 */
export async function ensureConfigExists(
  options: SyncCommandOptions = {}
): Promise<LocalSyncConfig | null> {
  const existingConfig = loadSyncConfig()
  const input = collectSyncCommandInput(options)
  const mergedConfig = buildRuntimeSyncConfig(existingConfig, input)

  if (getMissingConnectionFields(mergedConfig).length === 0) {
    assertCompleteSyncConfig(mergedConfig)
    return mergedConfig
  }

  if (input.nonInteractive) {
    assertCompleteSyncConfig(mergedConfig)
  }

  // 未找到配置，询问用户
  console.log(chalk.yellow('\n⚠️  未找到 WebDAV 配置\n'))

  const shouldConfig = await promptConfirm('是否现在配置 WebDAV?', true)

  if (!shouldConfig) {
    return null
  }

  // 用户选择配置，执行配置命令
  const { configCommand } = await import('./config.js')
  const cmd = new Command()
  configCommand(cmd)
  await cmd.parseAsync(['node', 'ccman', 'config'])

  // 配置完成后重新加载
  return loadSyncConfig()
}

export async function resolveSyncPassword(
  config: Partial<LocalSyncConfig>,
  options: SyncCommandOptions = {}
): Promise<string> {
  const input = collectSyncCommandInput(options)
  const syncPassword =
    normalizeText(input.overrides.syncPassword) || normalizeText(config.syncPassword)

  if (syncPassword) {
    return syncPassword
  }

  if (input.nonInteractive) {
    throw new Error(`缺少同步密码: ${formatMissingFields(['syncPassword'])}`)
  }

  const { password } = await inquirer.prompt([
    {
      type: 'password',
      name: 'password',
      message: '请输入同步密码:',
      mask: '*',
      validate: (value) => (value ? true : '同步密码不能为空'),
    },
  ])

  return password
}

export async function confirmOrExit(
  message: string,
  defaultValue: boolean,
  options: SyncCommandOptions = {}
): Promise<boolean> {
  const input = collectSyncCommandInput(options)

  if (input.yes) {
    return true
  }

  if (input.nonInteractive) {
    throw new Error(`非交互模式请通过 --yes 确认操作`)
  }

  return promptConfirm(message, defaultValue)
}

import { Command } from 'commander'
import type { AddProviderInput, EditProviderInput } from '@ccman/core'
import { promptConfirm } from './confirm.js'

export interface ProviderAddCommandOptions {
  preset?: string
  name?: string
  desc?: string
  baseUrl?: string
  apiKey?: string
  switch?: boolean
  skipSwitch?: boolean
}

export interface ProviderEditCommandOptions {
  newName?: string
  desc?: string
  baseUrl?: string
  apiKey?: string
}

export interface ProviderRemoveCommandOptions {
  yes?: boolean
}

interface ProviderInputRules {
  allowEmptyBaseUrl?: boolean
  allowEmptyApiKey?: boolean
}

interface ProviderPresetLike {
  name: string
  baseUrl: string
}

export interface ResolvedProviderAddInput {
  nonInteractive: boolean
  switchNow: boolean
  input?: AddProviderInput
}

export interface ResolvedProviderEditInput {
  nonInteractive: boolean
  updates: EditProviderInput
}

function trimCliValue(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }

  return value.trim()
}

function validateBaseUrl(baseUrl: string, allowEmpty = false): void {
  if (!baseUrl) {
    if (allowEmpty) {
      return
    }
    throw new Error('缺少参数: --base-url')
  }

  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    throw new Error('API 地址必须以 http:// 或 https:// 开头')
  }
}

function validateApiKey(apiKey: string, allowEmpty = false): void {
  if (!apiKey && !allowEmpty) {
    throw new Error('缺少参数: --api-key')
  }
}

function resolvePreset(
  presets: ProviderPresetLike[],
  presetName?: string
): ProviderPresetLike | undefined {
  const normalizedName = trimCliValue(presetName)
  if (!normalizedName) {
    return undefined
  }

  const preset = presets.find((item) => item.name.toLowerCase() === normalizedName.toLowerCase())
  if (!preset) {
    throw new Error(`预设不存在: ${normalizedName}`)
  }
  return preset
}

export function addProviderAddOptions(command: Command): void {
  command
    .option('--preset <name>', '使用指定预设')
    .option('--name <name>', '服务商名称')
    .option('--desc <desc>', '描述')
    .option('--base-url <url>', 'API 地址')
    .option('--api-key <key>', 'API 密钥')
    .option('--switch', '添加后立即切换')
    .option('--skip-switch', '添加后不切换')
}

export function addProviderEditOptions(command: Command): void {
  command
    .option('--new-name <name>', '新的服务商名称')
    .option('--desc <desc>', '新的描述；传空字符串可清空')
    .option('--base-url <url>', '新的 API 地址')
    .option('--api-key <key>', '新的 API 密钥')
}

export function addProviderRemoveOptions(command: Command): void {
  command.option('-y, --yes', '跳过删除确认')
}

export function resolveProviderAddInput(
  options: ProviderAddCommandOptions,
  presets: ProviderPresetLike[],
  rules: ProviderInputRules = {}
): ResolvedProviderAddInput {
  if (options.switch && options.skipSwitch) {
    throw new Error('不能同时使用 --switch 和 --skip-switch')
  }

  const nonInteractive =
    options.preset !== undefined ||
    options.name !== undefined ||
    options.desc !== undefined ||
    options.baseUrl !== undefined ||
    options.apiKey !== undefined ||
    options.switch === true ||
    options.skipSwitch === true

  if (!nonInteractive) {
    return {
      nonInteractive: false,
      switchNow: false,
    }
  }

  const preset = resolvePreset(presets, options.preset)
  const name = trimCliValue(options.name) ?? preset?.name
  const desc = options.desc === undefined ? undefined : options.desc.trim() || undefined
  const baseUrl = trimCliValue(options.baseUrl) ?? preset?.baseUrl ?? ''
  const apiKey = options.apiKey === undefined ? '' : options.apiKey.trim()

  if (!name) {
    throw new Error('缺少参数: --name')
  }

  validateBaseUrl(baseUrl, rules.allowEmptyBaseUrl)
  validateApiKey(apiKey, rules.allowEmptyApiKey)

  return {
    nonInteractive: true,
    switchNow: options.switch === true,
    input: {
      name,
      desc,
      baseUrl,
      apiKey,
    },
  }
}

export function resolveProviderEditInput(
  options: ProviderEditCommandOptions,
  rules: ProviderInputRules = {}
): ResolvedProviderEditInput {
  const nonInteractive =
    options.newName !== undefined ||
    options.desc !== undefined ||
    options.baseUrl !== undefined ||
    options.apiKey !== undefined

  const updates: EditProviderInput = {}

  if (options.newName !== undefined) {
    const newName = trimCliValue(options.newName)
    if (!newName) {
      throw new Error('服务商名称不能为空')
    }
    updates.name = newName
  }

  if (options.desc !== undefined) {
    updates.desc = options.desc.trim()
  }

  if (options.baseUrl !== undefined) {
    const baseUrl = trimCliValue(options.baseUrl) ?? ''
    validateBaseUrl(baseUrl, rules.allowEmptyBaseUrl)
    updates.baseUrl = baseUrl
  }

  if (options.apiKey !== undefined) {
    const apiKey = options.apiKey.trim()
    validateApiKey(apiKey, rules.allowEmptyApiKey)
    updates.apiKey = apiKey
  }

  return {
    nonInteractive,
    updates,
  }
}

export async function confirmProviderRemoval(
  providerName: string,
  options: ProviderRemoveCommandOptions = {}
): Promise<boolean> {
  if (options.yes) {
    return true
  }

  return promptConfirm(`确定删除 "${providerName}"?`, false)
}

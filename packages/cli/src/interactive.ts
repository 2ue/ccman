/**
 * 交互式菜单模块
 *
 * 提供交互入口：
 * - startMainMenu(): 主菜单（ccman）
 * - startClaudeMenu(): Claude 菜单（ccman cc）
 * - startCodexMenu(): Codex 菜单（ccman cx）
 * - startGeminiMenu(): Gemini 菜单（ccman gm）
 * - startOpenCodeMenu(): OpenCode 菜单（ccman oc）
 * - startOpenClawMenu(): OpenClaw 菜单（ccman openclaw / ccman ow）
 */

import inquirer from 'inquirer'
import chalk from 'chalk'
import {
  createCodexManager,
  createClaudeManager,
  createGeminiManager,
  createOpenCodeManager,
  createOpenClawManager,
  TOOL_TYPES,
  type ToolType,
  type ToolManager,
} from '@ccman/core'
import { formatProviderTable } from './utils/format.js'
import { promptConfirm } from './utils/confirm.js'
import { toolBadge } from './utils/cli-theme.js'
import { printSuccess, printInfo, printWarning, printTip } from './utils/cli-output.js'

// CLI 专用配置（命令缩写和显示名）
const CLI_TOOL_CONFIG = {
  [TOOL_TYPES.CODEX]: { name: 'Codex', emoji: '🔶', cmd: 'cx' },
  [TOOL_TYPES.CLAUDE]: { name: 'Claude', emoji: '🔷', cmd: 'cc' },
  [TOOL_TYPES.GEMINI]: { name: 'Gemini', emoji: '💎', cmd: 'gm' },
  [TOOL_TYPES.OPENCODE]: { name: 'OpenCode', emoji: '🧩', cmd: 'oc' },
  [TOOL_TYPES.OPENCLAW]: { name: 'OpenClaw', emoji: '🦀', cmd: 'ow' },
} as const

type CliToolType = Exclude<ToolType, 'mcp'>

/**
 * 根据工具类型创建对应的 manager
 */
function getManager(tool: CliToolType): ToolManager {
  switch (tool) {
    case TOOL_TYPES.CODEX:
      return createCodexManager()
    case TOOL_TYPES.CLAUDE:
      return createClaudeManager()
    case TOOL_TYPES.GEMINI:
      return createGeminiManager()
    case TOOL_TYPES.OPENCODE:
      return createOpenCodeManager()
    case TOOL_TYPES.OPENCLAW:
      return createOpenClawManager()
  }
}

// ============================================================================
// 通用表单函数
// ============================================================================

/**
 * 交互式提示用户输入服务商信息
 *
 * @param defaults - 可选的默认值（用于 clone 或从预设添加）
 * @returns 用户输入的服务商信息
 */
export async function promptProviderForm(defaults?: {
  name?: string
  desc?: string
  baseUrl?: string
  apiKey?: string
}): Promise<{
  name: string
  desc?: string
  baseUrl: string
  apiKey: string
}> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '服务商名称:',
      default: defaults?.name || undefined,
      validate: (value) => {
        if (!value?.trim()) return '名称不能为空'
        return true
      },
    },
    {
      type: 'input',
      name: 'desc',
      message: '描述(可选):',
      default: defaults?.desc || undefined,
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'API 地址:',
      default: defaults?.baseUrl || undefined,
      validate: (value) => {
        const trimmed = value?.trim()
        if (!trimmed) return 'API 地址不能为空'
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          return 'API 地址必须以 http:// 或 https:// 开头'
        }
        return true
      },
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'API 密钥:',
      default: defaults?.apiKey || undefined,
      mask: '*',
      validate: (value) => {
        if (!value?.trim()) return 'API 密钥不能为空'
        return true
      },
    },
  ])

  return {
    name: answers.name.trim(),
    desc: answers.desc?.trim() || undefined,
    baseUrl: answers.baseUrl.trim(),
    apiKey: answers.apiKey.trim(),
  }
}

// ============================================================================
// 主菜单
// ============================================================================

/**
 * 主菜单 - ccman 入口
 */
export async function startMainMenu(): Promise<void> {
  // 主菜单需要循环,直到用户选择退出
  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log()
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: '请选择操作:',
        choices: [
          { name: '🔷 Claude 管理', value: 'claude' },
          { name: '🔶 Codex 管理', value: 'codex' },
          { name: '💎 Gemini 管理', value: 'gemini' },
          { name: '🧩 OpenCode 管理', value: 'opencode' },
          { name: '🦀 OpenClaw 管理', value: 'openclaw' },
          { name: '🔄 WebDAV 同步', value: 'sync' },
          { name: '📦 预置服务商管理', value: 'presets' },
          { name: '❌ 退出', value: 'exit' },
        ],
      },
    ])

    if (choice === 'exit') {
      console.log(chalk.gray('\n👋 再见!\n'))
      break
    }

    if (choice === 'claude') {
      await startClaudeMenu()
    } else if (choice === 'codex') {
      await startCodexMenu()
    } else if (choice === 'gemini') {
      await startGeminiMenu()
    } else if (choice === 'opencode') {
      await startOpenCodeMenu()
    } else if (choice === 'openclaw') {
      await startOpenClawMenu()
    } else if (choice === 'sync') {
      const { startSyncMenu } = await import('./commands/sync/index.js')
      await startSyncMenu()
    } else if (choice === 'presets') {
      await showPresetsMenu()
    }
  }
}

// ============================================================================
// Claude 菜单
// ============================================================================

/**
 * Claude 菜单 - ccman cc 入口
 */
export async function startClaudeMenu(): Promise<void> {
  await showToolMenu(TOOL_TYPES.CLAUDE)
}

// ============================================================================
// Codex 菜单
// ============================================================================

/**
 * Codex 菜单 - ccman cx 入口
 */
export async function startCodexMenu(): Promise<void> {
  await showToolMenu(TOOL_TYPES.CODEX)
}

// ============================================================================
// Gemini 菜单
// ============================================================================

/**
 * Gemini 菜单 - ccman gm 入口
 */
export async function startGeminiMenu(): Promise<void> {
  await showToolMenu(TOOL_TYPES.GEMINI)
}

// ============================================================================
// OpenCode 菜单
// ============================================================================

/**
 * OpenCode 菜单 - ccman oc 入口
 */
export async function startOpenCodeMenu(): Promise<void> {
  await showToolMenu(TOOL_TYPES.OPENCODE)
}

// ============================================================================
// OpenClaw 菜单
// ============================================================================

/**
 * OpenClaw 菜单 - ccman openclaw / ccman ow 入口
 */
export async function startOpenClawMenu(): Promise<void> {
  await showToolMenu(TOOL_TYPES.OPENCLAW)
}

// ============================================================================
// 工具菜单（通用）
// ============================================================================

async function showToolMenu(tool: CliToolType): Promise<void> {
  const { name: toolDisplayName, emoji } = CLI_TOOL_CONFIG[tool]

  // 交互式菜单需要一个无限循环,直到用户选择返回
  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log()
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: `${emoji} ${toolDisplayName} 操作:`,
        choices: [
          { name: '➕ 添加服务商', value: 'add' },
          { name: '🔄 切换服务商', value: 'switch' },
          { name: '📋 列出所有服务商', value: 'list' },
          { name: '👁️  查看当前服务商', value: 'current' },
          { name: '✏️  编辑服务商', value: 'edit' },
          { name: '🔁 克隆服务商', value: 'clone' },
          { name: '🗑️  删除服务商', value: 'remove' },
          { name: '⬅️  返回上级', value: 'back' },
        ],
      },
    ])

    if (action === 'back') {
      break
    }

    try {
      switch (action) {
        case 'add':
          await handleAdd(tool)
          break
        case 'switch':
          await handleSwitch(tool)
          break
        case 'list':
          await handleList(tool)
          break
        case 'current':
          await handleCurrent(tool)
          break
        case 'edit':
          await handleEdit(tool)
          break
        case 'clone':
          await handleClone(tool)
          break
        case 'remove':
          await handleRemove(tool)
          break
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
    }

    // 操作完成后暂停，等待用户按回车继续
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: '按回车继续...',
      },
    ])
  }
}

// ============================================================================
// 预置服务商菜单
// ============================================================================

async function showPresetsMenu(): Promise<void> {
  console.log(chalk.yellow('\n⚠️  预置服务商管理功能即将推出\n'))
}

// ============================================================================
// 操作处理函数
// ============================================================================

async function handleAdd(tool: CliToolType): Promise<void> {
  const manager = getManager(tool)
  const presets = manager.listPresets()

  const { name: toolName, cmd } = CLI_TOOL_CONFIG[tool]
  console.log(chalk.bold(`\n📝 添加 ${toolName} 服务商\n`))

  // 询问是否使用预置
  const { usePreset } = await inquirer.prompt([
    {
      type: 'list',
      name: 'usePreset',
      message: '选择配置来源:',
      choices: [
        { name: '📦 使用预置服务商', value: true },
        { name: '✏️  自定义配置', value: false },
      ],
    },
  ])

  let name: string
  let desc: string | undefined
  let baseUrl: string
  let apiKey: string

  if (usePreset) {
    // 使用预置
    const { presetName } = await inquirer.prompt([
      {
        type: 'list',
        name: 'presetName',
        message: '选择预置服务商:',
        choices: presets.map((p) => ({
          name: `${p.name} - ${p.description}`,
          value: p.name,
        })),
      },
    ])

    const preset = presets.find((p) => p.name === presetName)!

    console.log(chalk.blue(`\n使用预设: ${preset.name} - ${preset.description}\n`))

    // 允许修改所有字段（与命令式和 Desktop 行为一致）
    const input = await promptProviderForm({
      name: preset.name,
      desc: '',
      baseUrl: preset.baseUrl,
      apiKey: '',
    })

    name = input.name
    // 不继承预置描述,使用用户输入的 desc(可能为空)
    desc = input.desc
    baseUrl = input.baseUrl
    apiKey = input.apiKey
  } else {
    // 自定义
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: '服务商名称:',
        validate: (value) => (value ? true : '名称不能为空'),
      },
      {
        type: 'input',
        name: 'baseUrl',
        message: 'API 地址:',
        validate: (value) => {
          if (!value) return 'API 地址不能为空'
          if (!value.startsWith('http://') && !value.startsWith('https://')) {
            return 'API 地址必须以 http:// 或 https:// 开头'
          }
          return true
        },
      },
      {
        type: 'password',
        name: 'apiKey',
        message: 'API 密钥:',
        mask: '*',
        validate: (value) => (value ? true : 'API 密钥不能为空'),
      },
    ])

    name = answers.name
    desc = undefined
    baseUrl = answers.baseUrl
    apiKey = answers.apiKey
  }

  const provider = manager.add({ name, desc, baseUrl, apiKey })

  printSuccess('添加成功', [
    `${chalk.bold(provider.name)} ${toolBadge(tool)}`,
    chalk.gray(provider.baseUrl),
  ])

  // 询问是否切换
  const switchNow = await promptConfirm('是否立即切换到此服务商?', true)

  if (switchNow) {
    manager.switch(provider.id)
    printSuccess('已切换到新服务商')
  } else {
    printTip(`稍后切换: ${chalk.white(`ccman ${cmd} use "${provider.name}"`)}`)
  }
}

async function handleSwitch(tool: CliToolType): Promise<void> {
  const manager = getManager(tool)
  const providers = manager.list()
  const current = manager.getCurrent()

  if (providers.length === 0) {
    printWarning('暂无服务商')
    return
  }

  const { providerId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'providerId',
      message: '选择要切换的服务商:',
      choices: providers.map((p) => ({
        name: `${p.name}${current?.id === p.id ? chalk.green(' (当前)') : ''}`,
        value: p.id,
      })),
    },
  ])

  manager.switch(providerId)
  const provider = providers.find((p) => p.id === providerId)!
  printSuccess('切换成功', [
    `${chalk.bold(provider.name)} ${toolBadge(tool)}`,
    chalk.gray(provider.baseUrl),
  ])
}

async function handleList(tool: CliToolType): Promise<void> {
  const manager = getManager(tool)
  const providers = manager.list()
  const current = manager.getCurrent()
  const { name: tn, cmd } = CLI_TOOL_CONFIG[tool]

  if (providers.length === 0) {
    printWarning(`暂无 ${tn} 服务商`)
    printTip(`添加服务商: ${chalk.white(`ccman ${cmd} add`)}`)
    return
  }

  console.log(formatProviderTable(providers, current?.id, `${tn} 服务商 (${providers.length} 个)`))
}

async function handleCurrent(tool: CliToolType): Promise<void> {
  const manager = getManager(tool)
  const current = manager.getCurrent()
  const { name: tn, cmd } = CLI_TOOL_CONFIG[tool]

  if (!current) {
    printWarning(`未选择任何 ${tn} 服务商`)
    printTip(`选择服务商: ${chalk.white(`ccman ${cmd} use`)}`)
    return
  }

  const lines = [
    chalk.green.bold(current.name),
    chalk.gray(`ID: ${current.id}`),
    chalk.gray(`URL: ${current.baseUrl || '(默认端点)'}`),
  ]
  if (current.lastUsedAt) {
    lines.push(chalk.gray(`最后使用: ${new Date(current.lastUsedAt).toLocaleString('zh-CN')}`))
  }
  printInfo(`📍 当前 ${tn} 服务商`, lines)
}

async function handleEdit(tool: CliToolType): Promise<void> {
  const manager = getManager(tool)
  const providers = manager.list()

  if (providers.length === 0) {
    printWarning('暂无服务商')
    return
  }

  const { providerId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'providerId',
      message: '选择要编辑的服务商:',
      choices: providers.map((p) => ({
        name: p.name,
        value: p.id,
      })),
    },
  ])

  const provider = providers.find((p) => p.id === providerId)!

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '服务商名称:',
      default: provider.name,
      validate: (value) => (value ? true : '名称不能为空'),
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'API 地址:',
      default: provider.baseUrl,
      validate: (value) => {
        if (!value) return 'API 地址不能为空'
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          return 'API 地址必须以 http:// 或 https:// 开头'
        }
        return true
      },
    },
    {
      type: 'input',
      name: 'desc',
      message: '描述(可选):',
      default: provider.desc || '',
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'API 密钥 (留空不修改):',
      mask: '*',
    },
  ])

  manager.edit(providerId, {
    name: answers.name,
    desc: answers.desc || undefined,
    baseUrl: answers.baseUrl,
    apiKey: answers.apiKey || undefined,
  })

  printSuccess('编辑成功')
}

async function handleClone(tool: CliToolType): Promise<void> {
  const manager = getManager(tool)
  const providers = manager.list()

  if (providers.length === 0) {
    printWarning('暂无服务商')
    return
  }

  const { providerId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'providerId',
      message: '选择要克隆的服务商:',
      choices: providers.map((p) => ({
        name: p.name,
        value: p.id,
      })),
    },
  ])

  const provider = providers.find((p) => p.id === providerId)!

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '新服务商名称:',
      default: `${provider.name}（副本）`,
      validate: (value) => (value ? true : '名称不能为空'),
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'API 密钥:',
      mask: '*',
      validate: (value) => (value ? true : 'API 密钥不能为空'),
    },
  ])

  const newProvider = manager.add({
    name: answers.name,
    // 克隆时不继承描述,留空让用户后续编辑
    desc: undefined,
    baseUrl: provider.baseUrl,
    apiKey: answers.apiKey,
  })

  printSuccess('克隆成功', [chalk.bold(newProvider.name), chalk.gray(newProvider.baseUrl)])
}

async function handleRemove(tool: CliToolType): Promise<void> {
  const manager = getManager(tool)
  const providers = manager.list()

  if (providers.length === 0) {
    printWarning('暂无服务商')
    return
  }

  const { providerId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'providerId',
      message: '选择要删除的服务商:',
      choices: providers.map((p) => ({
        name: p.name,
        value: p.id,
      })),
    },
  ])

  const provider = providers.find((p) => p.id === providerId)!

  const confirm = await promptConfirm(`确定要删除 "${provider.name}" 吗?`, false)

  if (confirm) {
    manager.remove(providerId)
    printSuccess(`已删除: ${provider.name}`)
  } else {
    console.log(chalk.gray('\n❌ 已取消\n'))
  }
}

/**
 * 交互式菜单模块
 *
 * 提供三种入口：
 * - startMainMenu(): 主菜单（ccman）
 * - startClaudeMenu(): Claude 菜单（ccman cc）
 * - startCodexMenu(): Codex 菜单（ccman cx）
 */

import inquirer from 'inquirer'
import chalk from 'chalk'
import { createCodexManager, createClaudeManager } from '@ccman/core'

type ToolType = 'codex' | 'claude'

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
  baseUrl?: string
  apiKey?: string
}): Promise<{
  name: string
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
        if (!value) return '名称不能为空'
        return true
      },
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'API 地址:',
      default: defaults?.baseUrl || undefined,
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
      default: defaults?.apiKey || undefined,
      mask: '*',
      validate: (value) => {
        if (!value) return 'API 密钥不能为空'
        return true
      },
    },
  ])

  return {
    name: answers.name,
    baseUrl: answers.baseUrl,
    apiKey: answers.apiKey,
  }
}

interface MenuItem {
  name: string
  value: string
}

// ============================================================================
// 主菜单
// ============================================================================

/**
 * 主菜单 - ccman 入口
 */
export async function startMainMenu(): Promise<void> {
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
  await showToolMenu('claude')
}

// ============================================================================
// Codex 菜单
// ============================================================================

/**
 * Codex 菜单 - ccman cx 入口
 */
export async function startCodexMenu(): Promise<void> {
  await showToolMenu('codex')
}

// ============================================================================
// 工具菜单（通用）
// ============================================================================

async function showToolMenu(tool: ToolType): Promise<void> {
  const toolName = tool === 'claude' ? 'Claude' : 'Codex'
  const toolEmoji = tool === 'claude' ? '🔷' : '🔶'

  while (true) {
    console.log()
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: `${toolEmoji} ${toolName} 操作:`,
        choices: [
          { name: '➕ 添加服务商', value: 'add' },
          { name: '🔄 切换服务商', value: 'switch' },
          { name: '📋 列出所有服务商', value: 'list' },
          { name: '👁️  查看当前服务商', value: 'current' },
          { name: '✏️  编辑服务商', value: 'edit' },
          { name: '📋 克隆服务商', value: 'clone' },
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

async function handleAdd(tool: ToolType): Promise<void> {
  const manager = tool === 'codex' ? createCodexManager() : createClaudeManager()
  const toolName = tool === 'claude' ? 'Claude' : 'Codex'
  const presets = manager.listPresets()

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

    const { inputApiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'inputApiKey',
        message: '输入 API 密钥:',
        mask: '*',
        validate: (value) => (value ? true : 'API 密钥不能为空'),
      },
    ])

    name = preset.name
    baseUrl = preset.baseUrl
    apiKey = inputApiKey
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
    baseUrl = answers.baseUrl
    apiKey = answers.apiKey
  }

  const provider = manager.add({ name, baseUrl, apiKey })

  console.log()
  console.log(chalk.green('✅ 添加成功'))
  console.log()
  console.log(`  ${chalk.bold(provider.name)} ${chalk.blue(`[${toolName}]`)}`)
  console.log(`  ${chalk.gray(`ID: ${provider.id}`)}`)
  console.log(`  ${chalk.gray(`URL: ${provider.baseUrl}`)}`)
  console.log()

  // 询问是否切换
  const { switchNow } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'switchNow',
      message: '是否立即切换到此服务商?',
      default: true,
    },
  ])

  if (switchNow) {
    manager.switch(provider.id)
    console.log(chalk.green('✅ 已切换到新服务商\n'))
  } else {
    console.log(chalk.blue('💡 稍后切换:') + chalk.white(` ccman ${tool === 'codex' ? 'cx' : 'cc'} use "${provider.name}"\n`))
  }
}

async function handleSwitch(tool: ToolType): Promise<void> {
  const manager = tool === 'codex' ? createCodexManager() : createClaudeManager()
  const providers = manager.list()
  const current = manager.getCurrent()

  if (providers.length === 0) {
    console.log(chalk.yellow('\n⚠️  暂无服务商\n'))
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
  console.log(chalk.green(`\n✅ 已切换到: ${provider.name}\n`))
}

async function handleList(tool: ToolType): Promise<void> {
  const manager = tool === 'codex' ? createCodexManager() : createClaudeManager()
  const providers = manager.list()
  const current = manager.getCurrent()
  const toolName = tool === 'claude' ? 'Claude' : 'Codex'

  if (providers.length === 0) {
    console.log(chalk.yellow(`\n⚠️  暂无 ${toolName} 服务商\n`))
    return
  }

  console.log(chalk.bold(`\n📋 ${toolName} 服务商列表 (共 ${providers.length} 个)\n`))

  providers.forEach((p) => {
    const isCurrent = current?.id === p.id
    const marker = isCurrent ? chalk.green('●') : chalk.gray('○')
    const nameStyle = isCurrent ? chalk.green.bold : chalk.white

    console.log(`${marker} ${nameStyle(p.name)}`)
    console.log(`  ${chalk.gray(`ID: ${p.id}`)}`)
    console.log(`  ${chalk.gray(`URL: ${p.baseUrl}`)}`)

    if (p.lastUsedAt) {
      const date = new Date(p.lastUsedAt).toLocaleString('zh-CN')
      console.log(`  ${chalk.gray(`最后使用: ${date}`)}`)
    }

    console.log()
  })

  if (current) {
    console.log(chalk.green(`✅ 当前使用: ${current.name}\n`))
  } else {
    console.log(chalk.yellow('⚠️  未选择任何服务商\n'))
  }
}

async function handleCurrent(tool: ToolType): Promise<void> {
  const manager = tool === 'codex' ? createCodexManager() : createClaudeManager()
  const current = manager.getCurrent()
  const toolName = tool === 'claude' ? 'Claude' : 'Codex'

  if (!current) {
    console.log(chalk.yellow(`\n⚠️  未选择任何 ${toolName} 服务商\n`))
    return
  }

  console.log(chalk.bold(`\n👁️  当前 ${toolName} 服务商\n`))
  console.log(`  ${chalk.green.bold(current.name)}`)
  console.log(`  ${chalk.gray(`ID: ${current.id}`)}`)
  console.log(`  ${chalk.gray(`URL: ${current.baseUrl}`)}`)

  if (current.lastUsedAt) {
    const date = new Date(current.lastUsedAt).toLocaleString('zh-CN')
    console.log(`  ${chalk.gray(`最后使用: ${date}`)}`)
  }

  console.log()
}

async function handleEdit(tool: ToolType): Promise<void> {
  const manager = tool === 'codex' ? createCodexManager() : createClaudeManager()
  const providers = manager.list()

  if (providers.length === 0) {
    console.log(chalk.yellow('\n⚠️  暂无服务商\n'))
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
      type: 'password',
      name: 'apiKey',
      message: 'API 密钥 (留空不修改):',
      mask: '*',
    },
  ])

  manager.edit(providerId, {
    name: answers.name,
    baseUrl: answers.baseUrl,
    apiKey: answers.apiKey || undefined,
  })

  console.log(chalk.green('\n✅ 编辑成功\n'))
}

async function handleClone(tool: ToolType): Promise<void> {
  const manager = tool === 'codex' ? createCodexManager() : createClaudeManager()
  const providers = manager.list()

  if (providers.length === 0) {
    console.log(chalk.yellow('\n⚠️  暂无服务商\n'))
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
    baseUrl: provider.baseUrl,
    apiKey: answers.apiKey,
  })

  console.log(chalk.green('\n✅ 克隆成功\n'))
  console.log(`  ${chalk.bold(newProvider.name)}`)
  console.log(`  ${chalk.gray(`ID: ${newProvider.id}`)}`)
  console.log()
}

async function handleRemove(tool: ToolType): Promise<void> {
  const manager = tool === 'codex' ? createCodexManager() : createClaudeManager()
  const providers = manager.list()

  if (providers.length === 0) {
    console.log(chalk.yellow('\n⚠️  暂无服务商\n'))
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

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `确定要删除 "${provider.name}" 吗?`,
      default: false,
    },
  ])

  if (confirm) {
    manager.remove(providerId)
    console.log(chalk.green(`\n✅ 已删除: ${provider.name}\n`))
  } else {
    console.log(chalk.gray('\n❌ 已取消\n'))
  }
}

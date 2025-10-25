/**
 * Sync 命令辅助函数
 */

import inquirer from 'inquirer'
import chalk from 'chalk'
import { Command } from 'commander'
import type { SyncConfig } from '@ccman/core'
import { loadSyncConfig } from '../../utils/sync-config.js'

/**
 * 检查 WebDAV 配置是否存在，如果不存在则询问用户是否配置
 *
 * @returns 配置对象，如果用户选择不配置则返回 null
 */
export async function ensureConfigExists(): Promise<SyncConfig | null> {
  const config = loadSyncConfig()

  if (config) {
    return config
  }

  // 未找到配置，询问用户
  console.log(chalk.yellow('\n⚠️  未找到 WebDAV 配置\n'))

  const { shouldConfig } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldConfig',
      message: '是否现在配置 WebDAV?',
      default: true,
    },
  ])

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

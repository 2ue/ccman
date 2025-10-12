import { Command } from 'commander'
import inquirer from 'inquirer'
import chalk from 'chalk'
import { configCommand } from './config.js'
import { testCommand } from './test.js'
import { uploadCommand } from './upload.js'
import { downloadCommand } from './download.js'
import { mergeCommand } from './merge.js'
import { statusCommand } from './status.js'

/**
 * 创建 sync 所有子命令
 */
export function createSyncCommands(program: Command): void {
  configCommand(program)
  testCommand(program)
  uploadCommand(program)
  downloadCommand(program)
  mergeCommand(program)
  statusCommand(program)
}

/**
 * 交互式同步菜单
 */
export async function startSyncMenu(): Promise<void> {
  while (true) {
    console.log()
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '🔄 同步操作:',
        choices: [
          { name: '⚙️  配置 WebDAV 连接', value: 'config' },
          { name: '🔍 测试连接', value: 'test' },
          { name: '📤 上传到云端', value: 'upload' },
          { name: '📥 从云端下载', value: 'download' },
          { name: '🔄 智能合并', value: 'merge' },
          { name: '📊 查看同步状态', value: 'status' },
          { name: '⬅️  返回主菜单', value: 'back' },
        ],
      },
    ])

    if (action === 'back') {
      break
    }

    try {
      // 动态导入并执行命令
      switch (action) {
        case 'config': {
          const { configCommand } = await import('./config.js')
          const cmd = new Command()
          configCommand(cmd)
          await cmd.parseAsync(['node', 'ccman', 'config'])
          break
        }
        case 'test': {
          const { testCommand } = await import('./test.js')
          const cmd = new Command()
          testCommand(cmd)
          await cmd.parseAsync(['node', 'ccman', 'test'])
          break
        }
        case 'upload': {
          const { uploadCommand } = await import('./upload.js')
          const cmd = new Command()
          uploadCommand(cmd)
          await cmd.parseAsync(['node', 'ccman', 'upload'])
          break
        }
        case 'download': {
          const { downloadCommand } = await import('./download.js')
          const cmd = new Command()
          downloadCommand(cmd)
          await cmd.parseAsync(['node', 'ccman', 'download'])
          break
        }
        case 'merge': {
          const { mergeCommand } = await import('./merge.js')
          const cmd = new Command()
          mergeCommand(cmd)
          await cmd.parseAsync(['node', 'ccman', 'merge'])
          break
        }
        case 'status': {
          const { statusCommand } = await import('./status.js')
          const cmd = new Command()
          statusCommand(cmd)
          await cmd.parseAsync(['node', 'ccman', 'status'])
          break
        }
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

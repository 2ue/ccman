import { Command } from 'commander'
import chalk from 'chalk'
import { createClaudeManager } from '@ccman/core'
import { printInfo, printTip, printWarning } from '../../utils/cli-output.js'

export function currentCommand(program: Command): void {
  program
    .command('current')
    .description('显示当前使用的 Claude Code 服务商')
    .action(async () => {
      try {
        const manager = createClaudeManager()
        const current = manager.getCurrent()

        if (!current) {
          printWarning('未选择任何 Claude Code 服务商')
          printTip('选择服务商: ' + chalk.white('ccman cc use'))
          return
        }

        const lines = [
          chalk.green.bold(current.name),
          chalk.gray(`ID: ${current.id}`),
          chalk.gray(`URL: ${current.baseUrl}`),
        ]
        if (current.lastUsedAt) {
          lines.push(
            chalk.gray(`最后使用: ${new Date(current.lastUsedAt).toLocaleString('zh-CN')}`)
          )
        }
        printInfo('📍 当前 Claude Code 服务商', lines)
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

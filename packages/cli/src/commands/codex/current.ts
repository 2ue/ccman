import { Command } from 'commander'
import chalk from 'chalk'
import { createCodexManager } from '@ccman/core'
import { printInfo, printWarning } from '../../utils/cli-output.js'

export function currentCommand(program: Command): void {
  program
    .command('current')
    .description('显示当前使用的 Codex 服务商')
    .action(async () => {
      try {
        const manager = createCodexManager()
        const current = manager.getCurrent()

        if (!current) {
          printWarning('未选择任何 Codex 服务商')
          return
        }

        const lines = [chalk.green.bold(current.name), chalk.gray(`URL: ${current.baseUrl}`)]
        if (current.lastUsedAt) {
          lines.push(
            chalk.gray(`最后使用: ${new Date(current.lastUsedAt).toLocaleString('zh-CN')}`)
          )
        }
        printInfo('📍 当前 Codex 服务商', lines)
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

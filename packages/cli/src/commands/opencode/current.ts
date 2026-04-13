import { Command } from 'commander'
import chalk from 'chalk'
import { createOpenCodeManager } from '@ccman/core'
import { printInfo, printWarning } from '../../utils/cli-output.js'

export function currentCommand(program: Command): void {
  program
    .command('current')
    .description('显示当前 OpenCode 服务商')
    .action(async () => {
      try {
        const manager = createOpenCodeManager()
        const current = manager.getCurrent()

        if (!current) {
          printWarning('未选择任何 OpenCode 服务商')
          return
        }

        printInfo('📍 当前 OpenCode 服务商', [
          chalk.green.bold(current.name),
          chalk.gray(`URL: ${current.baseUrl}`),
        ])
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

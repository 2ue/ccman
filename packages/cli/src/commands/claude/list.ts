import { Command } from 'commander'
import chalk from 'chalk'
import { createClaudeManager } from '@ccman/core'
import { formatProviderTable } from '../../utils/format.js'
import { printWarning, printTip } from '../../utils/cli-output.js'

export function listCommand(program: Command): void {
  program
    .command('list')
    .alias('ls')
    .description('列出所有 Claude Code 服务商')
    .action(async () => {
      try {
        const manager = createClaudeManager()
        const providers = manager.list()
        const current = manager.getCurrent()

        if (providers.length === 0) {
          printWarning('暂无 Claude Code 服务商')
          printTip('添加服务商: ' + chalk.white('ccman cc add'))
          return
        }

        console.log(
          formatProviderTable(providers, current?.id, `Claude Code 服务商 (${providers.length} 个)`)
        )
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

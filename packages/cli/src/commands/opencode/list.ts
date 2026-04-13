import { Command } from 'commander'
import chalk from 'chalk'
import { createOpenCodeManager } from '@ccman/core'
import { formatProviderTable } from '../../utils/format.js'
import { printWarning, printTip } from '../../utils/cli-output.js'

export function listCommand(program: Command): void {
  program
    .command('list')
    .alias('ls')
    .description('列出所有 OpenCode 服务商')
    .action(async () => {
      try {
        const manager = createOpenCodeManager()
        const providers = manager.list()
        const current = manager.getCurrent()

        if (providers.length === 0) {
          printWarning('暂无 OpenCode 服务商')
          printTip('添加服务商: ' + chalk.white('ccman oc add'))
          return
        }

        console.log(
          formatProviderTable(providers, current?.id, `OpenCode 服务商 (${providers.length} 个)`)
        )
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

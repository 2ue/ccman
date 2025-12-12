import { Command } from 'commander'
import chalk from 'chalk'
import { ProviderService } from '@ccman/core'
import { formatProviderTable } from '../../utils/format.js'

export function listCommand(program: Command): void {
  program
    .command('list')
    .alias('ls')
    .description('列出所有 Codex 服务商')
    .action(async () => {
      try {
        const tool = 'codex'
        const providers = ProviderService.list(tool)
        const current = ProviderService.current(tool)

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 Codex 服务商\n'))
          console.log(chalk.blue('💡 添加服务商:') + chalk.white(' ccman cx add\n'))
          return
        }

        console.log(chalk.bold(`\n📋 Codex 服务商 (${providers.length} 个)`))
        console.log(formatProviderTable(providers, current?.id))
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

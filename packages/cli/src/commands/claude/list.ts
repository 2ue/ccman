import { Command } from 'commander'
import chalk from 'chalk'
import { ProviderService } from '@ccman/core'
import { formatProviderTable } from '../../utils/format.js'

export function listCommand(program: Command): void {
  program
    .command('list')
    .alias('ls')
    .description('列出所有 Claude Code 服务商')
    .action(async () => {
      try {
        const tool = 'claude-code'
        const providers = ProviderService.list(tool)
        const current = ProviderService.current(tool)

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 Claude Code 服务商\n'))
          console.log(chalk.blue('💡 添加服务商:') + chalk.white(' ccman cc add\n'))
          return
        }

        console.log(chalk.bold(`\n📋 Claude Code 服务商 (${providers.length} 个)`))
        console.log(formatProviderTable(providers, current?.id))
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

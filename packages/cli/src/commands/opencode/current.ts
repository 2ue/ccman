import { Command } from 'commander'
import chalk from 'chalk'
import { createOpenCodeManager } from '@ccman/core'

export function currentCommand(program: Command): void {
  program
    .command('current')
    .description('显示当前 OpenCode 服务商')
    .action(async () => {
      try {
        const manager = createOpenCodeManager()
        const current = manager.getCurrent()

        if (!current) {
          console.log(chalk.yellow('\n⚠️  当前没有激活的 OpenCode 服务商\n'))
          console.log(chalk.blue('💡 列出服务商:') + chalk.white(' ccman oc list\n'))
          return
        }

        console.log(chalk.bold('\n🎯 当前 OpenCode 服务商\n'))
        console.log(`  名称: ${chalk.bold(current.name)}`)
        console.log(`  地址: ${chalk.gray(current.baseUrl)}`)
        console.log()
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

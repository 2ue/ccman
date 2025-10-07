import { Command } from 'commander'
import chalk from 'chalk'
import { createCodexManager } from '@ccman/core'

export function currentCommand(program: Command): void {
  program
    .command('current')
    .description('显示当前使用的 Codex 服务商')
    .action(async () => {
      try {
        const manager = createCodexManager()
        const current = manager.getCurrent()

        if (!current) {
          console.log(chalk.yellow('\n⚠️  未选择任何 Codex 服务商\n'))
          console.log(chalk.blue('💡 选择服务商:') + chalk.white(' ccman cx use\n'))
          return
        }

        console.log(chalk.bold('\n📍 当前 Codex 服务商\n'))
        console.log(`  ${chalk.green.bold(current.name)}`)
        console.log(`  ${chalk.gray(`ID: ${current.id}`)}`)
        console.log(`  ${chalk.gray(`URL: ${current.baseUrl}`)}`)

        if (current.lastUsedAt) {
          const date = new Date(current.lastUsedAt).toLocaleString('zh-CN')
          console.log(`  ${chalk.gray(`最后使用: ${date}`)}`)
        }

        console.log()
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

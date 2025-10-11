import { Command } from 'commander'
import chalk from 'chalk'
import { createClaudeManager } from '@ccman/core'

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
          console.log(chalk.yellow('\n⚠️  暂无 Claude Code 服务商\n'))
          console.log(chalk.blue('💡 添加服务商:') + chalk.white(' ccman cc add\n'))
          return
        }

        console.log(chalk.bold(`\n📋 Claude Code 服务商列表 (共 ${providers.length} 个)\n`))

        providers.forEach((p) => {
          const isCurrent = current?.id === p.id
          const marker = isCurrent ? chalk.green('●') : chalk.gray('○')
          const nameStyle = isCurrent ? chalk.green.bold : chalk.white

          console.log(`${marker} ${nameStyle(p.name)}`)
          console.log(`  ${chalk.gray(p.baseUrl)}`)

          if (p.lastUsedAt) {
            const date = new Date(p.lastUsedAt).toLocaleString('zh-CN')
            console.log(`  ${chalk.gray(`最后使用: ${date}`)}`)
          }

          console.log()
        })

        if (current) {
          console.log(chalk.green(`✅ 当前使用: ${current.name}\n`))
        } else {
          console.log(chalk.yellow('⚠️  未选择任何服务商\n'))
        }
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

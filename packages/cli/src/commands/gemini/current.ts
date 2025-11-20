import { Command } from 'commander'
import chalk from 'chalk'
import { createGeminiManager } from '@ccman/core'

export function currentCommand(program: Command): void {
  program
    .command('current')
    .description('显示当前 Gemini CLI 服务商')
    .action(async () => {
      try {
        const manager = createGeminiManager()
        const current = manager.getCurrent()

        if (!current) {
          console.log(chalk.yellow('\n⚠️  当前没有激活的 Gemini CLI 服务商\n'))
          console.log(chalk.blue('💡 列出服务商:') + chalk.white(' ccman gm list\n'))
          return
        }

        console.log(chalk.bold('\n🎯 当前 Gemini CLI 服务商\n'))
        console.log(`  名称: ${chalk.bold(current.name)}`)
        console.log(`  地址: ${chalk.gray(current.baseUrl || '(默认端点)')}`)
        console.log()
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}


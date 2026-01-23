import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createOpenCodeManager, getOpenCodeConfigPath, ProviderNotFoundError } from '@ccman/core'

export function useCommand(program: Command): void {
  program
    .command('use [name]')
    .description('切换 OpenCode 服务商')
    .action(async (name?: string) => {
      try {
        const manager = createOpenCodeManager()
        const providers = manager.list()

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 OpenCode 服务商\n'))
          console.log(chalk.blue('💡 添加服务商:') + chalk.white(' ccman oc add\n'))
          return
        }

        let targetId: string

        if (name) {
          const provider = manager.findByName(name)
          if (!provider) {
            throw new ProviderNotFoundError(name)
          }
          targetId = provider.id
        } else {
          const { selectedId } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedId',
              message: '选择要切换的服务商:',
              choices: providers.map((p) => ({
                name: `${p.name} - ${p.baseUrl}`,
                value: p.id,
              })),
            },
          ])
          targetId = selectedId
        }

        manager.switch(targetId)

        const provider = manager.get(targetId)

        console.log(chalk.green('\n✅ 切换成功\n'))
        console.log(`  ${chalk.bold(provider.name)} ${chalk.blue('[OpenCode]')}`)
        console.log(`  ${chalk.gray(`URL: ${provider.baseUrl}`)}`)
        console.log()
        console.log(chalk.gray('配置已更新:'))
        console.log(chalk.gray(`  - ${getOpenCodeConfigPath()}`))
      } catch (error) {
        if (error instanceof ProviderNotFoundError) {
          console.error(chalk.red(`\n❌ 服务商不存在: ${name}\n`))
        } else {
          console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        }
        process.exit(1)
      }
    })
}

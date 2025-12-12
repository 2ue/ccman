import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { ProviderService, ProviderNotFoundError } from '@ccman/core'

export function removeCommand(program: Command): void {
  program
    .command('remove [name]')
    .alias('rm')
    .description('删除 Codex 服务商')
    .action(async (name?: string) => {
      try {
        const tool = 'codex'
        const providers = ProviderService.list(tool)

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 Codex 服务商\n'))
          return
        }

        let targetName: string

        if (name) {
          // 通过名称查找
          try {
            const provider = ProviderService.get(tool, name)
            targetName = provider.name
          } catch (error) {
            throw new ProviderNotFoundError(tool, name)
          }
        } else {
          // 交互式选择
          const { selectedName } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedName',
              message: '选择要删除的服务商:',
              choices: providers.map((p) => ({
                name: `${p.name} - ${p.baseUrl}`,
                value: p.name,
              })),
            },
          ])
          targetName = selectedName
        }

        // 确认删除
        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `确定删除 "${targetName}"?`,
            default: false,
          },
        ])

        if (!confirmed) {
          console.log(chalk.gray('\n已取消\n'))
          return
        }

        ProviderService.delete(tool, targetName)

        console.log()
        console.log(chalk.green(`✅ 已删除: ${targetName}`))
        console.log()
      } catch (error) {
        if (error instanceof ProviderNotFoundError) {
          console.error(chalk.red(`\n❌ 服务商不存在\n`))
          console.log(chalk.blue('💡 查看所有服务商:') + chalk.white(' ccman cx list\n'))
        } else {
          console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        }
        process.exit(1)
      }
    })
}

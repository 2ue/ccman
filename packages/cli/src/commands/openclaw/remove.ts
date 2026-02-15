import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createOpenClawManager, ProviderNotFoundError } from '@ccman/core'

export function removeCommand(program: Command): void {
  program
    .command('remove [name]')
    .alias('rm')
    .description('删除 OpenClaw 服务商')
    .action(async (name?: string) => {
      try {
        const manager = createOpenClawManager()
        const providers = manager.list()

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 OpenClaw 服务商\n'))
          return
        }

        let targetId: string
        let targetName: string

        if (name) {
          const provider = manager.findByName(name)
          if (!provider) {
            throw new ProviderNotFoundError(name)
          }
          targetId = provider.id
          targetName = provider.name
        } else {
          const { selectedId } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedId',
              message: '选择要删除的服务商:',
              choices: providers.map((p) => ({
                name: `${p.name} - ${p.baseUrl}`,
                value: p.id,
              })),
            },
          ])
          const provider = manager.get(selectedId)
          targetId = selectedId
          targetName = provider.name
        }

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

        manager.remove(targetId)
        console.log(chalk.green(`\n✅ 已删除: ${targetName}\n`))
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

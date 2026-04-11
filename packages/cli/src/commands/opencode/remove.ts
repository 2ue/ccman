import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createOpenCodeManager, ProviderNotFoundError } from '@ccman/core'
import {
  addProviderRemoveOptions,
  confirmProviderRemoval,
  type ProviderRemoveCommandOptions,
} from '../../utils/provider-params.js'

export function removeCommand(program: Command): void {
  const command = program.command('remove [name]').alias('rm').description('删除 OpenCode 服务商')
  addProviderRemoveOptions(command)

  command.action(async (name: string | undefined, options: ProviderRemoveCommandOptions) => {
    try {
      const manager = createOpenCodeManager()
      const providers = manager.list()

      if (providers.length === 0) {
        console.log(chalk.yellow('\n⚠️  暂无 OpenCode 服务商\n'))
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
      } else if (options.yes) {
        throw new Error('非交互模式请提供要删除的服务商名称')
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

      const confirmed = await confirmProviderRemoval(targetName, options)

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

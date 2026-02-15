import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createOpenClawManager, ProviderNotFoundError } from '@ccman/core'
import { promptProviderForm } from '../../interactive.js'

export function editCommand(program: Command): void {
  program
    .command('edit [name]')
    .description('编辑 OpenClaw 服务商')
    .action(async (name?: string) => {
      try {
        const manager = createOpenClawManager()
        const providers = manager.list()

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 OpenClaw 服务商\n'))
          console.log(chalk.blue('💡 添加服务商:') + chalk.white(' ccman openclaw add\n'))
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
              message: '选择要编辑的服务商:',
              choices: providers.map((p) => ({
                name: `${p.name} - ${p.baseUrl}`,
                value: p.id,
              })),
            },
          ])
          targetId = selectedId
        }

        const provider = manager.get(targetId)

        const input = await promptProviderForm({
          name: provider.name,
          desc: provider.desc ?? '',
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
        })

        manager.edit(targetId, {
          name: input.name,
          desc: input.desc,
          baseUrl: input.baseUrl,
          apiKey: input.apiKey,
        })

        console.log(chalk.green('\n✅ 编辑成功\n'))
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

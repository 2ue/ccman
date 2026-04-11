import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createOpenCodeManager, ProviderNotFoundError } from '@ccman/core'
import { promptProviderForm } from '../../interactive.js'
import {
  addProviderEditOptions,
  resolveProviderEditInput,
  type ProviderEditCommandOptions,
} from '../../utils/provider-params.js'

export function editCommand(program: Command): void {
  const command = program.command('edit [name]').description('编辑 OpenCode 服务商')
  addProviderEditOptions(command)

  command.action(async (name: string | undefined, options: ProviderEditCommandOptions) => {
    try {
      const manager = createOpenCodeManager()
      const providers = manager.list()

      if (providers.length === 0) {
        console.log(chalk.yellow('\n⚠️  暂无 OpenCode 服务商\n'))
        console.log(chalk.blue('💡 添加服务商:') + chalk.white(' ccman oc add\n'))
        return
      }

      const resolved = resolveProviderEditInput(options)

      let targetId: string

      if (name) {
        const provider = manager.findByName(name)
        if (!provider) {
          throw new ProviderNotFoundError(name)
        }
        targetId = provider.id
      } else if (resolved.nonInteractive) {
        throw new Error('非交互模式请提供要编辑的服务商名称')
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

      if (resolved.nonInteractive) {
        if (Object.keys(resolved.updates).length === 0) {
          console.log(chalk.gray('\n未做任何修改\n'))
          return
        }

        manager.edit(targetId, resolved.updates)
        console.log(chalk.green('\n✅ 编辑成功\n'))
        return
      }

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

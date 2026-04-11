import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createCodexManager, ProviderNotFoundError } from '@ccman/core'
import {
  addProviderEditOptions,
  resolveProviderEditInput,
  type ProviderEditCommandOptions,
} from '../../utils/provider-params.js'

export function editCommand(program: Command): void {
  const command = program.command('edit [name]').description('编辑 Codex 服务商')
  addProviderEditOptions(command)

  command.action(async (name: string | undefined, options: ProviderEditCommandOptions) => {
    try {
      const manager = createCodexManager()
      const providers = manager.list()

      if (providers.length === 0) {
        console.log(chalk.yellow('\n⚠️  暂无 Codex 服务商\n'))
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
        // 交互式选择
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

        const updated = manager.edit(targetId, resolved.updates)

        console.log()
        console.log(chalk.green('✅ 编辑成功'))
        console.log()
        console.log(`  ${chalk.bold(updated.name)} ${chalk.blue('[Codex]')}`)
        console.log(`  ${chalk.gray(`ID: ${updated.id}`)}`)
        console.log(`  ${chalk.gray(`URL: ${updated.baseUrl}`)}`)
        console.log()
        return
      }

      console.log(chalk.bold('\n✏️  编辑服务商\n'))
      console.log(chalk.gray('提示: 留空则保持原值\n'))

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: '服务商名称:',
          default: provider.name,
        },
        {
          type: 'input',
          name: 'baseUrl',
          message: 'API 地址:',
          default: provider.baseUrl,
          validate: (value) => {
            if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
              return 'API 地址必须以 http:// 或 https:// 开头'
            }
            return true
          },
        },
        {
          type: 'password',
          name: 'apiKey',
          message: 'API 密钥 (留空保持不变):',
          mask: '*',
        },
      ])

      const updates: { name?: string; baseUrl?: string; apiKey?: string } = {}
      if (answers.name && answers.name !== provider.name) updates.name = answers.name
      if (answers.baseUrl && answers.baseUrl !== provider.baseUrl) updates.baseUrl = answers.baseUrl
      if (answers.apiKey) updates.apiKey = answers.apiKey

      if (Object.keys(updates).length === 0) {
        console.log(chalk.gray('\n未做任何修改\n'))
        return
      }

      const updated = manager.edit(targetId, updates)

      console.log()
      console.log(chalk.green('✅ 编辑成功'))
      console.log()
      console.log(`  ${chalk.bold(updated.name)} ${chalk.blue('[Codex]')}`)
      console.log(`  ${chalk.gray(`ID: ${updated.id}`)}`)
      console.log(`  ${chalk.gray(`URL: ${updated.baseUrl}`)}`)
      console.log()
    } catch (error) {
      console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
      process.exit(1)
    }
  })
}

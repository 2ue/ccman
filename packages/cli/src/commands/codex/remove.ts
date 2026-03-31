import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createCodexManager, ProviderNotFoundError } from '@ccman/core'
import { promptConfirm } from '../../utils/confirm.js'

export function removeCommand(program: Command): void {
  program
    .command('remove [name]')
    .alias('rm')
    .description('删除 Codex 服务商')
    .action(async (name?: string) => {
      try {
        const manager = createCodexManager()
        const providers = manager.list()

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 Codex 服务商\n'))
          return
        }

        let targetId: string
        let targetName: string

        if (name) {
          // 通过名称查找
          const provider = manager.findByName(name)
          if (!provider) {
            throw new ProviderNotFoundError(name)
          }
          targetId = provider.id
          targetName = provider.name
        } else {
          // 交互式选择
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

        // 确认删除
        const confirmed = await promptConfirm(`确定删除 "${targetName}"?`, false)

        if (!confirmed) {
          console.log(chalk.gray('\n已取消\n'))
          return
        }

        manager.remove(targetId)

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

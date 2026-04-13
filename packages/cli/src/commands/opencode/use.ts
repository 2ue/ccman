import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createOpenCodeManager, getOpenCodeConfigPath, ProviderNotFoundError } from '@ccman/core'
import { printSuccess, printWarning, printTip } from '../../utils/cli-output.js'
import { toolBadge } from '../../utils/cli-theme.js'

export function useCommand(program: Command): void {
  program
    .command('use [name]')
    .description('切换 OpenCode 服务商')
    .action(async (name?: string) => {
      try {
        const manager = createOpenCodeManager()
        const providers = manager.list()

        if (providers.length === 0) {
          printWarning('暂无 OpenCode 服务商')
          printTip('添加服务商: ' + chalk.white('ccman oc add'))
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

        printSuccess('切换成功', [
          `${chalk.bold(provider.name)} ${toolBadge('opencode')}`,
          chalk.gray(`URL: ${provider.baseUrl}`),
          chalk.gray(`配置已更新: ${getOpenCodeConfigPath()}`),
        ])
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

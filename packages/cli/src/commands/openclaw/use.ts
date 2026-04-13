import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import {
  createOpenClawManager,
  getOpenClawConfigPath,
  getOpenClawModelsPath,
  ProviderNotFoundError,
} from '@ccman/core'
import { printSuccess, printWarning, printTip } from '../../utils/cli-output.js'
import { toolBadge } from '../../utils/cli-theme.js'

export function useCommand(program: Command): void {
  program
    .command('use [name]')
    .description('切换 OpenClaw 服务商')
    .action(async (name?: string) => {
      try {
        const manager = createOpenClawManager()
        const providers = manager.list()

        if (providers.length === 0) {
          printWarning('暂无 OpenClaw 服务商')
          printTip('添加服务商: ' + chalk.white('ccman openclaw add'))
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
          `${chalk.bold(provider.name)} ${toolBadge('openclaw')}`,
          chalk.gray(`URL: ${provider.baseUrl}`),
          chalk.gray(`配置已更新: ${getOpenClawConfigPath()}`),
          chalk.gray(`配置已更新: ${getOpenClawModelsPath()}`),
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

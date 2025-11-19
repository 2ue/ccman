import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import {
  createGeminiManager,
  ProviderNotFoundError,
  getGeminiSettingsPath,
  getGeminiEnvPath,
} from '@ccman/core'

export function useCommand(program: Command): void {
  program
    .command('use [name]')
    .description('切换 Gemini CLI 服务商')
    .action(async (name?: string) => {
      try {
        const manager = createGeminiManager()
        const providers = manager.list()

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 Gemini CLI 服务商\n'))
          console.log(chalk.blue('💡 添加服务商:') + chalk.white(' ccman gm add\n'))
          return
        }

        let targetId: string

        if (name) {
          // 通过名称查找
          const provider = manager.findByName(name)
          if (!provider) {
            throw new ProviderNotFoundError(name)
          }
          targetId = provider.id
        } else {
          // 交互式选择
          const { selectedId } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedId',
              message: '选择要切换的服务商:',
              choices: providers.map((p) => ({
                name: `${p.name} - ${p.baseUrl || '(默认端点)'}`,
                value: p.id,
              })),
            },
          ])
          targetId = selectedId
        }

        manager.switch(targetId)
        const provider = manager.get(targetId)

        console.log()
        console.log(chalk.green('✅ 切换成功'))
        console.log()
        console.log(`  ${chalk.bold(provider.name)} ${chalk.blue('[Gemini CLI]')}`)
        console.log(`  ${chalk.gray(`URL: ${provider.baseUrl || '(默认端点)'}`)}`)
        console.log()
        console.log(chalk.gray('配置已更新:'))
        console.log(chalk.gray(`  - ${getGeminiSettingsPath()}`))
        console.log(chalk.gray(`  - ${getGeminiEnvPath()}`))
        console.log()
      } catch (error) {
        if (error instanceof ProviderNotFoundError) {
          console.error(chalk.red(`\n❌ 服务商不存在: ${(error as Error).message}\n`))
          console.log(chalk.blue('💡 查看所有服务商:') + chalk.white(' ccman gm list\n'))
        } else {
          console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        }
        process.exit(1)
      }
    })
}

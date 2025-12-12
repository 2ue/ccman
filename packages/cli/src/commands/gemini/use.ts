import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import {
  ProviderService,
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
        const tool = 'gemini-cli'
        const providers = ProviderService.list(tool)

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 Gemini CLI 服务商\n'))
          console.log(chalk.blue('💡 添加服务商:') + chalk.white(' ccman gm add\n'))
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
              message: '选择要切换的服务商:',
              choices: providers.map((p) => ({
                name: `${p.name} - ${p.baseUrl || '(默认端点)'}`,
                value: p.name,
              })),
            },
          ])
          targetName = selectedName
        }

        ProviderService.apply(tool, targetName)
        const provider = ProviderService.get(tool, targetName)!

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

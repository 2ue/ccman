import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { ProviderService } from '@ccman/core'

export function removeCommand(program: Command): void {
  program
    .command('remove [name]')
    .alias('rm')
    .description('删除 Gemini CLI 服务商')
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
          const provider = ProviderService.get(tool, name)
          if (!provider) {
            console.log(chalk.red(`\n❌ 服务商不存在: ${name}\n`))
            process.exit(1)
          }
          targetName = provider.name
        } else {
          const { selectedName } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedName',
              message: '选择要删除的服务商:',
              choices: providers.map((p) => ({
                name: `${p.name} - ${p.baseUrl || '(默认端点)'}`,
                value: p.name,
              })),
            },
          ])
          targetName = selectedName
        }

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `确定要删除服务商 "${targetName}" 吗？`,
            default: false,
          },
        ])

        if (!confirm) {
          console.log(chalk.gray('\n已取消删除\n'))
          return
        }

        ProviderService.delete(tool, targetName)
        console.log(chalk.green('\n✅ 已删除服务商\n'))
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

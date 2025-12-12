import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { ProviderService, ProviderNotFoundError } from '@ccman/core'

export function editCommand(program: Command): void {
  program
    .command('edit [name]')
    .description('编辑 Codex 服务商')
    .action(async (name?: string) => {
      try {
        const tool = 'codex'
        const providers = ProviderService.list(tool)

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 Codex 服务商\n'))
          return
        }

        let targetName: string

        if (name) {
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
              message: '选择要编辑的服务商:',
              choices: providers.map((p) => ({
                name: `${p.name} - ${p.baseUrl}`,
                value: p.name,
              })),
            },
          ])
          targetName = selectedName
        }

        const provider = ProviderService.get(tool, targetName)!

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
        if (answers.baseUrl && answers.baseUrl !== provider.baseUrl)
          updates.baseUrl = answers.baseUrl
        if (answers.apiKey) updates.apiKey = answers.apiKey

        if (Object.keys(updates).length === 0) {
          console.log(chalk.gray('\n未做任何修改\n'))
          return
        }

        const updated = ProviderService.update(tool, targetName, updates)

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

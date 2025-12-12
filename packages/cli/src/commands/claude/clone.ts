import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { ProviderService, ProviderNotFoundError } from '@ccman/core'
import { promptProviderForm } from '../../interactive.js'

export function cloneCommand(program: Command): void {
  program
    .command('clone [source-name] [new-name]')
    .description('克隆 Claude Code 服务商')
    .action(async (sourceName?: string, newName?: string) => {
      try {
        const tool = 'claude-code'
        const providers = ProviderService.list(tool)

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 Claude Code 服务商\n'))
          return
        }

        let sourceProviderName: string

        if (sourceName) {
          try {
            const provider = ProviderService.get(tool, sourceName)
            sourceProviderName = provider.name
          } catch (error) {
            throw new ProviderNotFoundError(tool, sourceName)
          }
        } else {
          // 交互式选择源
          const { selectedName } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedName',
              message: '选择要克隆的服务商:',
              choices: providers.map((p) => ({
                name: `${p.name} - ${p.baseUrl}`,
                value: p.name,
              })),
            },
          ])
          sourceProviderName = selectedName
        }

        // 获取源 provider
        const source = ProviderService.get(tool, sourceProviderName)!

        let cloned

        if (newName) {
          // 非交互模式：只改名，其他字段完全复制
          // 注意：desc 字段不会被继承（clone 内部设置为 undefined）
          cloned = ProviderService.clone(tool, sourceProviderName, newName)
        } else {
          // 交互模式：允许修改所有字段
          console.log(chalk.blue(`\n克隆自: ${source.name}\n`))

          const input = await promptProviderForm({
            name: `${source.name}（副本）`,
            // 克隆时不继承描述
            desc: '',
            baseUrl: source.baseUrl,
            apiKey: source.apiKey,
          })

          cloned = ProviderService.add(tool, input)
        }

        console.log()
        console.log(chalk.green('✅ 克隆成功'))
        console.log()
        console.log(`  ${chalk.bold(cloned.name)} ${chalk.blue('[Claude Code]')}`)
        console.log(`  ${chalk.gray(`ID: ${cloned.id}`)}`)
        console.log(`  ${chalk.gray(`URL: ${cloned.baseUrl}`)}`)
        console.log()
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

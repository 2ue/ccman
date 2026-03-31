import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createMCPManager, ProviderNotFoundError, getClaudeConfigPath } from '@ccman/core'
import { promptConfirm } from '../../utils/confirm.js'

export function removeCommand(program: Command): void {
  program
    .command('remove [name]')
    .alias('rm')
    .description('删除 MCP 服务器')
    .action(async (name?: string) => {
      try {
        const manager = createMCPManager()
        const providers = manager.list()

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 MCP 服务器\n'))
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
              message: '选择要删除的 MCP 服务器:',
              choices: providers.map((p) => ({
                name: `${p.name} - ${p.baseUrl} ${p.apiKey}`,
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
        console.log(chalk.green('✅ 配置已自动同步到 ~/.claude.json'))
        console.log()
        console.log(chalk.gray('配置文件:'))
        console.log(chalk.gray(`  - ${getClaudeConfigPath()}`))
        console.log()
      } catch (error) {
        if (error instanceof ProviderNotFoundError) {
          console.error(chalk.red(`\n❌ MCP 服务器不存在\n`))
          console.log(chalk.blue('💡 查看所有 MCP 服务器:') + chalk.white(' ccman mcp list\n'))
        } else {
          console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        }
        process.exit(1)
      }
    })
}

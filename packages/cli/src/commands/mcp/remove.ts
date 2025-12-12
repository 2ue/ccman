import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { McpService, McpServerNotFoundError, getClaudeConfigPath } from '@ccman/core'

export function removeCommand(program: Command): void {
  program
    .command('remove [name]')
    .alias('rm')
    .description('删除 MCP 服务器')
    .action(async (name?: string) => {
      try {
        const servers = McpService.list()

        if (servers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 MCP 服务器\n'))
          return
        }

        let targetName: string

        if (name) {
          // Validate that server exists
          try {
            McpService.get(name)
            targetName = name
          } catch (error) {
            throw new McpServerNotFoundError(name)
          }
        } else {
          // 交互式选择
          const { selectedName } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedName',
              message: '选择要删除的 MCP 服务器:',
              choices: servers.map((s) => ({
                name: `${s.name} - ${s.command} ${(s.args || []).join(' ')}`,
                value: s.name,
              })),
            },
          ])
          targetName = selectedName
        }

        // 确认删除
        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `确定删除 "${targetName}"?`,
            default: false,
          },
        ])

        if (!confirmed) {
          console.log(chalk.gray('\n已取消\n'))
          return
        }

        McpService.delete(targetName)

        console.log()
        console.log(chalk.green(`✅ 已删除: ${targetName}`))
        console.log()
        console.log(chalk.green('✅ 配置已自动同步到 ~/.claude.json'))
        console.log()
        console.log(chalk.gray('配置文件:'))
        console.log(chalk.gray(`  - ${getClaudeConfigPath()}`))
        console.log()
      } catch (error) {
        if (error instanceof McpServerNotFoundError) {
          console.error(chalk.red(`\n❌ MCP 服务器不存在\n`))
          console.log(chalk.blue('💡 查看所有 MCP 服务器:') + chalk.white(' ccman mcp list\n'))
        } else {
          console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        }
        process.exit(1)
      }
    })
}

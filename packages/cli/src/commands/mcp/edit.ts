import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { McpService, McpServerNotFoundError, getClaudeConfigPath } from '@ccman/core'

export function editCommand(program: Command): void {
  program
    .command('edit [name]')
    .description('编辑 MCP 服务器')
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
              message: '选择要编辑的 MCP 服务器:',
              choices: servers.map((s) => ({
                name: `${s.name} - ${s.command} ${(s.args || []).join(' ')}`,
                value: s.name,
              })),
            },
          ])
          targetName = selectedName
        }

        const server = McpService.get(targetName)

        console.log(chalk.bold('\n✏️  编辑 MCP 服务器\n'))
        console.log(chalk.gray('提示: 留空则保持原值\n'))

        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'MCP 服务器名称:',
            default: server.name,
          },
          {
            type: 'input',
            name: 'command',
            message: '启动命令:',
            default: server.command,
          },
          {
            type: 'input',
            name: 'args',
            message: '命令参数 (空格分隔, 留空保持不变):',
            default: (server.args || []).join(' '),
          },
          {
            type: 'input',
            name: 'env',
            message: '环境变量 (JSON 格式, 留空保持不变):',
            default: server.env ? JSON.stringify(server.env) : '',
          },
        ])

        // Build updates object
        const updates: {
          name?: string
          command?: string
          args?: string[]
          env?: Record<string, string>
        } = {}

        if (answers.name && answers.name !== server.name) {
          updates.name = answers.name
        }
        if (answers.command && answers.command !== server.command) {
          updates.command = answers.command
        }
        if (answers.args) {
          const newArgs = answers.args.split(' ').filter((arg: string) => arg.length > 0)
          if (newArgs.join(' ') !== (server.args || []).join(' ')) {
            updates.args = newArgs
          }
        }
        if (answers.env !== (server.env ? JSON.stringify(server.env) : '')) {
          updates.env = answers.env ? JSON.parse(answers.env) : {}
        }

        if (Object.keys(updates).length === 0) {
          console.log(chalk.gray('\n未做任何修改\n'))
          return
        }

        const updated = McpService.update(targetName, updates)

        console.log()
        console.log(chalk.green('✅ 编辑成功'))
        console.log()
        console.log(`  ${chalk.bold(updated.name)} ${chalk.blue('[MCP]')}`)
        console.log(`  ${chalk.gray(`命令: ${updated.command} ${(updated.args || []).join(' ')}`)}`)
        if (updated.env && Object.keys(updated.env).length > 0) {
          console.log(chalk.gray(`  环境变量: ${Object.keys(updated.env).join(', ')}`))
        }
        console.log()
        console.log(chalk.green('✅ 配置已自动同步到 ~/.claude.json'))
        console.log()
        console.log(chalk.gray('配置文件:'))
        console.log(chalk.gray(`  - ${getClaudeConfigPath()}`))
        console.log()
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createMCPManager, ProviderNotFoundError, getClaudeConfigPath } from '@ccman/core'

export function editCommand(program: Command): void {
  program
    .command('edit [name]')
    .description('编辑 MCP 服务器')
    .action(async (name?: string) => {
      try {
        const manager = createMCPManager()
        const providers = manager.list()

        if (providers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 MCP 服务器\n'))
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
          // 交互式选择
          const { selectedId } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedId',
              message: '选择要编辑的 MCP 服务器:',
              choices: providers.map((p) => ({
                name: `${p.name} - ${p.baseUrl} ${p.apiKey}`,
                value: p.id,
              })),
            },
          ])
          targetId = selectedId
        }

        const provider = manager.get(targetId)

        // 解析现有的字段（从 Provider 映射回 MCP 格式）
        const currentCommand = provider.baseUrl
        const currentArgs = provider.apiKey
        const currentEnv = provider.model

        console.log(chalk.bold('\n✏️  编辑 MCP 服务器\n'))
        console.log(chalk.gray('提示: 留空则保持原值\n'))

        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'MCP 服务器名称:',
            default: provider.name,
          },
          {
            type: 'input',
            name: 'command',
            message: '启动命令:',
            default: currentCommand,
          },
          {
            type: 'input',
            name: 'args',
            message: '命令参数 (空格分隔, 留空保持不变):',
            default: currentArgs,
          },
          {
            type: 'input',
            name: 'env',
            message: '环境变量 (JSON 格式, 留空保持不变):',
            default: currentEnv || '',
          },
        ])

        // 字段映射：command → baseUrl, args → apiKey, env → model
        const updates: { name?: string; baseUrl?: string; apiKey?: string; model?: string } = {}

        if (answers.name && answers.name !== provider.name) {
          updates.name = answers.name
        }
        if (answers.command && answers.command !== currentCommand) {
          updates.baseUrl = answers.command
        }
        if (answers.args && answers.args !== currentArgs) {
          updates.apiKey = answers.args
        }
        if (answers.env !== currentEnv) {
          updates.model = answers.env || undefined
        }

        if (Object.keys(updates).length === 0) {
          console.log(chalk.gray('\n未做任何修改\n'))
          return
        }

        const updated = manager.edit(targetId, updates)

        console.log()
        console.log(chalk.green('✅ 编辑成功'))
        console.log()
        console.log(`  ${chalk.bold(updated.name)} ${chalk.blue('[MCP]')}`)
        console.log(`  ${chalk.gray(`命令: ${updated.baseUrl} ${updated.apiKey}`)}`)
        if (updated.model) {
          try {
            const env = JSON.parse(updated.model)
            console.log(chalk.gray(`  环境变量: ${Object.keys(env).join(', ')}`))
          } catch {
            // 忽略 JSON 解析错误
          }
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

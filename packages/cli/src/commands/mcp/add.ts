import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createMCPManager, MCP_PRESETS_DETAIL, getClaudeConfigPath } from '@ccman/core'

export function addCommand(program: Command): void {
  program
    .command('add')
    .description('添加新的 MCP 服务器(交互式)')
    .action(async () => {
      try {
        const manager = createMCPManager()

        console.log(chalk.bold('\n📝 添加 MCP 服务器\n'))

        // 询问是否使用预置服务器
        const { usePreset } = await inquirer.prompt([
          {
            type: 'list',
            name: 'usePreset',
            message: '选择配置来源:',
            choices: [
              { name: '📦 使用预置 MCP 服务器', value: true },
              { name: '✏️  自定义配置', value: false },
            ],
          },
        ])

        let name: string
        let command: string
        let args: string[]
        let env: Record<string, string | number> | undefined

        if (usePreset) {
          // 使用预置服务器
          const { presetName } = await inquirer.prompt([
            {
              type: 'list',
              name: 'presetName',
              message: '选择预置 MCP 服务器:',
              choices: MCP_PRESETS_DETAIL.map((p) => ({
                name: `${p.name} - ${p.description}`,
                value: p.name,
              })),
            },
          ])

          const preset = MCP_PRESETS_DETAIL.find((p) => p.name === presetName)!

          console.log(chalk.blue(`\n使用预设: ${preset.name} - ${preset.description}\n`))

          // 显示预设信息
          if (preset.argsPlaceholder) {
            console.log(chalk.yellow(`⚠️  ${preset.argsPlaceholder}\n`))
          }
          if (preset.envRequired && preset.envRequired.length > 0) {
            console.log(chalk.yellow(`⚠️  需要配置环境变量: ${preset.envRequired.join(', ')}\n`))
          }

          // 允许修改所有字段
          const input = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'MCP 服务器名称:',
              default: preset.name,
              validate: (value) => {
                if (!value) return '名称不能为空'
                return true
              },
            },
            {
              type: 'input',
              name: 'command',
              message: '启动命令:',
              default: preset.command,
              validate: (value) => {
                if (!value) return '命令不能为空'
                return true
              },
            },
            {
              type: 'input',
              name: 'args',
              message: '命令参数 (空格分隔):',
              default: preset.args.join(' '),
              validate: (value) => {
                if (!value) return '参数不能为空'
                return true
              },
            },
            {
              type: 'input',
              name: 'env',
              message: '环境变量 (JSON 格式, 如 {"API_KEY": "xxx"}, 可留空):',
              default: '',
            },
          ])

          name = input.name
          command = input.command
          args = input.args.split(' ').filter((arg: string) => arg.length > 0)
          env = input.env ? JSON.parse(input.env) : undefined
        } else {
          // 自定义配置
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'MCP 服务器名称:',
              validate: (value) => {
                if (!value) return '名称不能为空'
                return true
              },
            },
            {
              type: 'input',
              name: 'command',
              message: '启动命令 (如 npx, node, python):',
              default: 'npx',
              validate: (value) => {
                if (!value) return '命令不能为空'
                return true
              },
            },
            {
              type: 'input',
              name: 'args',
              message: '命令参数 (空格分隔):',
              validate: (value) => {
                if (!value) return '参数不能为空'
                return true
              },
            },
            {
              type: 'input',
              name: 'env',
              message: '环境变量 (JSON 格式, 如 {"API_KEY": "xxx"}, 可留空):',
              default: '',
            },
          ])

          name = answers.name
          command = answers.command
          args = answers.args.split(' ').filter((arg: string) => arg.length > 0)
          env = answers.env ? JSON.parse(answers.env) : undefined
        }

        // 字段映射：command → baseUrl, args → apiKey, env → model
        const provider = manager.add({
          name,
          baseUrl: command,
          apiKey: args.join(' '),
          model: env ? JSON.stringify(env) : undefined,
        })

        console.log()
        console.log(chalk.green('✅ MCP 服务器添加成功'))
        console.log()
        console.log(`  ${chalk.bold(provider.name)} ${chalk.blue('[MCP]')}`)
        console.log(`  ${chalk.gray(`${command} ${args.join(' ')}`)  }`)
        if (env) {
          console.log(chalk.gray(`  环境变量: ${Object.keys(env).join(', ')}`))
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

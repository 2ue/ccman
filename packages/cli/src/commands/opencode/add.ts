import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { createOpenCodeManager, OPENCODE_PRESETS, getOpenCodeConfigPath } from '@ccman/core'
import { promptProviderForm } from '../../interactive.js'

export function addCommand(program: Command): void {
  program
    .command('add')
    .description('添加新的 OpenCode 服务商(交互式)')
    .action(async () => {
      try {
        const manager = createOpenCodeManager()

        console.log(chalk.bold('\n📝 添加 OpenCode 服务商\n'))

        // 询问是否使用预置服务商
        const { usePreset } = await inquirer.prompt([
          {
            type: 'list',
            name: 'usePreset',
            message: '选择配置来源:',
            choices: [
              { name: '📦 使用预置服务商', value: true },
              { name: '✏️  自定义配置', value: false },
            ],
          },
        ])

        let name: string
        let desc: string | undefined
        let baseUrl: string
        let apiKey: string

        if (usePreset) {
          const { presetName } = await inquirer.prompt([
            {
              type: 'list',
              name: 'presetName',
              message: '选择预置服务商:',
              choices: OPENCODE_PRESETS.map((p) => ({
                name: `${p.name} - ${p.description}`,
                value: p.name,
              })),
            },
          ])

          const preset = OPENCODE_PRESETS.find((p) => p.name === presetName)!

          console.log(chalk.blue(`\n使用预设: ${preset.name} - ${preset.description}\n`))

          const input = await promptProviderForm({
            name: preset.name,
            desc: '',
            baseUrl: preset.baseUrl,
            apiKey: '',
          })

          name = input.name
          desc = input.desc
          baseUrl = input.baseUrl
          apiKey = input.apiKey
        } else {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: '服务商名称:',
              validate: (value) => (value ? true : '名称不能为空'),
            },
            {
              type: 'input',
              name: 'baseUrl',
              message: 'API 地址:',
              validate: (value) => {
                if (!value) return 'API 地址不能为空'
                if (!value.startsWith('http://') && !value.startsWith('https://')) {
                  return 'API 地址必须以 http:// 或 https:// 开头'
                }
                return true
              },
            },
            {
              type: 'password',
              name: 'apiKey',
              message: 'API 密钥:',
              mask: '*',
              validate: (value) => (value ? true : 'API 密钥不能为空'),
            },
          ])

          name = answers.name
          desc = undefined
          baseUrl = answers.baseUrl
          apiKey = answers.apiKey
        }

        const provider = manager.add({
          name,
          desc,
          baseUrl,
          apiKey,
        })

        console.log()
        console.log(chalk.green('✅ 添加成功'))
        console.log()
        console.log(`  ${chalk.bold(provider.name)} ${chalk.blue('[OpenCode]')}`)
        console.log(`  ${chalk.gray(provider.baseUrl)}`)
        console.log()

        const { switchNow } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'switchNow',
            message: '是否立即切换到此服务商?',
            default: true,
          },
        ])

        if (switchNow) {
          manager.switch(provider.id)
          console.log(chalk.green('✅ 已切换到新服务商'))
          console.log()
          console.log(chalk.gray('配置已更新:'))
          console.log(chalk.gray(`  - ${getOpenCodeConfigPath()}`))
        } else {
          console.log(chalk.blue('💡 稍后切换:') + chalk.white(` ccman oc use "${provider.name}"`))
        }
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

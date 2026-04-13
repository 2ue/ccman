import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import {
  createCodexManager,
  CODEX_PRESETS,
  getCodexConfigPath,
  getCodexAuthPath,
} from '@ccman/core'
import { promptProviderForm } from '../../interactive.js'
import { promptConfirm } from '../../utils/confirm.js'
import { printSuccess, printTip } from '../../utils/cli-output.js'
import { toolBadge } from '../../utils/cli-theme.js'
import {
  addProviderAddOptions,
  resolveProviderAddInput,
  type ProviderAddCommandOptions,
} from '../../utils/provider-params.js'

export function addCommand(program: Command): void {
  const command = program.command('add').description('添加新的 Codex 服务商')
  addProviderAddOptions(command)

  command.action(async (options: ProviderAddCommandOptions) => {
    try {
      const manager = createCodexManager()

      console.log(chalk.bold('\n📝 添加 Codex 服务商\n'))

      const resolved = resolveProviderAddInput(options, CODEX_PRESETS)
      if (resolved.nonInteractive && resolved.input) {
        const provider = manager.add(resolved.input)

        printSuccess('添加成功', [
          `${chalk.bold(provider.name)} ${toolBadge('codex')}`,
          chalk.gray(provider.baseUrl),
        ])

        if (resolved.switchNow) {
          manager.switch(provider.id)
          printSuccess('已切换到新服务商', [
            chalk.gray(`配置已更新: ${getCodexConfigPath()}`),
            chalk.gray(`配置已更新: ${getCodexAuthPath()}`),
          ])
        } else {
          printTip(`稍后切换: ${chalk.white(`ccman cx use "${provider.name}"`)}`)
        }
        return
      }

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
        // 使用预置服务商
        const { presetName } = await inquirer.prompt([
          {
            type: 'list',
            name: 'presetName',
            message: '选择预置服务商:',
            choices: CODEX_PRESETS.map((p) => ({
              name: `${p.name} - ${p.description}`,
              value: p.name,
            })),
          },
        ])

        const preset = CODEX_PRESETS.find((p) => p.name === presetName)!

        console.log(chalk.blue(`\n使用预设: ${preset.name} - ${preset.description}\n`))

        // 允许修改所有字段
        const input = await promptProviderForm({
          name: preset.name,
          desc: '',
          baseUrl: preset.baseUrl,
          apiKey: '',
        })

        name = input.name
        // 不继承预置描述,使用用户输入的 desc(可能为空)
        desc = input.desc
        baseUrl = input.baseUrl
        apiKey = input.apiKey
      } else {
        // 自定义配置
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: '服务商名称:',
            validate: (value) => {
              if (!value) return '名称不能为空'
              return true
            },
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
            validate: (value) => {
              if (!value) return 'API 密钥不能为空'
              return true
            },
          },
        ])

        name = answers.name
        desc = undefined
        baseUrl = answers.baseUrl
        apiKey = answers.apiKey
      }

      const provider = manager.add({ name, desc, baseUrl, apiKey })

      printSuccess('添加成功', [
        `${chalk.bold(provider.name)} ${toolBadge('codex')}`,
        chalk.gray(provider.baseUrl),
      ])

      // 询问是否立即切换
      const switchNow = await promptConfirm('是否立即切换到此服务商?', true)

      if (switchNow) {
        manager.switch(provider.id)
        printSuccess('已切换到新服务商', [
          chalk.gray(`配置已更新: ${getCodexConfigPath()}`),
          chalk.gray(`配置已更新: ${getCodexAuthPath()}`),
        ])
      } else {
        printTip(`稍后切换: ${chalk.white(`ccman cx use "${provider.name}"`)}`)
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
      process.exit(1)
    }
  })
}

import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import type { WebDAVAuthType } from '@ccman/core'
import { loadSyncConfig, saveSyncConfig, getSyncConfigPath } from '../../utils/sync-config.js'

export function configCommand(program: Command): void {
  program
    .command('config')
    .description('配置 WebDAV 连接')
    .action(async () => {
      try {
        console.log(chalk.bold('\n⚙️  配置 WebDAV 同步\n'))

        // 加载已有配置
        const existingConfig = loadSyncConfig()

        // 交互式配置
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'webdavUrl',
            message: 'WebDAV 服务器地址:',
            default: existingConfig?.webdavUrl,
            validate: (value) => {
              if (!value) return 'WebDAV 地址不能为空'
              if (!value.startsWith('http://') && !value.startsWith('https://')) {
                return 'WebDAV 地址必须以 http:// 或 https:// 开头'
              }
              return true
            },
          },
          {
            type: 'input',
            name: 'username',
            message: '用户名:',
            default: existingConfig?.username,
            validate: (value) => (value ? true : '用户名不能为空'),
          },
          {
            type: 'password',
            name: 'password',
            message: 'WebDAV 密码:',
            mask: '*',
            default: existingConfig?.password ? '********' : undefined,
            validate: (value) => (value ? true : '密码不能为空'),
          },
          {
            type: 'list',
            name: 'authType',
            message: '认证类型:',
            choices: [
              { name: 'Basic Auth（基础认证）', value: 'password' },
              { name: 'Digest Auth（摘要认证）', value: 'digest' },
            ],
            default: existingConfig?.authType || 'password',
          },
          {
            type: 'input',
            name: 'remoteDir',
            message: '远程同步目录:',
            default: existingConfig?.remoteDir || '/',
          },
          {
            type: 'password',
            name: 'syncPassword',
            message: '同步密码（用于加密 API Key）:',
            mask: '*',
            default: existingConfig?.syncPassword ? '********' : undefined,
            validate: (value) => (value ? true : '同步密码不能为空'),
          },
          {
            type: 'confirm',
            name: 'rememberSyncPassword',
            message: '记住同步密码?',
            default: existingConfig?.rememberSyncPassword ?? true,
          },
        ])

        // 如果密码是默认值（********），使用已有密码
        if (answers.password === '********' && existingConfig?.password) {
          answers.password = existingConfig.password
        }
        if (answers.syncPassword === '********' && existingConfig?.syncPassword) {
          answers.syncPassword = existingConfig.syncPassword
        }

        // 保存配置
        saveSyncConfig({
          webdavUrl: answers.webdavUrl,
          username: answers.username,
          password: answers.password,
          authType: answers.authType as WebDAVAuthType,
          remoteDir: answers.remoteDir,
          syncPassword: answers.syncPassword,
          rememberSyncPassword: answers.rememberSyncPassword,
        })

        console.log()
        console.log(chalk.green('✅ 配置保存成功'))
        console.log()
        console.log(chalk.gray('配置文件:'), getSyncConfigPath())
        console.log()

        // 询问是否测试连接
        const { testNow } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'testNow',
            message: '是否立即测试连接?',
            default: true,
          },
        ])

        if (testNow) {
          console.log(chalk.blue('\n💡 请运行: ccman sync test\n'))
        }
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

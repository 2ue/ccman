import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { downloadFromCloud } from '@ccman/core'
import { loadSyncConfig } from '../../utils/sync-config.js'

export function downloadCommand(program: Command): void {
  program
    .command('download')
    .description('从云端下载配置到本地')
    .action(async () => {
      try {
        // 检查配置
        const config = loadSyncConfig()
        if (!config) {
          console.log(chalk.yellow('\n⚠️  未找到 WebDAV 配置\n'))
          console.log(chalk.blue('💡 请先配置: ccman sync config\n'))
          process.exit(1)
        }

        // 获取同步密码
        let syncPassword = config.syncPassword
        if (!syncPassword) {
          const { password } = await inquirer.prompt([
            {
              type: 'password',
              name: 'password',
              message: '请输入同步密码:',
              mask: '*',
              validate: (value) => (value ? true : '同步密码不能为空'),
            },
          ])
          syncPassword = password
        }

        console.log(chalk.bold('\n📥 从云端下载配置\n'))
        console.log(chalk.yellow('⚠️  将覆盖本地配置（自动备份）'))
        console.log()

        // 确认下载
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: '确认下载?',
            default: false,
          },
        ])

        if (!confirm) {
          console.log(chalk.gray('\n❌ 已取消\n'))
          return
        }

        // 执行下载
        console.log()
        console.log(chalk.gray('💾 备份本地配置...'))
        console.log(chalk.gray('📥 下载远程配置...'))
        console.log(chalk.gray('🔓 解密 API Key...'))

        const backupPaths = await downloadFromCloud(config, syncPassword)

        console.log()
        console.log(chalk.green('✅ 下载成功'))
        console.log()

        if (backupPaths.length > 0) {
          console.log(chalk.gray('本地备份:'))
          backupPaths.forEach((path) => {
            console.log(chalk.gray(`  ${path}`))
          })
          console.log()
        }

        console.log(chalk.blue('💡 配置已更新，重新加载生效\n'))
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

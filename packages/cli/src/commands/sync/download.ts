import { Command } from 'commander'
import chalk from 'chalk'
import { downloadFromCloud } from '@ccman/core'
import {
  addSyncConnectionOptions,
  confirmOrExit,
  ensureConfigExists,
  resolveSyncPassword,
  type SyncCommandOptions,
} from './helpers.js'

export function downloadCommand(program: Command): void {
  const command = program.command('download').description('从云端下载配置到本地')
  addSyncConnectionOptions(command, {
    includeSyncPassword: true,
    includeConfirm: true,
  })

  command.action(async (options: SyncCommandOptions) => {
    try {
      // 检查配置（如果不存在会询问是否配置）
      const config = await ensureConfigExists(options)
      if (!config) {
        console.log(chalk.gray('\n已取消\n'))
        return
      }

      // 获取同步密码
      const syncPassword = await resolveSyncPassword(config, options)

      console.log(chalk.bold('\n📥 从云端下载配置\n'))
      console.log(chalk.yellow('⚠️  将覆盖本地配置（自动备份）'))
      console.log()

      // 确认下载
      const confirm = await confirmOrExit('确认下载?', false, options)

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
    }
  })
}

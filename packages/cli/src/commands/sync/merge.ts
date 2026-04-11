import { Command } from 'commander'
import chalk from 'chalk'
import { mergeSync } from '@ccman/core'
import {
  addSyncConnectionOptions,
  ensureConfigExists,
  resolveSyncPassword,
  type SyncCommandOptions,
} from './helpers.js'

export function mergeCommand(program: Command): void {
  const command = program.command('merge').description('智能合并本地和云端配置')
  addSyncConnectionOptions(command, {
    includeSyncPassword: true,
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

      console.log(chalk.bold('\n🔄 智能合并配置\n'))
      console.log(chalk.gray('分析本地和云端配置...'))

      // 执行合并
      const result = await mergeSync(config, syncPassword)

      if (!result.hasChanges) {
        console.log()
        console.log(chalk.blue('ℹ️  配置已同步，无需操作\n'))
        return
      }

      console.log()
      console.log(chalk.green('✅ 配置已智能合并并同步'))
      console.log()

      if (result.backupPaths.length > 0) {
        console.log(chalk.gray('备份:'))
        result.backupPaths.forEach((path) => {
          console.log(chalk.gray(`  ${path}`))
        })
        console.log()
      }

      console.log(chalk.blue('合并规则:'))
      console.log(chalk.gray('  • 相同 ID：保留最新修改'))
      console.log(chalk.gray('  • 相同配置（URL+Key）：保留最新修改'))
      console.log(chalk.gray('  • 不同配置：全部保留，自动处理 name 冲突'))
      console.log()
    } catch (error) {
      console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
    }
  })
}

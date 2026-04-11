import { Command } from 'commander'
import chalk from 'chalk'
import {
  uploadToCloud,
  createCodexManager,
  createClaudeManager,
  createGeminiManager,
  createOpenClawManager,
} from '@ccman/core'
import {
  addSyncConnectionOptions,
  confirmOrExit,
  ensureConfigExists,
  resolveSyncPassword,
  type SyncCommandOptions,
} from './helpers.js'

export function uploadCommand(program: Command): void {
  const command = program.command('upload').description('上传本地配置到云端')
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

      // 显示配置信息
      const codexManager = createCodexManager()
      const claudeManager = createClaudeManager()
      const geminiManager = createGeminiManager()
      const openclawManager = createOpenClawManager()
      const codexProviders = codexManager.list()
      const claudeProviders = claudeManager.list()
      const geminiProviders = geminiManager.list()
      const openclawProviders = openclawManager.list()

      console.log(chalk.bold('\n📤 上传配置到云端\n'))
      console.log('配置信息:')
      console.log(`  Codex 服务商: ${chalk.cyan(codexProviders.length)} 个`)
      console.log(`  Claude 服务商: ${chalk.cyan(claudeProviders.length)} 个`)
      console.log(`  Gemini 服务商: ${chalk.cyan(geminiProviders.length)} 个`)
      console.log(`  OpenClaw 服务商: ${chalk.cyan(openclawProviders.length)} 个`)
      console.log()
      console.log(chalk.yellow('⚠️  云端现有配置将被覆盖'))
      console.log()

      // 确认上传
      const confirm = await confirmOrExit('确认上传?', false, options)

      if (!confirm) {
        console.log(chalk.gray('\n❌ 已取消\n'))
        return
      }

      // 执行上传
      console.log()
      console.log(chalk.gray('🔐 加密 API Key...'))
      console.log(chalk.gray('📤 上传到 WebDAV...'))

      await uploadToCloud(config, syncPassword)

      console.log()
      console.log(chalk.green('✅ 上传成功'))
      console.log()
      const remoteDir = config.remoteDir || '/'
      console.log(chalk.gray('远程文件:'))
      console.log(chalk.gray(`  ${config.webdavUrl}${remoteDir}/.ccman/codex.json`))
      console.log(chalk.gray(`  ${config.webdavUrl}${remoteDir}/.ccman/claude.json`))
      console.log(chalk.gray(`  ${config.webdavUrl}${remoteDir}/.ccman/gemini.json`))
      console.log(chalk.gray(`  ${config.webdavUrl}${remoteDir}/.ccman/openclaw.json`))
      console.log()
      console.log(chalk.blue("💡 其他设备可通过 'ccman sync download' 获取配置\n"))
    } catch (error) {
      console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
    }
  })
}

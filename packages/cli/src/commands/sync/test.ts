import { Command } from 'commander'
import chalk from 'chalk'
import { testWebDAVConnection } from '@ccman/core'
import { addSyncConnectionOptions, ensureConfigExists, type SyncCommandOptions } from './helpers.js'

export function testCommand(program: Command): void {
  const command = program.command('test').description('测试 WebDAV 连接')
  addSyncConnectionOptions(command)

  command.action(async (options: SyncCommandOptions) => {
    try {
      // 检查配置（如果不存在会询问是否配置）
      const config = await ensureConfigExists(options)
      if (!config) {
        console.log(chalk.gray('\n已取消\n'))
        return
      }

      console.log(chalk.bold('\n🔍 测试 WebDAV 连接...\n'))

      // 测试连接
      const success = await testWebDAVConnection(config)

      if (success) {
        console.log(chalk.green('✅ 连接成功'))
        console.log()
        console.log('  ', chalk.gray('URL:'), config.webdavUrl)
        console.log('  ', chalk.gray('用户:'), config.username)
        console.log('  ', chalk.gray('远程目录:'), config.remoteDir || '/')
        console.log(
          '  ',
          chalk.gray('认证类型:'),
          config.authType === 'password' ? 'Basic Auth' : 'Digest Auth'
        )
        console.log()
      } else {
        console.log(chalk.red('❌ 连接失败'))
        console.log()
        console.log(chalk.yellow('请检查:'))
        console.log('  1. WebDAV 服务器地址是否正确')
        console.log('  2. 用户名和密码是否正确')
        console.log('  3. 网络连接是否正常')
        console.log()
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
    }
  })
}

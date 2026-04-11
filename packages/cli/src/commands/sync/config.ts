import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import type { WebDAVAuthType } from '@ccman/core'
import {
  loadSyncConfig,
  saveSyncConfig,
  getSyncConfigPath,
  type LocalSyncConfig,
} from '../../utils/sync-config.js'
import { testWebDAVConnection } from '@ccman/core'
import { promptConfirm } from '../../utils/confirm.js'
import {
  addSyncConnectionOptions,
  collectSyncCommandInput,
  getMissingConnectionFields,
  type SyncCommandOptions,
  type SyncCommandInput,
} from './helpers.js'

function validateWebdavUrl(url: string): void {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('WebDAV 地址必须以 http:// 或 https:// 开头')
  }
}

function hasConfigChanges(
  existingConfig: LocalSyncConfig | null,
  newConfig: LocalSyncConfig
): boolean {
  if (!existingConfig) {
    return true
  }

  return (
    existingConfig.webdavUrl !== newConfig.webdavUrl ||
    existingConfig.username !== newConfig.username ||
    existingConfig.password !== newConfig.password ||
    existingConfig.authType !== newConfig.authType ||
    existingConfig.remoteDir !== newConfig.remoteDir ||
    existingConfig.syncPassword !== newConfig.syncPassword ||
    existingConfig.rememberSyncPassword !== newConfig.rememberSyncPassword
  )
}

function buildConfigFromInput(
  existingConfig: LocalSyncConfig | null,
  input: SyncCommandInput
): LocalSyncConfig {
  const nextConfig: LocalSyncConfig = existingConfig
    ? { ...existingConfig }
    : {
        webdavUrl: '',
        username: '',
        password: '',
        authType: 'password',
        remoteDir: '/',
        syncPassword: undefined,
        rememberSyncPassword: true,
        lastSync: undefined,
      }

  if (input.overrides.webdavUrl !== undefined) {
    nextConfig.webdavUrl = input.overrides.webdavUrl
  }
  if (input.overrides.username !== undefined) {
    nextConfig.username = input.overrides.username
  }
  if (input.overrides.password !== undefined) {
    nextConfig.password = input.overrides.password
  }
  if (input.overrides.authType !== undefined) {
    nextConfig.authType = input.overrides.authType as WebDAVAuthType
  }
  if (input.overrides.remoteDir !== undefined) {
    nextConfig.remoteDir = input.overrides.remoteDir
  }
  if (input.overrides.syncPassword !== undefined) {
    nextConfig.syncPassword = input.overrides.syncPassword
  }
  if (input.rememberSyncPassword !== undefined) {
    nextConfig.rememberSyncPassword = input.rememberSyncPassword
  }

  nextConfig.authType = (nextConfig.authType || 'password') as WebDAVAuthType
  nextConfig.remoteDir = nextConfig.remoteDir || '/'
  nextConfig.rememberSyncPassword = nextConfig.rememberSyncPassword ?? true

  const missingFields = getMissingConnectionFields(nextConfig)
  if (missingFields.length > 0) {
    throw new Error(
      `缺少同步配置参数: ${missingFields.map((field) => `--${field.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`).join(', ')}`
    )
  }

  validateWebdavUrl(nextConfig.webdavUrl)

  if (!existingConfig && !nextConfig.syncPassword) {
    throw new Error('缺少同步配置参数: --sync-password')
  }

  return nextConfig
}

async function printConnectionTestResult(config: LocalSyncConfig): Promise<void> {
  console.log(chalk.bold('\n🔍 测试 WebDAV 连接...\n'))

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
    return
  }

  console.log(chalk.red('❌ 连接失败'))
  console.log()
  console.log(chalk.yellow('请检查:'))
  console.log('  1. WebDAV 服务器地址是否正确')
  console.log('  2. 用户名和密码是否正确')
  console.log('  3. 网络连接是否正常')
  console.log()
}

export function configCommand(program: Command): void {
  const command = program.command('config').description('配置 WebDAV 连接')
  addSyncConnectionOptions(command, {
    includeSyncPassword: true,
    includeRememberFlags: true,
    includeTestFlag: true,
  })

  command.action(async (options: SyncCommandOptions) => {
    try {
      console.log(chalk.bold('\n⚙️  配置 WebDAV 同步\n'))

      // 加载已有配置
      const existingConfig = loadSyncConfig()

      const input = collectSyncCommandInput(options)
      if (input.nonInteractive) {
        const newConfig = buildConfigFromInput(existingConfig, input)

        if (!hasConfigChanges(existingConfig, newConfig)) {
          console.log()
          console.log(chalk.yellow('ℹ️  未检测到配置变更，不需要更新'))
          console.log()
          return
        }

        saveSyncConfig(newConfig)

        console.log()
        console.log(chalk.green('✅ 配置保存成功'))
        console.log()
        console.log(chalk.gray('配置文件:'), getSyncConfigPath())
        console.log()

        if (input.shouldTest) {
          await printConnectionTestResult(newConfig)
        }
        return
      }

      // 如果有已有配置，显示更新提示
      if (existingConfig) {
        console.log(chalk.blue('ℹ️  检测到已有配置，可以更新 WebDAV 字段'))
        console.log(chalk.gray('   留空表示不更新该字段\n'))
      }

      // 交互式配置
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'webdavUrl',
          message: existingConfig
            ? `WebDAV 服务器地址 (当前: ${existingConfig.webdavUrl}):`
            : 'WebDAV 服务器地址:',
          validate: (value) => {
            // 更新模式下允许留空
            if (!value && existingConfig) return true
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
          message: existingConfig ? `用户名 (当前: ${existingConfig.username}):` : '用户名:',
          validate: (value) => {
            // 更新模式下允许留空
            if (!value && existingConfig) return true
            if (!value) return '用户名不能为空'
            return true
          },
        },
        {
          type: 'password',
          name: 'password',
          message: existingConfig ? 'WebDAV 密码 (留空不更新):' : 'WebDAV 密码:',
          mask: '*',
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
          message: existingConfig
            ? `远程同步目录 (当前: ${existingConfig.remoteDir || '/'}):`
            : '远程同步目录:',
          default: !existingConfig ? '/' : undefined,
        },
        {
          type: 'password',
          name: 'syncPassword',
          message: existingConfig
            ? '同步密码（用于加密 API Key，留空不更新）:'
            : '同步密码（用于加密 API Key）:',
          mask: '*',
        },
      ])

      const rememberSyncPassword = await promptConfirm(
        '记住同步密码?',
        existingConfig?.rememberSyncPassword ?? true
      )

      // Trim 所有输入（处理空格的情况）
      const trimmedAnswers = {
        webdavUrl: answers.webdavUrl?.trim(),
        username: answers.username?.trim(),
        password: answers.password?.trim(),
        authType: answers.authType,
        remoteDir: answers.remoteDir?.trim(),
        syncPassword: answers.syncPassword?.trim(),
        rememberSyncPassword,
      }

      // 如果是更新模式，先检查是否有任何实质性输入
      if (existingConfig) {
        const hasTextInput =
          trimmedAnswers.webdavUrl ||
          trimmedAnswers.username ||
          trimmedAnswers.password ||
          trimmedAnswers.remoteDir ||
          trimmedAnswers.syncPassword

        const hasSelectChange =
          trimmedAnswers.authType !== existingConfig.authType ||
          trimmedAnswers.rememberSyncPassword !== existingConfig.rememberSyncPassword

        // 只有文本输入或选择改变时才继续
        if (!hasTextInput && !hasSelectChange) {
          console.log()
          console.log(chalk.yellow('ℹ️  未检测到配置变更，不需要更新'))
          console.log()
          return
        }
      }

      // 构建新配置
      let newConfig: LocalSyncConfig
      if (existingConfig) {
        // 更新模式：以现有配置为基础
        newConfig = { ...existingConfig }
      } else {
        // 新建模式：验证必填项并创建配置
        if (!trimmedAnswers.webdavUrl) {
          throw new Error('WebDAV 地址不能为空')
        }
        if (!trimmedAnswers.username) {
          throw new Error('用户名不能为空')
        }
        if (!trimmedAnswers.password) {
          throw new Error('密码不能为空')
        }
        if (!trimmedAnswers.syncPassword) {
          throw new Error('同步密码不能为空')
        }

        newConfig = {
          webdavUrl: trimmedAnswers.webdavUrl,
          username: trimmedAnswers.username,
          password: trimmedAnswers.password,
          authType: trimmedAnswers.authType as WebDAVAuthType,
          remoteDir: trimmedAnswers.remoteDir || '/',
          syncPassword: trimmedAnswers.syncPassword,
          rememberSyncPassword: trimmedAnswers.rememberSyncPassword,
          lastSync: undefined,
        }
      }
      let hasChanges = false

      // 只更新非空字段（仅在更新模式下需要）
      if (existingConfig) {
        if (trimmedAnswers.webdavUrl && trimmedAnswers.webdavUrl !== existingConfig.webdavUrl) {
          newConfig.webdavUrl = trimmedAnswers.webdavUrl
          hasChanges = true
        }

        if (trimmedAnswers.username && trimmedAnswers.username !== existingConfig.username) {
          newConfig.username = trimmedAnswers.username
          hasChanges = true
        }

        if (trimmedAnswers.password && trimmedAnswers.password !== existingConfig.password) {
          // 只有当密码真的不同时才更新（避免重复加密）
          newConfig.password = trimmedAnswers.password
          hasChanges = true
        }

        if (trimmedAnswers.authType !== existingConfig.authType) {
          newConfig.authType = trimmedAnswers.authType as WebDAVAuthType
          hasChanges = true
        }

        if (trimmedAnswers.remoteDir && trimmedAnswers.remoteDir !== existingConfig.remoteDir) {
          newConfig.remoteDir = trimmedAnswers.remoteDir
          hasChanges = true
        }

        if (
          trimmedAnswers.syncPassword &&
          trimmedAnswers.syncPassword !== existingConfig.syncPassword
        ) {
          // 只有当密码真的不同时才更新（避免重复加密）
          newConfig.syncPassword = trimmedAnswers.syncPassword
          hasChanges = true
        }

        if (trimmedAnswers.rememberSyncPassword !== existingConfig.rememberSyncPassword) {
          newConfig.rememberSyncPassword = trimmedAnswers.rememberSyncPassword
          hasChanges = true
        }
      }

      // 再次检查是否有改动
      if (!hasChanges && existingConfig) {
        console.log()
        console.log(chalk.yellow('ℹ️  未检测到配置变更，不需要更新'))
        console.log()
        return
      }

      // 保存配置（只有真正有改动时才走到这里）
      saveSyncConfig(newConfig)

      console.log()
      console.log(chalk.green('✅ 配置保存成功'))
      console.log()
      console.log(chalk.gray('配置文件:'), getSyncConfigPath())
      console.log()

      // 询问是否测试连接
      const testNow = await promptConfirm('是否立即测试连接?', true)

      if (testNow) {
        await printConnectionTestResult(newConfig)
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
    }
  })
}

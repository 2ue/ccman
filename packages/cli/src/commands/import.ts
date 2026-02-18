import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import path from 'path'
import { importConfig, validateImportDir } from '@ccman/core'

export function importCommand(program: Command): void {
  program
    .command('import <源目录>')
    .description('从本地目录导入配置（会覆盖当前配置）')
    .action(async (sourceDir: string) => {
      try {
        // 解析源路径（支持相对路径和 ~ 符号）
        const resolvedPath = sourceDir.startsWith('~')
          ? path.join(process.env.HOME || '', sourceDir.slice(1))
          : path.resolve(sourceDir)

        // 验证源目录
        console.log(chalk.bold('\n📥 导入配置\n'))
        const validation = validateImportDir(resolvedPath)

        if (!validation.valid) {
          console.log(chalk.red(`❌ ${validation.message}\n`))
          process.exit(1)
        }

        // 显示警告信息
        console.log(chalk.yellow('⚠️  警告：导入将覆盖当前配置\n'))
        console.log(`源目录: ${chalk.cyan(resolvedPath)}`)
        console.log()
        console.log('找到配置文件:')
        for (const file of validation.foundFiles) {
          console.log(`  ${chalk.cyan('✓')} ${file}`)
        }
        console.log()
        console.log(chalk.gray('未找到的受支持文件将自动跳过，不会中断导入'))
        console.log()
        console.log(chalk.gray('当前配置将被覆盖（自动备份）'))
        console.log()

        // 第一次确认
        const { confirmFirst } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmFirst',
            message: '确认导入？',
            default: false,
          },
        ])

        if (!confirmFirst) {
          console.log(chalk.gray('\n❌ 已取消\n'))
          return
        }

        // 第二次确认（强调警告）
        console.log()
        console.log(chalk.red.bold('⚠️  最后确认：此操作将覆盖所有当前配置！'))
        console.log()

        const { confirmSecond } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmSecond',
            message: '真的要继续吗？',
            default: false,
          },
        ])

        if (!confirmSecond) {
          console.log(chalk.gray('\n❌ 已取消\n'))
          return
        }

        // 执行导入
        console.log()
        console.log(chalk.gray('💾 备份当前配置...'))
        console.log(chalk.gray('📥 导入新配置...'))

        const result = importConfig(resolvedPath)

        // 显示结果
        console.log()
        console.log(chalk.green('✅ 导入成功'))
        console.log()

        if (result.backupPaths.length > 0) {
          console.log('备份文件:')
          for (const backupPath of result.backupPaths) {
            console.log(`  ${chalk.gray(backupPath)}`)
          }
          console.log()
        }

        console.log('已导入文件:')
        for (const file of result.importedFiles) {
          console.log(`  ${chalk.cyan('✓')} ${file}`)
        }
        console.log()
        console.log(chalk.blue("💡 请使用 'ccman cx use' 或 'ccman cc use' 切换服务商\n"))
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

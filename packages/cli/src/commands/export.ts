import { Command } from 'commander'
import chalk from 'chalk'
import path from 'path'
import { exportConfig, validateExport } from '@ccman/core'

export function exportCommand(program: Command): void {
  program
    .command('export <目标目录>')
    .description('导出配置到本地目录（包含 API Key）')
    .action(async (targetDir: string) => {
      try {
        // 验证源文件
        console.log(chalk.bold('\n📦 导出配置\n'))
        const validation = validateExport()

        if (!validation.valid) {
          console.log(chalk.red(`❌ ${validation.message}\n`))
          process.exit(1)
        }

        // 解析目标路径（支持相对路径和 ~ 符号）
        const resolvedPath = targetDir.startsWith('~')
          ? path.join(process.env.HOME || '', targetDir.slice(1))
          : path.resolve(targetDir)

        // 显示信息
        console.log('导出文件:')
        console.log(`  ${chalk.cyan('codex.json')}  - Codex 配置`)
        console.log(`  ${chalk.cyan('claude.json')} - Claude 配置`)
        console.log()
        console.log(`目标目录: ${chalk.cyan(resolvedPath)}`)
        console.log()
        console.log(chalk.yellow('⚠️  导出文件包含 API Key，请妥善保管'))
        console.log()

        // 执行导出
        const result = exportConfig(resolvedPath)

        // 显示结果
        console.log(chalk.green('✅ 导出成功'))
        console.log()
        console.log('已导出文件:')
        for (const file of result.exportedFiles) {
          console.log(`  ${chalk.cyan('✓')} ${file}`)
        }
        console.log()
        console.log(chalk.blue(`💡 导入命令: ccman import ${resolvedPath}\n`))
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { analyzeClaudeJson, cleanClaudeJson, CleanPresets, type CleanOptions } from '@ccman/core'
import { promptConfirm } from '../utils/confirm.js'

/**
 * 格式化字节大小
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 显示分析结果
 */
function displayAnalysis(): void {
  try {
    console.log(chalk.bold('\n📊 分析 ~/.claude.json\n'))

    const analysis = analyzeClaudeJson()

    // 文件大小
    console.log(chalk.cyan('文件大小:'), chalk.bold(analysis.fileSizeFormatted))
    console.log()

    // 项目统计
    console.log(chalk.cyan('项目统计:'))
    console.log(`  项目总数: ${chalk.bold(analysis.projectCount)}`)
    console.log(`  历史记录总数: ${chalk.bold(analysis.totalHistoryCount)} 条`)
    console.log()

    // Top 5 项目
    console.log(chalk.cyan('历史记录最多的项目:'))
    const top5 = analysis.projectHistory.slice(0, 5)
    for (const project of top5) {
      const displayPath = project.path.length > 50 ? '...' + project.path.slice(-47) : project.path
      console.log(`  ${chalk.bold(project.count.toString().padStart(3))} 条  ${displayPath}`)
    }
    console.log()

    // 预计节省空间
    console.log(chalk.cyan('预计可节省空间:'))
    console.log(`  ${chalk.green('保守清理')} (保留10条): ${chalk.bold(formatBytes(analysis.estimatedSavings.conservative))}`)
    console.log(`  ${chalk.yellow('中等清理')} (保留5条):  ${chalk.bold(formatBytes(analysis.estimatedSavings.moderate))}`)
    console.log(`  ${chalk.red('激进清理')} (清空历史):  ${chalk.bold(formatBytes(analysis.estimatedSavings.aggressive))}`)
    console.log()

    console.log(chalk.blue(`💡 执行清理: ccman cc clean\n`))
  } catch (error) {
    console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
    process.exit(1)
  }
}

/**
 * clean:analyze 命令 - 分析配置文件
 */
export function cleanAnalyzeCommand(program: Command): void {
  program
    .command('clean:analyze')
    .description('分析 ~/.claude.json 文件大小和占用')
    .action(() => {
      displayAnalysis()
    })
}

/**
 * clean 命令 - 清理配置文件
 */
export function cleanCommand(program: Command): void {
  program
    .command('clean')
    .description('清理 ~/.claude.json 文件（历史记录、缓存等）')
    .option('--preset <type>', '使用预设方案 (conservative|moderate|aggressive)')
    .option('--keep <count>', '保留最近N条历史记录')
    .option('--cache', '清理缓存数据')
    .option('--stats', '重置使用统计')
    .option('--projects <paths>', '只清理指定项目（逗号分隔）')
    .action(async (options) => {
      try {
        // 先显示分析
        console.log(chalk.bold('\n🧹 清理 ~/.claude.json\n'))

        const analysis = analyzeClaudeJson()
        console.log(`当前文件大小: ${chalk.bold(analysis.fileSizeFormatted)}`)
        console.log(`项目数: ${analysis.projectCount}, 历史记录: ${analysis.totalHistoryCount} 条`)
        console.log()

        let cleanOptions: CleanOptions

        // 如果有命令行参数，使用非交互模式
        if (options.preset || options.keep || options.cache || options.stats || options.projects) {
          cleanOptions = buildOptionsFromArgs(options)
        } else {
          // 交互式模式
          cleanOptions = await promptForOptions(analysis)
        }

        // 确认操作
        const confirmed = await promptConfirm('确认执行清理？（会自动备份原文件）', true)

        if (!confirmed) {
          console.log(chalk.yellow('\n❌ 已取消\n'))
          return
        }

        // 执行清理
        console.log(chalk.cyan('\n正在清理...\n'))
        const result = cleanClaudeJson(cleanOptions)

        // 显示结果
        console.log(chalk.green('✅ 清理完成\n'))
        console.log(`清理前: ${chalk.bold(formatBytes(result.sizeBefore))}`)
        console.log(`清理后: ${chalk.bold(formatBytes(result.sizeAfter))}`)
        console.log(`节省空间: ${chalk.green.bold(formatBytes(result.saved))} (${((result.saved / result.sizeBefore) * 100).toFixed(1)}%)`)
        console.log()

        if (result.cleanedItems.projectHistory > 0) {
          console.log(`清理历史记录: ${chalk.bold(result.cleanedItems.projectHistory)} 条`)
        }
        if (result.cleanedItems.cache) {
          console.log(`清理缓存: ${chalk.green('✓')}`)
        }
        if (result.cleanedItems.stats) {
          console.log(`重置统计: ${chalk.green('✓')}`)
        }
        console.log()

        console.log(`备份文件: ${chalk.cyan(result.backupPath)}`)
        console.log()
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

/**
 * 从命令行参数构建清理选项
 */
function buildOptionsFromArgs(args: any): CleanOptions {
  // 如果使用预设
  if (args.preset) {
    const preset = args.preset.toLowerCase()
    if (preset === 'conservative') {
      return CleanPresets.conservative()
    } else if (preset === 'moderate') {
      return CleanPresets.moderate()
    } else if (preset === 'aggressive') {
      return CleanPresets.aggressive()
    } else {
      throw new Error(`未知的预设方案: ${preset}。可用: conservative, moderate, aggressive`)
    }
  }

  // 自定义选项
  const options: CleanOptions = {}

  if (args.keep !== undefined) {
    options.cleanProjectHistory = true
    options.keepRecentCount = parseInt(args.keep, 10)
    if (isNaN(options.keepRecentCount)) {
      throw new Error('--keep 参数必须是数字')
    }
  }

  if (args.cache) {
    options.cleanCache = true
  }

  if (args.stats) {
    options.cleanStats = true
  }

  if (args.projects) {
    options.projectPaths = args.projects.split(',').map((p: string) => p.trim())
  }

  // 如果没有任何清理选项，使用保守预设
  if (!options.cleanProjectHistory && !options.cleanCache && !options.cleanStats) {
    console.log(chalk.yellow('未指定清理选项，使用保守预设\n'))
    return CleanPresets.conservative()
  }

  return options
}

/**
 * 交互式选择清理选项
 */
async function promptForOptions(analysis: any): Promise<CleanOptions> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'preset',
      message: '选择清理方案:',
      choices: [
        {
          name: `${chalk.green('保守清理')} - 保留最近10条记录，清理缓存 (节省约 ${formatBytes(analysis.estimatedSavings.conservative)})`,
          value: 'conservative',
        },
        {
          name: `${chalk.yellow('中等清理')} - 保留最近5条记录，清理缓存和统计 (节省约 ${formatBytes(analysis.estimatedSavings.moderate)})`,
          value: 'moderate',
        },
        {
          name: `${chalk.red('激进清理')} - 清空历史记录，清理缓存和统计 (节省约 ${formatBytes(analysis.estimatedSavings.aggressive)})`,
          value: 'aggressive',
        },
        {
          name: `${chalk.cyan('自定义')} - 自定义清理选项`,
          value: 'custom',
        },
      ],
    },
  ])

  if (answers.preset !== 'custom') {
    if (answers.preset === 'conservative') {
      return CleanPresets.conservative()
    } else if (answers.preset === 'moderate') {
      return CleanPresets.moderate()
    } else {
      return CleanPresets.aggressive()
    }
  }

  // 自定义选项
  const cleanHistory = await promptConfirm('清理项目历史记录？', true)

  let keepCount = 10
  if (cleanHistory) {
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'keepCount',
        message: '每个项目保留最近多少条记录？',
        default: 10,
      },
    ])
    keepCount = answers.keepCount
  }

  const cleanCache = await promptConfirm('清理缓存数据？', true)
  const cleanStats = await promptConfirm('重置使用统计？', false)

  return {
    cleanProjectHistory: cleanHistory,
    keepRecentCount: cleanHistory ? keepCount || 0 : 0,
    cleanCache,
    cleanStats,
  }
}

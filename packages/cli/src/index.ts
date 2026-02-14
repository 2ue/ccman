#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { printLogo } from './utils/logo.js'
import { createCodexCommands } from './commands/codex/index.js'
import { createClaudeCommands } from './commands/claude/index.js'
import { createMCPCommands } from './commands/mcp/index.js'
import { createGeminiCommands } from './commands/gemini/index.js'
import { createOpenCodeCommands } from './commands/opencode/index.js'
import { createSyncCommands, startSyncMenu } from './commands/sync/index.js'
import { exportCommand } from './commands/export.js'
import { importCommand } from './commands/import.js'
import { gmnCommand } from './commands/gmn.js'
import {
  startMainMenu,
  startClaudeMenu,
  startCodexMenu,
  startGeminiMenu,
  startOpenCodeMenu,
} from './interactive.js'
import { getCcmanDir, getCodexDir, getClaudeDir, getOpenCodeDir, VERSION } from '@ccman/core'

// 开发模式：输出配置目录
if (process.env.NODE_ENV === 'development') {
  console.log(chalk.gray('\n[开发模式] 配置目录:'))
  console.log(chalk.gray(`  ccman: ${getCcmanDir()}`))
  console.log(chalk.gray(`  codex:  ${getCodexDir()}`))
  console.log(chalk.gray(`  claude: ${getClaudeDir()}`))
  console.log(chalk.gray(`  opencode: ${getOpenCodeDir()}`))
  console.log()
}

const program = new Command()

program
  .name('ccman')
  .description('Codex/Claude Code/Gemini/OpenCode API 服务商配置管理工具')
  .version(VERSION)
  .showHelpAfterError(false)
  .exitOverride((err) => {
    // 只拦截 commander.helpDisplayed 和 commander.version,让它们正常退出
    if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
      process.exit(0)
    }
    throw err
  })

// 自定义未知命令处理
program.on('command:*', (operands) => {
  const unknownCommand = operands[0]
  console.error(chalk.red(`\n❌ 未知命令: ${unknownCommand}\n`))

  // 提供相似命令建议
  const availableCommands = ['cx', 'cc', 'gm', 'oc', 'mcp', 'sync', 'export', 'import', 'gmn']
  const suggestions = availableCommands.filter(
    (cmd) => cmd.includes(unknownCommand) || unknownCommand.includes(cmd)
  )

  if (suggestions.length > 0) {
    console.log(chalk.yellow('💡 你是不是想输入:'))
    suggestions.forEach((cmd) => {
      console.log(chalk.cyan(`   ccman ${cmd}`))
    })
    console.log()
  }

  console.log(chalk.gray('查看所有可用命令: ') + chalk.cyan('ccman --help'))
  console.log()
  process.exit(1)
})

// 创建 cx (Codex) 子命令
const cx = program.command('cx').description('管理 Codex 服务商')
createCodexCommands(cx)

// cx 不带参数时进入交互模式
cx.action(async () => {
  printLogo()
  await startCodexMenu()
})

// 创建 cc (Claude) 子命令
const cc = program.command('cc').description('管理 Claude 服务商')
createClaudeCommands(cc)

// cc 不带参数时进入交互模式
cc.action(async () => {
  printLogo()
  await startClaudeMenu()
})

// 创建 gm (Gemini CLI) 子命令
const gm = program.command('gm').description('管理 Gemini CLI 服务商')
createGeminiCommands(gm)

// gm 不带参数时进入交互模式
gm.action(async () => {
  printLogo()
  await startGeminiMenu()
})

// 创建 oc (OpenCode) 子命令
const oc = program.command('oc').description('管理 OpenCode 服务商')
createOpenCodeCommands(oc)

// oc 不带参数时进入交互模式
oc.action(async () => {
  printLogo()
  await startOpenCodeMenu()
})

// 创建 mcp 子命令
const mcp = program.command('mcp').description('管理 MCP 服务器')
createMCPCommands(mcp)

// mcp 不带参数时显示帮助
mcp.action(() => {
  mcp.help()
})

// 创建 sync 子命令
const sync = program.command('sync').description('WebDAV 同步配置')
createSyncCommands(sync)

// sync 不带参数时进入交互模式
sync.action(async () => {
  printLogo()
  await startSyncMenu()
})

// 导入导出命令（顶层命令）
exportCommand(program)
importCommand(program)

// GMN 配置命令（顶层命令）
program
  .command('gmn [apiKey]')
  .description('配置 GMN 到 Codex 和 OpenCode')
  .option('-p, --platform <platforms>', '指定平台 (codex,opencode,all)')
  .action(async (apiKey, options) => {
    await gmnCommand(apiKey, options.platform)
  })

// 如果没有提供任何命令,显示 logo 并进入交互模式
;(async () => {
  if (!process.argv.slice(2).length) {
    printLogo()
    await startMainMenu()
  } else {
    // 解析命令行参数
    program.parse(process.argv)
  }
})()

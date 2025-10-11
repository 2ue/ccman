#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { printLogo } from './utils/logo.js'
import { createCodexCommands } from './commands/codex/index.js'
import { createClaudeCommands } from './commands/claude/index.js'
import { startMainMenu, startClaudeMenu, startCodexMenu } from './interactive.js'
import { getCcmanDir, getCodexDir, getClaudeDir, VERSION } from '@ccman/core'

// 开发模式：输出配置目录
if (process.env.NODE_ENV === 'development') {
  console.log(chalk.gray('\n[开发模式] 配置目录:'))
  console.log(chalk.gray(`  ccman: ${getCcmanDir()}`))
  console.log(chalk.gray(`  codex:  ${getCodexDir()}`))
  console.log(chalk.gray(`  claude: ${getClaudeDir()}`))
  console.log()
}

const program = new Command()

program
  .name('ccman')
  .description('Codex/Claude Code API 服务商配置管理工具')
  .version(VERSION)
  .showHelpAfterError(false)
  .exitOverride((err) => {
    // 只拦截 commander.helpDisplayed 和 commander.version,让它们正常退出
    if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
      process.exit(0)
    }
    throw err
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

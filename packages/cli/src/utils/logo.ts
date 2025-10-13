import chalk from 'chalk'
import { VERSION } from '@ccman/core'

export function printLogo(): void {
  console.log(
    chalk.bold(
      `
   ██████╗ ██████╗███╗   ███╗ █████╗ ███╗   ██╗
  ██╔════╝██╔════╝████╗ ████║██╔══██╗████╗  ██║
  ██║     ██║     ██╔████╔██║███████║██╔██╗ ██║
  ██║     ██║     ██║╚██╔╝██║██╔══██║██║╚██╗██║
  ╚██████╗╚██████╗██║ ╚═╝ ██║██║  ██║██║ ╚████║
   ╚═════╝ ╚═════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝
`
    )
  )
  console.log(chalk.gray('  Codex/Claude Code API 服务商配置管理工具'))
  console.log(chalk.gray(`  版本 ${VERSION}\n`))
}

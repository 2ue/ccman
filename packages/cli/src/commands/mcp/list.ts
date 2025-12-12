import { Command } from 'commander'
import chalk from 'chalk'
import { McpService } from '@ccman/core'

export function listCommand(program: Command): void {
  program
    .command('list')
    .alias('ls')
    .description('列出所有 MCP 服务器')
    .action(async () => {
      try {
        const servers = McpService.list()

        if (servers.length === 0) {
          console.log(chalk.yellow('\n⚠️  暂无 MCP 服务器\n'))
          console.log(chalk.blue('💡 添加 MCP 服务器:') + chalk.white(' ccman mcp add\n'))
          return
        }

        console.log(chalk.bold(`\n📋 MCP 服务器 (${servers.length} 个)\n`))

        // MCP 当前没有"激活"概念,所有配置的服务器都会被加载
        servers.forEach((server) => {
          const isActive = false // MCP 没有 "当前激活" 的概念，所有配置的 MCP 都会加载

          const indicator = isActive ? chalk.green('●') : chalk.gray('○')
          const nameDisplay = chalk.bold(server.name)
          const commandDisplay = chalk.gray(`${server.command} ${(server.args || []).join(' ')}`)

          console.log(`  ${indicator} ${nameDisplay}`)
          console.log(`    ${commandDisplay}`)

          // 如果有 env，显示环境变量
          if (server.env && Object.keys(server.env).length > 0) {
            const envKeys = Object.keys(server.env)
            console.log(chalk.gray(`    环境变量: ${envKeys.join(', ')}`))
          }

          console.log()
        })

        console.log(chalk.gray('提示: 所有配置的 MCP 服务器会自动同步到 ~/.claude.json'))
        console.log()
      } catch (error) {
        console.error(chalk.red(`\n❌ ${(error as Error).message}\n`))
        process.exit(1)
      }
    })
}

import chalk from 'chalk'
import type { Provider } from '@ccman/core'

/**
 * 格式化 Provider 列表为 Vercel CLI 风格
 *
 * @param providers - Provider 列表
 * @param currentId - 当前激活的 provider ID
 * @param toolName - 工具名称 (用于标题)
 * @returns 格式化后的列表字符串
 */
export function formatProviderTable(
  providers: Provider[],
  currentId: string | undefined
): string {
  const lines: string[] = []

  lines.push('')

  // 数据行
  providers.forEach((p, index) => {
    const isCurrent = p.id === currentId

    // 名称行
    const marker = isCurrent ? chalk.green('●') : chalk.gray('○')
    const name = isCurrent ? chalk.green.bold(p.name) : chalk.white(p.name)
    const tag = isCurrent ? chalk.green(' [当前]') : ''
    lines.push(`  ${marker}  ${name}${tag}`)

    // URL 行
    const url = isCurrent ? chalk.green(p.baseUrl) : chalk.gray(p.baseUrl)
    lines.push(`     ${url}`)

    if (p.desc) {
      const desc = isCurrent ? chalk.green(p.desc) : chalk.gray(p.desc)
      lines.push(`     ${desc}`)
    }

    // 每个服务商之间空一行
    if (index < providers.length - 1) {
      lines.push('')
    }
  })

  lines.push('')

  return lines.join('\n')
}

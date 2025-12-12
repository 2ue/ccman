import chalk from 'chalk'

/**
 * Provider display type (compatible with both legacy and new Provider types)
 */
interface ProviderDisplay {
  id: string
  name: string
  baseUrl?: string
  desc?: string
}

/**
 * 格式化 Provider 列表为 Vercel CLI 风格
 *
 * @param providers - Provider 列表
 * @param currentId - 当前激活的 provider ID
 * @param toolName - 工具名称 (用于标题)
 * @returns 格式化后的列表字符串
 */
export function formatProviderTable(
  providers: ProviderDisplay[],
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
    const urlText = p.baseUrl || '(默认端点)'
    const url = isCurrent ? chalk.green(urlText) : chalk.gray(urlText)
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

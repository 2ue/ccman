import chalk from 'chalk'
import type { Provider } from '@ccman/core'

/**
 * 格式化 Provider 列表为轻量文本样式
 */
export function formatProviderTable(
  providers: Provider[],
  currentId: string | undefined,
  title?: string
): string {
  const lines: string[] = []

  if (title) {
    lines.push(chalk.bold(`\n📋 ${title}`))
    lines.push('')
  } else {
    lines.push('')
  }

  providers.forEach((p, index) => {
    const isCurrent = p.id === currentId
    const marker = isCurrent ? chalk.green('●') : chalk.gray('○')
    const name = isCurrent ? chalk.green.bold(p.name) : chalk.white(p.name)
    const tag = isCurrent ? chalk.green(' [当前]') : ''
    lines.push(`  ${marker}  ${name}${tag}`)

    const urlText = p.baseUrl || '(默认端点)'
    const url = isCurrent ? chalk.green(urlText) : chalk.gray(urlText)
    lines.push(`     ${url}`)

    if (p.desc) {
      const desc = isCurrent ? chalk.green(p.desc) : chalk.gray(p.desc)
      lines.push(`     ${desc}`)
    }

    if (index < providers.length - 1) {
      lines.push('')
    }
  })

  lines.push('')

  return lines.join('\n')
}

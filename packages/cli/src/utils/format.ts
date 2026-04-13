import chalk from 'chalk'
import boxen from 'boxen'
import type { Provider } from '@ccman/core'

/**
 * 格式化 Provider 列表为带边框的现代样式
 */
export function formatProviderTable(
  providers: Provider[],
  currentId: string | undefined,
  title?: string
): string {
  const lines: string[] = []

  providers.forEach((p, index) => {
    const isCurrent = p.id === currentId
    const marker = isCurrent ? chalk.green('●') : chalk.gray('○')
    const name = isCurrent ? chalk.green.bold(p.name) : chalk.white(p.name)
    const tag = isCurrent ? chalk.green(' [当前]') : ''
    lines.push(`${marker}  ${name}${tag}`)

    const url = isCurrent ? chalk.green(p.baseUrl) : chalk.gray(p.baseUrl)
    lines.push(`   ${url}`)

    if (p.desc) {
      const desc = isCurrent ? chalk.green(p.desc) : chalk.gray(p.desc)
      lines.push(`   ${desc}`)
    }

    if (index < providers.length - 1) lines.push('')
  })

  return (
    '\n' +
    boxen(lines.join('\n'), {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderStyle: 'round',
      borderColor: 'blue',
      title: title ? ` ${title} ` : undefined,
      titleAlignment: 'left',
    })
  )
}

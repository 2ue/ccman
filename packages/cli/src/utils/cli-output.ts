import chalk from 'chalk'
import boxen from 'boxen'

/** 成功消息（绿色边框盒子） */
export function printSuccess(title: string, details: string[] = []): void {
  const content = [chalk.green.bold(`✅ ${title}`), ...details.map((l) => `  ${l}`)].join('\n')
  console.log(
    '\n' +
      boxen(content, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderStyle: 'round',
        borderColor: 'green',
      })
  )
}

/** 信息展示（蓝色边框盒子） */
export function printInfo(title: string, lines: string[] = []): void {
  const content = [chalk.blue.bold(title), ...lines.map((l) => `  ${l}`)].join('\n')
  console.log(
    '\n' +
      boxen(content, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderStyle: 'round',
        borderColor: 'blue',
      })
  )
}

/** 警告消息（黄色边框盒子） */
export function printWarning(message: string): void {
  console.log(
    '\n' +
      boxen(chalk.yellow(`⚠️  ${message}`), {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderStyle: 'round',
        borderColor: 'yellow',
      })
  )
}

/** 提示信息（内联） */
export function printTip(message: string): void {
  console.log(chalk.blue('  💡 ') + message)
}

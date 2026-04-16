import chalk from 'chalk'

function printBlock(header: string, lines: string[] = []): void {
  console.log()
  console.log(header)

  if (lines.length > 0) {
    console.log()
    lines.forEach((line) => console.log(`  ${line}`))
  }

  console.log()
}

/** 成功消息 */
export function printSuccess(title: string, details: string[] = []): void {
  printBlock(chalk.green(`✅ ${title}`), details)
}

/** 信息展示 */
export function printInfo(title: string, lines: string[] = []): void {
  printBlock(chalk.bold(title), lines)
}

/** 警告消息 */
export function printWarning(message: string): void {
  console.log(chalk.yellow(`\n⚠️  ${message}\n`))
}

/** 提示信息 */
export function printTip(message: string): void {
  console.log(chalk.blue('💡 ') + message)
}

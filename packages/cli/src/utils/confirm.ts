import inquirer from 'inquirer'

/**
 * 解析 y/n 风格的确认输入。
 */
export function parseConfirmAnswer(value: string, defaultValue: boolean): boolean {
  const normalized = value.trim().toLowerCase()

  if (normalized === '') {
    return defaultValue
  }

  if (normalized === 'y') {
    return true
  }

  if (normalized === 'n') {
    return false
  }

  throw new Error(`无效的确认输入: ${value}`)
}

/**
 * 统一的确认提示，显示为 Y(y) / N(n)，输入支持大小写。
 */
export async function promptConfirm(message: string, defaultValue = false): Promise<boolean> {
  const { answer } = await inquirer.prompt<{ answer: string }>([
    {
      type: 'input',
      name: 'answer',
      message: `${message} (Y(y) / N(n))`,
      filter: (value: string) => value.trim(),
      validate: (value: string) => {
        if (value === '') {
          return true
        }

        if (/^(y|n)$/i.test(value)) {
          return true
        }

        return '请输入 Y 或 N'
      },
    },
  ])

  return parseConfirmAnswer(answer, defaultValue)
}

import * as fs from 'fs'

/**
 * 检查文件是否存在
 */
export function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

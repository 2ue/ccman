import * as fs from 'fs'
import * as path from 'path'

/**
 * 确保目录存在（递归创建）
 * 替代 fs-extra 的 ensureDir
 */
export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

/**
 * 读取 JSON 文件
 */
export function readJSON<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as T
}

/**
 * 写入 JSON 文件（原子操作）
 * 使用 write temp + rename 保证原子性
 */
export function writeJSON(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath)

  // 确保目录存在（mkdirSync with recursive 是幂等的，不需要检查）
  ensureDir(dir)

  // 写入临时文件
  const tmpPath = `${filePath}.tmp`
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { mode: 0o600 })

  // 原子性重命名
  fs.renameSync(tmpPath, filePath)
}

/**
 * 文件是否存在
 */
export function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * 备份文件
 */
export function backupFile(filePath: string): string {
  if (!fileExists(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const backupPath = `${filePath}.bak`
  fs.copyFileSync(filePath, backupPath)
  return backupPath
}

/**
 * 从备份恢复文件
 */
export function restoreFromBackup(filePath: string): void {
  const backupPath = `${filePath}.bak`
  if (!fileExists(backupPath)) {
    throw new Error(`Backup not found: ${backupPath}`)
  }

  fs.copyFileSync(backupPath, filePath)
}

/**
 * FileSystem - 安全的文件系统操作
 *
 * 功能：
 * - 原子写入（临时文件 + rename）
 * - 自动备份和回滚
 * - 文件锁（防止并发写入）
 * - 权限管理（0o600 文件，0o700 目录）
 */

import * as fs from 'fs'
import * as path from 'path'
// @ts-expect-error - proper-lockfile doesn't have types
import lockfile from 'proper-lockfile'

// =============================================================================
// 安全写入
// =============================================================================

export interface SafeWriteOptions {
  /** 是否创建备份（默认 true） */
  backup?: boolean
  /** 文件权限（默认 0o600） */
  mode?: number
  /** 是否使用文件锁（默认 true） */
  lock?: boolean
}

/**
 * 安全写入文件（原子操作 + 备份 + 回滚）
 *
 * @param filePath 文件路径
 * @param content 文件内容
 * @param options 写入选项
 */
export async function safeWriteFile(
  filePath: string,
  content: string,
  options: SafeWriteOptions = {}
): Promise<void> {
  const { backup = true, mode = 0o600, lock = true } = options

  const tempPath = `${filePath}.tmp`
  const backupPath = `${filePath}.bak`
  let release: (() => Promise<void>) | null = null

  try {
    // 1. 确保目录存在
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    }

    // 2. 获取文件锁（如果启用）
    if (lock && fs.existsSync(filePath)) {
      release = await lockfile.lock(filePath, {
        retries: { retries: 5, minTimeout: 100 },
      })
    }

    // 3. 备份现有文件
    if (backup && fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath)
    }

    // 4. 写入临时文件
    fs.writeFileSync(tempPath, content, { mode })

    // 5. 原子替换（rename 是原子操作）
    fs.renameSync(tempPath, filePath)

    // 6. 删除备份（写入成功后）
    if (backup && fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath)
    }
  } catch (error) {
    // 回滚：从备份恢复
    if (backup && fs.existsSync(backupPath)) {
      try {
        fs.copyFileSync(backupPath, filePath)
      } catch (rollbackError) {
        // 回滚失败，抛出原始错误和回滚错误
        throw new Error(`Write failed: ${error}\nRollback also failed: ${rollbackError}`)
      }
    }

    // 清理临时文件
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath)
      } catch {
        // 忽略清理错误
      }
    }

    throw error
  } finally {
    // 释放文件锁
    if (release) {
      await release()
    }
  }
}

/**
 * 同步版本的安全写入
 */
export function safeWriteFileSync(
  filePath: string,
  content: string,
  options: Omit<SafeWriteOptions, 'lock'> = {}
): void {
  const { backup = true, mode = 0o600 } = options

  const tempPath = `${filePath}.tmp`
  const backupPath = `${filePath}.bak`

  try {
    // 1. 确保目录存在
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    }

    // 2. 备份现有文件
    if (backup && fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath)
    }

    // 3. 写入临时文件
    fs.writeFileSync(tempPath, content, { mode })

    // 4. 原子替换
    fs.renameSync(tempPath, filePath)

    // 5. 删除备份
    if (backup && fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath)
    }
  } catch (error) {
    // 回滚
    if (backup && fs.existsSync(backupPath)) {
      try {
        fs.copyFileSync(backupPath, filePath)
      } catch (rollbackError) {
        throw new Error(`Write failed: ${error}\nRollback also failed: ${rollbackError}`)
      }
    }

    // 清理临时文件
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath)
      } catch {
        // 忽略
      }
    }

    throw error
  }
}

// =============================================================================
// 安全读取
// =============================================================================

/**
 * 安全读取文件（文件不存在返回 null 而不是抛错）
 *
 * @param filePath 文件路径
 * @returns 文件内容或 null
 */
export function safeReadFile(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null
    }
    return fs.readFileSync(filePath, 'utf-8')
  } catch (error) {
    // 文件存在但读取失败，抛出错误
    throw new Error(`Failed to read file ${filePath}: ${error}`)
  }
}

// =============================================================================
// 目录操作
// =============================================================================

/**
 * 确保目录存在（如果不存在则创建）
 *
 * @param dirPath 目录路径
 * @param mode 目录权限（默认 0o700）
 */
export function ensureDir(dirPath: string, mode = 0o700): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode })
  }
}

/**
 * 递归删除目录
 *
 * @param dirPath 目录路径
 */
export function removeDir(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true })
  }
}

// =============================================================================
// 备份操作
// =============================================================================

/**
 * 创建带时间戳的备份
 *
 * @param filePath 文件路径
 * @returns 备份文件路径
 */
export function createTimestampedBackup(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const backupPath = `${filePath}.bak-${timestamp}`

  fs.copyFileSync(filePath, backupPath)
  return backupPath
}

/**
 * 从备份恢复
 *
 * @param backupPath 备份文件路径
 * @param targetPath 目标文件路径
 */
export function restoreFromBackup(backupPath: string, targetPath: string): void {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup not found: ${backupPath}`)
  }

  fs.copyFileSync(backupPath, targetPath)
}

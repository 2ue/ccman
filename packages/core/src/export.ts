/**
 * 配置导入导出功能
 *
 * 导出：复制 codex.json + claude.json 到指定目录
 * 导入：备份 + 复制指定目录的文件到 ~/.ccman/
 */

import * as fs from 'fs'
import * as path from 'path'
import { getCcmanDir } from './paths.js'
import { fileExists, ensureDir } from './utils/file.js'
import { backupConfig } from './sync/merge.js'

/**
 * 配置文件名称
 */
const CODEX_CONFIG_FILE = 'codex.json'
const CLAUDE_CONFIG_FILE = 'claude.json'

/**
 * 导出验证结果
 */
export interface ExportValidation {
  valid: boolean
  message?: string
  missingFiles?: string[]
}

/**
 * 导入验证结果
 */
export interface ImportValidation {
  valid: boolean
  message?: string
  foundFiles: string[]
}

/**
 * 导出结果
 */
export interface ExportResult {
  success: boolean
  targetDir: string
  exportedFiles: string[]
}

/**
 * 导入结果
 */
export interface ImportResult {
  success: boolean
  backupPaths: string[]
  importedFiles: string[]
}

/**
 * 验证导出操作（检查源文件是否存在）
 */
export function validateExport(): ExportValidation {
  const ccmanDir = getCcmanDir()
  const codexPath = path.join(ccmanDir, CODEX_CONFIG_FILE)
  const claudePath = path.join(ccmanDir, CLAUDE_CONFIG_FILE)

  const missingFiles: string[] = []

  if (!fileExists(codexPath)) {
    missingFiles.push(CODEX_CONFIG_FILE)
  }

  if (!fileExists(claudePath)) {
    missingFiles.push(CLAUDE_CONFIG_FILE)
  }

  if (missingFiles.length > 0) {
    return {
      valid: false,
      message: `配置文件不存在: ${missingFiles.join(', ')}`,
      missingFiles,
    }
  }

  return { valid: true }
}

/**
 * 验证导入目录（检查目标文件是否存在）
 */
export function validateImportDir(sourceDir: string): ImportValidation {
  if (!fileExists(sourceDir)) {
    return {
      valid: false,
      message: `目录不存在: ${sourceDir}`,
      foundFiles: [],
    }
  }

  const stats = fs.statSync(sourceDir)
  if (!stats.isDirectory()) {
    return {
      valid: false,
      message: `不是有效的目录: ${sourceDir}`,
      foundFiles: [],
    }
  }

  const codexPath = path.join(sourceDir, CODEX_CONFIG_FILE)
  const claudePath = path.join(sourceDir, CLAUDE_CONFIG_FILE)

  const foundFiles: string[] = []

  if (fileExists(codexPath)) {
    foundFiles.push(CODEX_CONFIG_FILE)
  }

  if (fileExists(claudePath)) {
    foundFiles.push(CLAUDE_CONFIG_FILE)
  }

  if (foundFiles.length === 0) {
    return {
      valid: false,
      message: `未找到配置文件 (${CODEX_CONFIG_FILE} 或 ${CLAUDE_CONFIG_FILE})`,
      foundFiles: [],
    }
  }

  return {
    valid: true,
    foundFiles,
  }
}

/**
 * 导出配置到指定目录
 *
 * @param targetDir - 目标目录路径
 * @returns 导出结果
 */
export function exportConfig(targetDir: string): ExportResult {
  // 验证源文件
  const validation = validateExport()
  if (!validation.valid) {
    throw new Error(validation.message)
  }

  // 确保目标目录存在
  ensureDir(targetDir)

  const ccmanDir = getCcmanDir()
  const exportedFiles: string[] = []

  // 复制 codex.json
  const codexSrc = path.join(ccmanDir, CODEX_CONFIG_FILE)
  const codexDst = path.join(targetDir, CODEX_CONFIG_FILE)
  if (fileExists(codexSrc)) {
    fs.copyFileSync(codexSrc, codexDst)
    exportedFiles.push(CODEX_CONFIG_FILE)
  }

  // 复制 claude.json
  const claudeSrc = path.join(ccmanDir, CLAUDE_CONFIG_FILE)
  const claudeDst = path.join(targetDir, CLAUDE_CONFIG_FILE)
  if (fileExists(claudeSrc)) {
    fs.copyFileSync(claudeSrc, claudeDst)
    exportedFiles.push(CLAUDE_CONFIG_FILE)
  }

  return {
    success: true,
    targetDir,
    exportedFiles,
  }
}

/**
 * 从指定目录导入配置
 *
 * @param sourceDir - 源目录路径
 * @returns 导入结果（包含备份路径）
 */
export function importConfig(sourceDir: string): ImportResult {
  // 验证源目录
  const validation = validateImportDir(sourceDir)
  if (!validation.valid) {
    throw new Error(validation.message)
  }

  const ccmanDir = getCcmanDir()
  const backupPaths: string[] = []
  const importedFiles: string[] = []

  // 确保 ccman 目录存在
  ensureDir(ccmanDir)

  try {
    // 备份并导入 codex.json
    if (validation.foundFiles.includes(CODEX_CONFIG_FILE)) {
      const codexDst = path.join(ccmanDir, CODEX_CONFIG_FILE)

      // 如果目标文件存在，先备份
      if (fileExists(codexDst)) {
        const backupPath = backupConfig(codexDst)
        backupPaths.push(backupPath)
      }

      // 复制文件
      const codexSrc = path.join(sourceDir, CODEX_CONFIG_FILE)
      fs.copyFileSync(codexSrc, codexDst)
      importedFiles.push(CODEX_CONFIG_FILE)
    }

    // 备份并导入 claude.json
    if (validation.foundFiles.includes(CLAUDE_CONFIG_FILE)) {
      const claudeDst = path.join(ccmanDir, CLAUDE_CONFIG_FILE)

      // 如果目标文件存在，先备份
      if (fileExists(claudeDst)) {
        const backupPath = backupConfig(claudeDst)
        backupPaths.push(backupPath)
      }

      // 复制文件
      const claudeSrc = path.join(sourceDir, CLAUDE_CONFIG_FILE)
      fs.copyFileSync(claudeSrc, claudeDst)
      importedFiles.push(CLAUDE_CONFIG_FILE)
    }

    return {
      success: true,
      backupPaths,
      importedFiles,
    }
  } catch (error) {
    // 导入失败，恢复备份
    for (const backupPath of backupPaths) {
      const originalPath = backupPath.replace(/\.backup\.\d+$/, '')
      if (fileExists(backupPath)) {
        fs.copyFileSync(backupPath, originalPath)
      }
    }

    throw new Error(`导入失败，已恢复备份: ${(error as Error).message}`)
  }
}

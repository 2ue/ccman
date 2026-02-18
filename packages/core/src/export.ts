/**
 * 配置导入导出功能
 *
 * 导出：复制支持的配置文件到指定目录
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
const SUPPORTED_CONFIG_FILES = ['codex.json', 'claude.json', 'openclaw.json'] as const
type SupportedConfigFile = (typeof SUPPORTED_CONFIG_FILES)[number]

/**
 * 导出验证结果
 */
export interface ExportValidation {
  valid: boolean
  message?: string
  missingFiles?: string[]
  foundFiles?: string[]
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
  const foundFiles = SUPPORTED_CONFIG_FILES.filter((filename) =>
    fileExists(path.join(ccmanDir, filename))
  )

  if (foundFiles.length === 0) {
    return {
      valid: false,
      message: `未找到可导出的配置文件 (${SUPPORTED_CONFIG_FILES.join(' / ')})`,
      missingFiles: [...SUPPORTED_CONFIG_FILES],
      foundFiles: [],
    }
  }

  return {
    valid: true,
    foundFiles,
    missingFiles: SUPPORTED_CONFIG_FILES.filter((file) => !foundFiles.includes(file)),
  }
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

  const foundFiles = SUPPORTED_CONFIG_FILES.filter((filename) =>
    fileExists(path.join(sourceDir, filename))
  )

  if (foundFiles.length === 0) {
    return {
      valid: false,
      message: `未找到配置文件 (${SUPPORTED_CONFIG_FILES.join(' / ')})`,
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
  const filesToExport = validation.foundFiles || []

  for (const file of filesToExport) {
    const src = path.join(ccmanDir, file)
    const dst = path.join(targetDir, file)
    if (fileExists(src)) {
      fs.copyFileSync(src, dst)
      exportedFiles.push(file)
    }
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
    // 逐个处理支持的配置文件（缺失文件跳过）
    for (const file of validation.foundFiles as SupportedConfigFile[]) {
      const targetPath = path.join(ccmanDir, file)
      const sourcePath = path.join(sourceDir, file)

      if (fileExists(targetPath)) {
        const backupPath = backupConfig(targetPath)
        backupPaths.push(backupPath)
      }

      fs.copyFileSync(sourcePath, targetPath)
      importedFiles.push(file)
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

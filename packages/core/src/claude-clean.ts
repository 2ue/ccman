/**
 * ~/.claude.json 清理功能
 * 用于清理 Claude Code 配置文件中的历史记录和缓存数据
 */

import * as fs from 'fs'
import { getClaudeJsonPath } from './paths.js'

/**
 * 清理选项
 */
export interface CleanOptions {
  /** 清理项目历史记录 */
  cleanProjectHistory?: boolean
  /** 每个项目保留最近N条记录（默认10条） */
  keepRecentCount?: number
  /** 只清理指定的项目路径（为空则清理所有项目） */
  projectPaths?: string[]

  /** 清理缓存数据 */
  cleanCache?: boolean

  /** 重置使用统计 */
  cleanStats?: boolean
}

/**
 * 清理结果
 */
export interface CleanResult {
  /** 清理前文件大小（字节） */
  sizeBefore: number
  /** 清理后文件大小（字节） */
  sizeAfter: number
  /** 节省的空间（字节） */
  saved: number
  /** 清理的项目数量 */
  cleanedItems: {
    /** 清理的历史记录数量 */
    projectHistory: number
    /** 是否清理了缓存 */
    cache: boolean
    /** 是否清理了统计 */
    stats: boolean
  }
  /** 备份文件路径 */
  backupPath: string
}

/**
 * 分析结果
 */
export interface AnalyzeResult {
  /** 文件大小（字节） */
  fileSize: number
  /** 文件大小（可读格式） */
  fileSizeFormatted: string
  /** 项目总数 */
  projectCount: number
  /** 总历史记录数 */
  totalHistoryCount: number
  /** 各项目的历史记录数 */
  projectHistory: Array<{
    path: string
    count: number
  }>
  /** 缓存大小估计（字节） */
  cacheSize: number
  /** 预计可节省空间（字节） */
  estimatedSavings: {
    conservative: number // 保留10条
    moderate: number // 保留5条
    aggressive: number // 清空历史
  }
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 获取文件大小
 */
function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath)
    return stats.size
  } catch {
    return 0
  }
}

/**
 * 备份文件
 */
function backupFile(filePath: string): string {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const backupPath = `${filePath}.backup-${timestamp}`
  fs.copyFileSync(filePath, backupPath)
  return backupPath
}

/**
 * 原子写入 JSON 文件
 */
function saveJsonAtomic(filePath: string, data: any): void {
  const tempPath = `${filePath}.tmp`
  const content = JSON.stringify(data, null, 2)

  fs.writeFileSync(tempPath, content, { mode: 0o600 })
  fs.renameSync(tempPath, filePath)
}

/**
 * 分析 ~/.claude.json 文件
 * 如果文件不存在，返回空的分析结果
 */
export function analyzeClaudeJson(): AnalyzeResult {
  const filePath = getClaudeJsonPath()

  // 文件不存在时返回空结果
  if (!fs.existsSync(filePath)) {
    return {
      fileSize: 0,
      fileSizeFormatted: '0 B',
      projectCount: 0,
      totalHistoryCount: 0,
      projectHistory: [],
      cacheSize: 0,
      estimatedSavings: {
        conservative: 0,
        moderate: 0,
        aggressive: 0,
      },
    }
  }

  const fileSize = getFileSize(filePath)
  const content = fs.readFileSync(filePath, 'utf-8')
  const config = JSON.parse(content)

  // 分析项目历史
  const projects = config.projects || {}
  const projectHistory: Array<{ path: string; count: number }> = []
  let totalHistoryCount = 0

  for (const [projectPath, projectData] of Object.entries<any>(projects)) {
    const historyCount = projectData.history?.length || 0
    totalHistoryCount += historyCount
    projectHistory.push({
      path: projectPath,
      count: historyCount,
    })
  }

  // 按历史记录数量降序排序
  projectHistory.sort((a, b) => b.count - a.count)

  // 估算缓存大小（仅计算 cachedChangelog）
  const cacheSize = config.cachedChangelog?.length || 0

  // 估算可节省空间
  const historySize = fileSize - cacheSize - 20000 // 减去配置和状态数据
  const avgHistorySize = totalHistoryCount > 0 ? historySize / totalHistoryCount : 0

  const estimatedSavings = {
    conservative: Math.floor(avgHistorySize * Math.max(0, totalHistoryCount - projectHistory.length * 10)) + cacheSize,
    moderate: Math.floor(avgHistorySize * Math.max(0, totalHistoryCount - projectHistory.length * 5)) + cacheSize,
    aggressive: Math.floor(historySize) + cacheSize,
  }

  return {
    fileSize,
    fileSizeFormatted: formatBytes(fileSize),
    projectCount: projectHistory.length,
    totalHistoryCount,
    projectHistory,
    cacheSize,
    estimatedSavings,
  }
}

/**
 * 清理 ~/.claude.json 文件
 */
export function cleanClaudeJson(options: CleanOptions = {}): CleanResult {
  const filePath = getClaudeJsonPath()

  if (!fs.existsSync(filePath)) {
    throw new Error(`${filePath} 文件不存在`)
  }

  // 1. 备份文件
  const backupPath = backupFile(filePath)

  // 2. 读取配置
  const sizeBefore = getFileSize(filePath)
  const content = fs.readFileSync(filePath, 'utf-8')
  const config = JSON.parse(content)

  // 3. 应用清理选项
  const cleanedItems = applyCleanOptions(config, options)

  // 4. 原子写入
  saveJsonAtomic(filePath, config)

  // 5. 返回结果
  const sizeAfter = getFileSize(filePath)

  return {
    sizeBefore,
    sizeAfter,
    saved: sizeBefore - sizeAfter,
    cleanedItems,
    backupPath,
  }
}

/**
 * 应用清理选项到配置对象
 */
function applyCleanOptions(config: any, options: CleanOptions) {
  let projectHistoryCount = 0

  // 清理项目历史
  if (options.cleanProjectHistory && config.projects) {
    const keepCount = options.keepRecentCount ?? 10
    const targetProjects = options.projectPaths || []

    for (const [projectPath, projectData] of Object.entries<any>(config.projects)) {
      // 如果指定了项目列表，只清理列表中的项目
      if (targetProjects.length > 0 && !targetProjects.includes(projectPath)) {
        continue
      }

      if (projectData.history && Array.isArray(projectData.history)) {
        const originalCount = projectData.history.length
        projectData.history = projectData.history.slice(-keepCount)
        projectHistoryCount += originalCount - projectData.history.length
      }
    }
  }

  // 清理缓存（仅清理 cachedChangelog）
  if (options.cleanCache) {
    delete config.cachedChangelog
    config.changelogLastFetched = 0
  }

  // 清理统计
  if (options.cleanStats) {
    config.numStartups = 0
    config.promptQueueUseCount = 0
    config.tipsHistory = {}
  }

  return {
    projectHistory: projectHistoryCount,
    cache: options.cleanCache || false,
    stats: options.cleanStats || false,
  }
}

/**
 * 预设清理方案
 */
export const CleanPresets = {
  /** 保守清理：保留最近10条记录，清理缓存 */
  conservative: (): CleanOptions => ({
    cleanProjectHistory: true,
    keepRecentCount: 10,
    cleanCache: true,
    cleanStats: false,
  }),

  /** 中等清理：保留最近5条记录，清理缓存和统计 */
  moderate: (): CleanOptions => ({
    cleanProjectHistory: true,
    keepRecentCount: 5,
    cleanCache: true,
    cleanStats: true,
  }),

  /** 激进清理：清空历史记录，清理缓存和统计 */
  aggressive: (): CleanOptions => ({
    cleanProjectHistory: true,
    keepRecentCount: 0,
    cleanCache: true,
    cleanStats: true,
  }),
}

/**
 * 项目详情
 */
export interface ProjectDetail {
  /** 项目路径 */
  path: string
  /** 历史记录数量 */
  historyCount: number
  /** 估计大小（字节） */
  estimatedSize: number
  /** 最后一条消息（可选） */
  lastMessage?: string
}

/**
 * 缓存详情
 */
export interface CacheDetail {
  /** 缓存键名 */
  key: string
  /** 友好名称 */
  name: string
  /** 大小（字节） */
  size: number
  /** 大小（可读格式） */
  sizeFormatted: string
  /** 最后更新时间（可选） */
  lastUpdated?: number
}

/**
 * 获取所有项目详情
 */
export function getProjectDetails(): ProjectDetail[] {
  const filePath = getClaudeJsonPath()

  // 文件不存在时返回空数组
  if (!fs.existsSync(filePath)) {
    return []
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const config = JSON.parse(content)
  const projects = config.projects || {}

  const details: ProjectDetail[] = []

  for (const [projectPath, projectData] of Object.entries<any>(projects)) {
    const history = projectData.history || []
    const historyCount = history.length

    // 估算大小（JSON字符串长度）
    const estimatedSize = JSON.stringify(projectData).length

    // 获取最后一条消息
    const lastMessage = history.length > 0 ? history[history.length - 1]?.display : undefined

    details.push({
      path: projectPath,
      historyCount,
      estimatedSize,
      lastMessage,
    })
  }

  // 按大小降序排序
  details.sort((a, b) => b.estimatedSize - a.estimatedSize)

  return details
}

/**
 * 获取所有缓存详情（仅包含 cachedChangelog）
 */
export function getCacheDetails(): CacheDetail[] {
  const filePath = getClaudeJsonPath()

  // 文件不存在时返回空数组
  if (!fs.existsSync(filePath)) {
    return []
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const config = JSON.parse(content)

  const caches: CacheDetail[] = []

  // 仅返回更新日志缓存
  if (config.cachedChangelog) {
    caches.push({
      key: 'cachedChangelog',
      name: '更新日志',
      size: config.cachedChangelog.length,
      sizeFormatted: formatBytes(config.cachedChangelog.length),
      lastUpdated: config.changelogLastFetched,
    })
  }

  return caches
}

/**
 * 删除单个项目（删除整个项目条目，包括历史记录和配置）
 */
export function deleteProjectHistory(projectPath: string): void {
  const filePath = getClaudeJsonPath()

  if (!fs.existsSync(filePath)) {
    throw new Error(`${filePath} 文件不存在`)
  }

  // 备份文件
  backupFile(filePath)

  // 读取配置
  const content = fs.readFileSync(filePath, 'utf-8')
  const config = JSON.parse(content)

  // 删除指定项目条目（从 config.projects 中删除该字段）
  if (config.projects && config.projects[projectPath]) {
    delete config.projects[projectPath]
  } else {
    throw new Error(`项目不存在: ${projectPath}`)
  }

  // 原子写入
  saveJsonAtomic(filePath, config)
}

/**
 * 删除单个缓存项（仅支持 cachedChangelog）
 */
export function deleteCacheItem(cacheKey: string): void {
  const filePath = getClaudeJsonPath()

  if (!fs.existsSync(filePath)) {
    throw new Error(`${filePath} 文件不存在`)
  }

  // 只支持删除 cachedChangelog
  if (cacheKey !== 'cachedChangelog') {
    throw new Error(`不支持删除此缓存项: ${cacheKey}`)
  }

  // 备份文件
  backupFile(filePath)

  // 读取配置
  const content = fs.readFileSync(filePath, 'utf-8')
  const config = JSON.parse(content)

  // 删除更新日志缓存
  delete config.cachedChangelog
  config.changelogLastFetched = 0

  // 原子写入
  saveJsonAtomic(filePath, config)
}

/**
 * 历史记录条目
 */
export interface HistoryEntry {
  /** 显示文本 */
  display: string
  /** 粘贴内容 */
  pastedContents: Record<string, any>
}

/**
 * 获取项目的历史记录
 */
export function getProjectHistory(projectPath: string): HistoryEntry[] {
  const filePath = getClaudeJsonPath()

  // 文件不存在时返回空数组
  if (!fs.existsSync(filePath)) {
    return []
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const config = JSON.parse(content)

  if (!config.projects?.[projectPath]) {
    return []
  }

  return config.projects[projectPath].history || []
}

/**
 * 删除单条历史记录（不备份）
 */
export function deleteHistoryEntry(projectPath: string, index: number): void {
  const filePath = getClaudeJsonPath()

  if (!fs.existsSync(filePath)) {
    throw new Error(`${filePath} 文件不存在`)
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const config = JSON.parse(content)

  if (!config.projects?.[projectPath]?.history) {
    throw new Error('项目或历史记录不存在')
  }

  if (index < 0 || index >= config.projects[projectPath].history.length) {
    throw new Error(`无效的索引: ${index}`)
  }

  // 删除指定索引的历史记录
  config.projects[projectPath].history.splice(index, 1)

  // 原子写入（不备份）
  saveJsonAtomic(filePath, config)
}

/**
 * 清空项目历史记录（不备份）
 */
export function clearProjectHistory(projectPath: string): void {
  const filePath = getClaudeJsonPath()

  if (!fs.existsSync(filePath)) {
    throw new Error(`${filePath} 文件不存在`)
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const config = JSON.parse(content)

  if (!config.projects?.[projectPath]) {
    throw new Error(`项目不存在: ${projectPath}`)
  }

  // 清空历史记录
  config.projects[projectPath].history = []

  // 原子写入（不备份）
  saveJsonAtomic(filePath, config)
}

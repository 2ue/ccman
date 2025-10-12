/**
 * WebDAV 客户端封装
 */

import { createClient, type WebDAVClient } from 'webdav'
import type { SyncConfig } from './types.js'

/**
 * 规范化远程路径（处理结束斜线）
 *
 * @param dir - 目录路径
 * @returns 规范化后的路径（确保以 / 开头，不以 / 结尾，除非是根目录）
 */
export function normalizePath(dir?: string): string {
  if (!dir || dir === '/') {
    return '/'
  }

  // 移除开头和结尾的斜线
  let normalized = dir.trim().replace(/^\/+/, '').replace(/\/+$/, '')

  // 添加开头的斜线
  return `/${normalized}`
}

/**
 * 拼接路径
 *
 * @param baseDir - 基础目录
 * @param filename - 文件名
 * @returns 完整路径
 */
export function joinPath(baseDir: string, filename: string): string {
  const normalizedBase = normalizePath(baseDir)
  const normalizedFile = filename.replace(/^\/+/, '')

  if (normalizedBase === '/') {
    return `/${normalizedFile}`
  }

  return `${normalizedBase}/${normalizedFile}`
}

/**
 * 创建 WebDAV 客户端
 *
 * @param config - WebDAV 配置
 * @returns WebDAV 客户端实例
 */
export function createWebDAVClient(config: SyncConfig): WebDAVClient {
  const client = createClient(config.webdavUrl, {
    username: config.username,
    password: config.password,
    authType: config.authType || 'password', // 默认使用 Basic Auth
    maxBodyLength: 100 * 1024 * 1024, // 100MB
    maxContentLength: 100 * 1024 * 1024, // 100MB
  } as any) // 使用 any 绕过类型检查，因为这些配置是有效的

  return client
}

/**
 * 测试 WebDAV 连接
 *
 * @param config - WebDAV 配置
 * @returns 连接是否成功
 */
export async function testWebDAVConnection(config: SyncConfig): Promise<boolean> {
  try {
    const client = createWebDAVClient(config)

    // 尝试多种测试方法，以兼容不同的 WebDAV 服务器
    try {
      // 方法1：检查根目录是否存在
      await client.exists('/')
      return true
    } catch (error1) {
      console.log('方法1失败，尝试方法2:', error1)

      try {
        // 方法2：获取根目录内容
        await client.getDirectoryContents('/')
        return true
      } catch (error2) {
        console.log('方法2失败，尝试方法3:', error2)

        try {
          // 方法3：尝试创建测试目录
          const testDir = '/.ccman-test'
          await client.createDirectory(testDir)
          // 创建成功后立即删除
          try {
            await client.deleteFile(testDir)
          } catch (e) {
            // 忽略删除错误
          }
          return true
        } catch (error3) {
          console.error('所有测试方法都失败')
          throw error3
        }
      }
    }
  } catch (error) {
    console.error('WebDAV 连接失败:', error)
    return false
  }
}

/**
 * 递归创建目录（静默失败，允许某些服务器不支持目录创建）
 *
 * @param config - WebDAV 配置
 * @param dirPath - 目录路径
 * @returns 是否成功创建（false 表示创建失败，但不抛出错误）
 */
export async function ensureDirectory(
  config: SyncConfig,
  dirPath: string
): Promise<boolean> {
  const client = createWebDAVClient(config)
  const normalizedPath = normalizePath(dirPath)

  // 根目录不需要创建
  if (normalizedPath === '/') {
    return true
  }

  try {
    // 检查目录是否已存在
    const exists = await client.exists(normalizedPath)
    if (exists) {
      return true
    }

    // 递归创建父目录
    const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'))
    if (parentPath && parentPath !== '/') {
      await ensureDirectory(config, parentPath)
    }

    // 尝试创建当前目录
    await client.createDirectory(normalizedPath)
    return true
  } catch (error) {
    // 静默失败，允许某些服务器不支持目录创建或已存在
    console.warn(`创建目录 ${normalizedPath} 失败，将尝试直接上传文件:`, (error as Error).message)
    return false
  }
}

/**
 * 上传数据到 WebDAV
 *
 * @param config - WebDAV 配置
 * @param filename - 文件名（相对于 remoteDir 的路径）
 * @param data - 数据内容
 */
export async function uploadToWebDAV(
  config: SyncConfig,
  filename: string,
  data: string
): Promise<void> {
  const client = createWebDAVClient(config)
  const remoteDir = normalizePath(config.remoteDir || '/')
  const fullPath = joinPath(remoteDir, filename)

  try {
    // 尝试确保目标目录存在（静默失败）
    const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'))
    if (dirPath && dirPath !== '/') {
      await ensureDirectory(config, dirPath)
    }

    // 直接上传文件（某些服务器会自动创建父目录）
    await client.putFileContents(fullPath, data, {
      overwrite: true,
    })
  } catch (error) {
    throw new Error(`上传失败: ${(error as Error).message}`)
  }
}

/**
 * 从 WebDAV 下载数据
 *
 * @param config - WebDAV 配置
 * @param filename - 文件名（相对于 remoteDir 的路径）
 * @returns 文件内容
 */
export async function downloadFromWebDAV(
  config: SyncConfig,
  filename: string
): Promise<string> {
  const client = createWebDAVClient(config)
  const remoteDir = normalizePath(config.remoteDir || '/')
  const fullPath = joinPath(remoteDir, filename)

  try {
    const contents = await client.getFileContents(fullPath, { format: 'text' })
    return contents as string
  } catch (error) {
    throw new Error(`下载失败: ${(error as Error).message}`)
  }
}

/**
 * 检查 WebDAV 上是否存在文件
 *
 * @param config - WebDAV 配置
 * @param filename - 文件名（相对于 remoteDir 的路径）
 * @returns 文件是否存在
 */
export async function existsOnWebDAV(config: SyncConfig, filename: string): Promise<boolean> {
  const client = createWebDAVClient(config)
  const remoteDir = normalizePath(config.remoteDir || '/')
  const fullPath = joinPath(remoteDir, filename)

  try {
    return await client.exists(fullPath)
  } catch (error) {
    return false
  }
}

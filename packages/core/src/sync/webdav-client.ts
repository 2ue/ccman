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
  const remoteDir = normalizePath(config.remoteDir || '/')

  try {
    const client = createWebDAVClient(config)

    // 尝试读取远程目录内容（真正测试连接和权限）
    await client.getDirectoryContents(remoteDir)
    return true
  } catch (error) {
    // 连接失败就是失败，不需要过度分析原因
    // 用户会自己检查配置
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
 * 判断是否为路径不存在错误
 */
function isPathNotFoundError(error: Error): boolean {
  const msg = error.message.toLowerCase()
  // WebDAV 标准：409 Conflict 表示父目录不存在
  // 也可能是 404 Not Found
  return msg.includes('404') || msg.includes('409') || msg.includes('not found') || msg.includes('conflict')
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
    // 先直接上传（乐观策略：大多数 WebDAV 支持自动创建父目录）
    await client.putFileContents(fullPath, data, { overwrite: true })
  } catch (firstError) {
    // 如果是路径不存在错误，尝试创建目录后重试
    if (isPathNotFoundError(firstError as Error)) {
      const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'))
      if (dirPath && dirPath !== '/') {
        await ensureDirectory(config, dirPath)
        // 重试上传
        await client.putFileContents(fullPath, data, { overwrite: true })
      } else {
        throw firstError
      }
    } else {
      // 其他错误直接抛出
      throw firstError
    }
  }

  // 验证文件是否真的上传成功
  try {
    const exists = await client.exists(fullPath)
    if (!exists) {
      throw new Error(`文件上传后未在服务器上找到: ${fullPath}`)
    }
  } catch (verifyError) {
    const errorMsg = (verifyError as Error).message

    // 特殊处理 WebDAV 连接问题
    if (errorMsg.includes('multistatus') || errorMsg.includes('Invalid response')) {
      throw new Error(
        'WebDAV 配置错误，请检查：\n' +
        '1. URL 是否为 WebDAV 端点（不是网页地址）\n' +
        '2. 用户名和密码是否正确\n' +
        '3. 认证类型是否匹配\n\n' +
        `详细：${errorMsg}`
      )
    }

    throw verifyError
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


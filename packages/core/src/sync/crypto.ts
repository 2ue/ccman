/**
 * API Key 加密/解密模块
 *
 * 使用 AES-256-GCM 对称加密算法
 * 使用 PBKDF2 从用户密码派生密钥
 */

import * as crypto from 'crypto'
import type { Provider } from '../tool-manager.js'

// 加密算法配置
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32
const TAG_LENGTH = 16
const PBKDF2_ITERATIONS = 100000

/**
 * 从密码派生加密密钥
 *
 * @param password - 用户密码
 * @param salt - 盐值
 * @returns 派生的密钥
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
}

/**
 * 加密 API Key
 *
 * @param apiKey - 明文 API Key
 * @param password - 用户密码
 * @returns 加密后的字符串（base64 编码）
 */
export function encryptApiKey(apiKey: string, password: string): string {
  // 生成随机 salt 和 IV
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)

  // 从密码派生密钥
  const key = deriveKey(password, salt)

  // 创建加密器
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  // 加密
  let encrypted = cipher.update(apiKey, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  // 获取认证标签
  const tag = cipher.getAuthTag()

  // 组合: salt + iv + tag + encrypted
  // 格式: [salt(32)][iv(16)][tag(16)][encrypted(n)]
  const result = Buffer.concat([salt, iv, tag, encrypted])

  // 返回 base64 编码
  return result.toString('base64')
}

/**
 * 解密 API Key
 *
 * @param encryptedApiKey - 加密的 API Key（base64 编码）
 * @param password - 用户密码
 * @returns 明文 API Key
 * @throws Error 如果密码错误或数据损坏
 */
export function decryptApiKey(encryptedApiKey: string, password: string): string {
  try {
    // 解码 base64
    const data = Buffer.from(encryptedApiKey, 'base64')

    // 提取各部分
    const salt = data.subarray(0, SALT_LENGTH)
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag = data.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    )
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

    // 从密码派生密钥
    const key = deriveKey(password, salt)

    // 创建解密器
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    // 解密
    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch (error) {
    throw new Error('解密失败：密码错误或数据损坏')
  }
}

/**
 * 批量加密 providers 的 apiKey 字段
 *
 * @param providers - Provider 列表
 * @param password - 用户密码
 * @returns 加密后的 Provider 列表（apiKey 字段是加密后的字符串）
 */
export function encryptProviders(
  providers: Provider[],
  password: string
): Provider[] {
  return providers.map((provider) => ({
    ...provider,
    apiKey: encryptApiKey(provider.apiKey, password),
  }))
}

/**
 * 批量解密 providers 的 apiKey 字段
 *
 * @param encryptedProviders - 加密的 Provider 列表（apiKey 字段是加密后的字符串）
 * @param password - 用户密码
 * @returns 解密后的 Provider 列表（apiKey 字段是明文）
 * @throws Error 如果密码错误
 */
export function decryptProviders(
  encryptedProviders: Provider[],
  password: string
): Provider[] {
  return encryptedProviders.map((provider) => ({
    ...provider,
    apiKey: decryptApiKey(provider.apiKey, password),
  }))
}

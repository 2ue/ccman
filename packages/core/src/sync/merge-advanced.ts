/**
 * 智能合并逻辑
 *
 * 合并规则：
 * 1. 唯一标识：使用 id
 * 2. 相同配置判断：baseUrl + apiKey 相同 = 同一配置
 * 3. name 冲突：使用 name_2, name_3 格式
 * 4. lastModified 迁移兼容：默认为 createdAt
 */

import type { Provider } from '../tool-manager.js'

/**
 * 合并结果
 */
export interface MergeResult {
  /** 合并后的 provider 列表 */
  merged: Provider[]
  /** 是否有变化 */
  hasChanges: boolean
}

/**
 * 确保 provider 有 lastModified 字段（迁移兼容）
 *
 * @param provider - Provider
 * @returns 带 lastModified 的 Provider
 */
function ensureLastModified(provider: Provider): Provider {
  if (provider.lastModified === undefined) {
    return {
      ...provider,
      lastModified: provider.createdAt,
    }
  }
  return provider
}

/**
 * 判断两个 provider 是否为相同配置
 * 规则：baseUrl + apiKey 相同 = 同一配置
 *
 * @param a - Provider A
 * @param b - Provider B
 * @returns 是否相同配置
 */
function isSameConfig(a: Provider, b: Provider): boolean {
  return a.baseUrl === b.baseUrl && a.apiKey === b.apiKey
}

/**
 * 判断两个 provider 是否完全相同（所有字段）
 *
 * @param a - Provider A
 * @param b - Provider B
 * @returns 是否完全相同
 */
export function isProviderEqual(a: Provider, b: Provider): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.baseUrl === b.baseUrl &&
    a.apiKey === b.apiKey
  )
}

/**
 * 解决 name 冲突
 * 如果 name 已存在，自动重命名为 name_2, name_3 ...
 *
 * @param existingProviders - 已有的 provider 列表
 * @param newProvider - 新的 provider
 * @returns 重命名后的 provider
 */
function resolveNameConflict(existingProviders: Provider[], newProvider: Provider): Provider {
  const existingNames = new Set(existingProviders.map((p) => p.name))

  // 如果名称不冲突，直接返回
  if (!existingNames.has(newProvider.name)) {
    return newProvider
  }

  // 寻找可用的后缀数字
  let suffix = 2
  let newName = `${newProvider.name}_${suffix}`

  while (existingNames.has(newName)) {
    suffix++
    newName = `${newProvider.name}_${suffix}`
  }

  console.log(`name 冲突：将 "${newProvider.name}" 重命名为 "${newName}"`)

  return {
    ...newProvider,
    name: newName,
  }
}

/**
 * 智能合并两个 provider 列表
 *
 * 合并逻辑：
 * 1. 相同 id：比较 lastModified，保留最新的
 * 2. 相同配置（baseUrl + apiKey）：合并为一个，保留最新的
 * 3. 不同 id 且不同配置：都保留，处理 name 冲突
 *
 * @param local - 本地 provider 列表
 * @param remote - 远程 provider 列表
 * @returns 合并结果
 */
export function mergeProviders(local: Provider[], remote: Provider[]): MergeResult {
  // 确保所有 provider 都有 lastModified（迁移兼容）
  const localProviders = local.map(ensureLastModified)
  const remoteProviders = remote.map(ensureLastModified)

  // 用于存储合并结果
  const mergedMap = new Map<string, Provider>()
  let hasChanges = false

  // 步骤1：处理本地 providers
  for (const localProvider of localProviders) {
    mergedMap.set(localProvider.id, localProvider)
  }

  // 步骤2：处理远程 providers
  for (const remoteProvider of remoteProviders) {
    // 情况1：相同 id（同一个 provider）
    if (mergedMap.has(remoteProvider.id)) {
      const localProvider = mergedMap.get(remoteProvider.id)!

      // 比较 lastModified，保留最新的
      if (remoteProvider.lastModified > localProvider.lastModified) {
        console.log(`provider ${remoteProvider.id} 远程更新，使用远程版本`)
        mergedMap.set(remoteProvider.id, remoteProvider)
        hasChanges = true
      } else if (remoteProvider.lastModified < localProvider.lastModified) {
        console.log(`provider ${remoteProvider.id} 本地更新，使用本地版本`)
        hasChanges = true
      } else {
        // lastModified 相同，检查内容是否变化
        if (!isProviderEqual(localProvider, remoteProvider)) {
          console.log(`provider ${remoteProvider.id} 时间戳相同但内容不同，使用远程版本`)
          mergedMap.set(remoteProvider.id, remoteProvider)
          hasChanges = true
        }
      }
    } else {
      // 情况2：不同 id，检查是否为相同配置（baseUrl + apiKey）
      const existingWithSameConfig = Array.from(mergedMap.values()).find((p) =>
        isSameConfig(p, remoteProvider)
      )

      if (existingWithSameConfig) {
        // 相同配置，比较 lastModified
        if (remoteProvider.lastModified > existingWithSameConfig.lastModified) {
          console.log(
            `相同配置 (${remoteProvider.baseUrl})，远程更新，替换 ${existingWithSameConfig.id} 为 ${remoteProvider.id}`
          )
          mergedMap.delete(existingWithSameConfig.id)
          mergedMap.set(remoteProvider.id, remoteProvider)
          hasChanges = true
        } else {
          console.log(
            `相同配置 (${remoteProvider.baseUrl})，本地更新，保留 ${existingWithSameConfig.id}`
          )
          hasChanges = true
        }
      } else {
        // 情况3：不同 id 且不同配置，添加新 provider
        console.log(`新 provider ${remoteProvider.id}，添加到合并列表`)

        // 检查并解决 name 冲突
        const existingProviders = Array.from(mergedMap.values())
        const resolvedProvider = resolveNameConflict(existingProviders, remoteProvider)

        mergedMap.set(resolvedProvider.id, resolvedProvider)
        hasChanges = true
      }
    }
  }

  // 转换为数组
  const merged = Array.from(mergedMap.values())

  return {
    merged,
    hasChanges,
  }
}

/**
 * 检查两个 provider 列表是否完全相同
 *
 * @param local - 本地 provider 列表
 * @param remote - 远程 provider 列表
 * @returns 是否完全相同
 */
export function areProvidersEqual(local: Provider[], remote: Provider[]): boolean {
  if (local.length !== remote.length) {
    return false
  }

  // 按 id 排序后比较
  const localSorted = [...local].sort((a, b) => a.id.localeCompare(b.id))
  const remoteSorted = [...remote].sort((a, b) => a.id.localeCompare(b.id))

  for (let i = 0; i < localSorted.length; i++) {
    if (!isProviderEqual(localSorted[i], remoteSorted[i])) {
      return false
    }
  }

  return true
}

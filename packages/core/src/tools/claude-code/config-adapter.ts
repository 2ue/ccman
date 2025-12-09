/**
 * Claude Code ConfigAdapter
 */

import type { ConfigAdapter, MergeMode } from '../../types.js'
import { getClaudeConfigPath, getClaudeDir } from '../../adapters/path-resolver.js'
import { safeReadFile, safeWriteFileSync, ensureDir } from '../../adapters/filesystem.js'
import { deepMerge } from '../../adapters/template-engine.js'

export class ClaudeConfigAdapter implements ConfigAdapter {
  read(pathId: string): unknown {
    if (pathId !== 'main') {
      throw new Error(`Unknown pathId: ${pathId}`)
    }

    const content = safeReadFile(getClaudeConfigPath())
    if (!content) {
      return {}
    }

    try {
      return JSON.parse(content)
    } catch (error) {
      throw new Error(`Failed to parse Claude config: ${error}`)
    }
  }

  write(pathId: string, data: unknown, mode: MergeMode = 'old-override-new'): void {
    if (pathId !== 'main') {
      throw new Error(`Unknown pathId: ${pathId}`)
    }

    // 确保目录存在
    ensureDir(getClaudeDir())

    // 读取现有配置
    const existing = this.read(pathId)

    // 合并配置
    const merged = this.merge(pathId, existing, data, mode)

    // 写入
    const configPath = getClaudeConfigPath()
    safeWriteFileSync(configPath, JSON.stringify(merged, null, 2))
  }

  merge(
    pathId: string,
    base: unknown,
    override: unknown,
    mode: MergeMode = 'old-override-new'
  ): unknown {
    return deepMerge(base, override, mode)
  }

  validate(pathId: string, data: unknown): void {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Claude config must be an object')
    }
  }
}

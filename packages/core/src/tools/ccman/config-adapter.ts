/**
 * ccman ConfigAdapter - Manages ccman's own configuration
 */

import fs from 'fs'
import path from 'path'
import type { ConfigAdapter, MergeMode } from '../../types.js'
import { safeReadFile, safeWriteFileSync } from '../../adapters/filesystem.js'
import { deepMerge } from '../../adapters/template-engine.js'
import { getRootDir } from '../../adapters/path-resolver.js'

export class CcmanConfigAdapter implements ConfigAdapter {
  private getConfigPath(pathId: string): string {
    const base = path.join(getRootDir(), '.ccman')
    switch (pathId) {
      case 'main':
        return path.join(base, 'config.json')
      case 'presets':
        return path.join(base, 'presets.json')
      case 'mcp':
        return path.join(base, 'mcp.json')
      default:
        throw new Error(`Unknown pathId: ${pathId}`)
    }
  }

  read(pathId: string): unknown {
    const configPath = this.getConfigPath(pathId)
    const content = safeReadFile(configPath)

    if (!content) {
      return {}
    }

    try {
      return JSON.parse(content)
    } catch (error) {
      throw new Error(
        `Failed to parse ${pathId} config: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  write(pathId: string, data: unknown, mode: MergeMode = 'old-override-new'): void {
    const configPath = this.getConfigPath(pathId)
    const existing = this.read(pathId)
    const merged = this.merge(pathId, existing, data, mode)

    // Ensure directory exists
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    }

    try {
      const content = JSON.stringify(merged, null, 2)
      safeWriteFileSync(configPath, content, { mode: 0o600 })
    } catch (error) {
      throw new Error(
        `Failed to write ${pathId} config: ${error instanceof Error ? error.message : String(error)}`
      )
    }
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
      throw new Error(`Invalid ${pathId} config: expected object, got ${typeof data}`)
    }

    // Basic structure validation for each config type
    // Specific validation rules can be added as needed for each pathId
  }
}

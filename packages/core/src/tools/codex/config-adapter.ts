/**
 * Codex ConfigAdapter - Handles TOML and JSON config files
 */

import * as TOML from '@iarna/toml'
import fs from 'fs'
import path from 'path'
import os from 'os'
import type { ConfigAdapter, MergeMode } from '../../types.js'
import { safeReadFile, safeWriteFileSync } from '../../adapters/filesystem.js'
import { deepMerge } from '../../adapters/template-engine.js'

export class CodexConfigAdapter implements ConfigAdapter {
  private getConfigPath(pathId: string): string {
    const base = path.join(os.homedir(), '.codex')
    switch (pathId) {
      case 'main':
        return path.join(base, 'config.toml')
      case 'auth':
        return path.join(base, 'auth.json')
      default:
        throw new Error(`Unknown pathId: ${pathId}`)
    }
  }

  private isTomlPath(pathId: string): boolean {
    return pathId === 'main'
  }

  read(pathId: string): unknown {
    const configPath = this.getConfigPath(pathId)
    const content = safeReadFile(configPath)

    if (!content) {
      return this.isTomlPath(pathId) ? {} : {}
    }

    try {
      if (this.isTomlPath(pathId)) {
        return TOML.parse(content)
      } else {
        return JSON.parse(content)
      }
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
      let content: string
      if (this.isTomlPath(pathId)) {
        content = TOML.stringify(merged as TOML.JsonMap)
      } else {
        content = JSON.stringify(merged, null, 2)
      }

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

    if (pathId === 'main') {
      // Basic TOML structure validation
      const config = data as Record<string, unknown>
      if (config.model_provider && typeof config.model_provider !== 'string') {
        throw new Error('model_provider must be a string')
      }
    }

    if (pathId === 'auth') {
      // Basic auth structure validation
      // Auth file typically contains provider credentials
      // Structure validation can be added as needed
    }
  }
}

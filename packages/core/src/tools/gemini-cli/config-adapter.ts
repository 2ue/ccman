/**
 * Gemini CLI ConfigAdapter - Handles JSON and .env files
 */

import fs from 'fs'
import path from 'path'
import type { ConfigAdapter, MergeMode } from '../../types.js'
import { safeReadFile, safeWriteFileSync } from '../../adapters/filesystem.js'
import { deepMerge } from '../../adapters/template-engine.js'
import { getGeminiSettingsPath, getGeminiEnvPath } from '../../adapters/path-resolver.js'

export class GeminiConfigAdapter implements ConfigAdapter {
  private getConfigPath(pathId: string): string {
    switch (pathId) {
      case 'main':
        return getGeminiSettingsPath()
      case 'env':
        return getGeminiEnvPath()
      default:
        throw new Error(`Unknown pathId: ${pathId}`)
    }
  }

  private isEnvPath(pathId: string): boolean {
    return pathId === 'env'
  }

  /**
   * Parse .env file into key-value object
   */
  private parseEnv(content: string): Record<string, string> {
    const result: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      const value = trimmed.slice(eqIndex + 1).trim()
      if (!key) continue
      result[key] = value
    }
    return result
  }

  /**
   * Serialize key-value object to .env format
   */
  private serializeEnv(env: Record<string, string>): string {
    const lines: string[] = []
    const keys = Object.keys(env).sort()
    for (const key of keys) {
      lines.push(`${key}=${String(env[key])}`)
    }
    return lines.join('\n') + (lines.length ? '\n' : '')
  }

  read(pathId: string): unknown {
    const configPath = this.getConfigPath(pathId)
    const content = safeReadFile(configPath)

    if (!content) {
      return this.isEnvPath(pathId) ? {} : {}
    }

    try {
      if (this.isEnvPath(pathId)) {
        return this.parseEnv(content)
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
      if (this.isEnvPath(pathId)) {
        content = this.serializeEnv(merged as Record<string, string>)
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
      // Validate settings.json structure
      const config = data as Record<string, unknown>
      if (config.ide && typeof config.ide !== 'object') {
        throw new Error('ide must be an object')
      }
      if (config.security && typeof config.security !== 'object') {
        throw new Error('security must be an object')
      }
    }

    if (pathId === 'env') {
      // Validate .env structure (all string values)
      const env = data as Record<string, unknown>
      for (const [key, value] of Object.entries(env)) {
        if (typeof value !== 'string') {
          throw new Error(`env variable ${key} must be a string, got ${typeof value}`)
        }
      }
    }
  }
}

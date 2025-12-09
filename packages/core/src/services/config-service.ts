/**
 * ConfigService - Unified configuration file management
 */

import { ToolRegistry } from './tool-registry.js'
import type { Tool, MergeMode } from '../types.js'

/**
 * Custom error classes
 */
export class ConfigPathNotFoundError extends Error {
  constructor(tool: Tool, pathId: string) {
    super(`Config path "${pathId}" not found for tool "${tool}"`)
    this.name = 'ConfigPathNotFoundError'
  }
}

export class ConfigOperationError extends Error {
  constructor(message: string) {
    super(`Config operation failed: ${message}`)
    this.name = 'ConfigOperationError'
  }
}

/**
 * Update options
 */
interface UpdateOptions {
  mode?: MergeMode
}

/**
 * ConfigService implementation
 */
class ConfigServiceImpl {
  /**
   * List all config paths for a tool
   * Returns an object mapping pathId to filesystem path
   */
  listPaths(tool: Tool): Record<string, string> {
    const descriptor = ToolRegistry.get(tool)

    const paths: Record<string, string> = {}
    for (const configPath of descriptor.configPaths) {
      paths[configPath.id] = configPath.path
    }

    return paths
  }

  /**
   * Get config file(s) for a tool
   * @param tool Tool ID
   * @param pathId Optional specific path ID. If not provided, returns all configs
   * @returns Config object or object with all configs
   */
  get(tool: Tool, pathId?: string): unknown {
    const descriptor = ToolRegistry.get(tool)

    if (!descriptor.adapters.config) {
      throw new ConfigOperationError(`Tool "${tool}" does not have config adapter`)
    }

    // If pathId is specified, return only that config
    if (pathId) {
      const configPath = descriptor.configPaths.find((cp) => cp.id === pathId)
      if (!configPath) {
        throw new ConfigPathNotFoundError(tool, pathId)
      }

      return descriptor.adapters.config.read(pathId)
    }

    // Otherwise, return all configs
    const allConfigs: Record<string, unknown> = {}
    for (const configPath of descriptor.configPaths) {
      allConfigs[configPath.id] = descriptor.adapters.config.read(configPath.id)
    }

    return allConfigs
  }

  /**
   * Update a specific config file
   * @param tool Tool ID
   * @param pathId Config path ID
   * @param data Update data
   * @param options Update options (merge mode)
   */
  update(tool: Tool, pathId: string, data: unknown, options: UpdateOptions = {}): void {
    const descriptor = ToolRegistry.get(tool)

    if (!descriptor.adapters.config) {
      throw new ConfigOperationError(`Tool "${tool}" does not have config adapter`)
    }

    // Verify pathId exists
    const configPath = descriptor.configPaths.find((cp) => cp.id === pathId)
    if (!configPath) {
      throw new ConfigPathNotFoundError(tool, pathId)
    }

    // Default to old-override-new (preserves user customizations)
    const mode = options.mode || 'old-override-new'

    // Delegate to ConfigAdapter
    descriptor.adapters.config.write(pathId, data, mode)
  }

  /**
   * Set a specific config file (overwrite mode)
   * This is a convenience method that uses new-override-old mode
   */
  set(tool: Tool, pathId: string, data: unknown): void {
    this.update(tool, pathId, data, { mode: 'new-override-old' })
  }

  /**
   * Merge data into a specific config file (preserving existing values)
   * This is a convenience method that uses old-override-new mode
   */
  merge(tool: Tool, pathId: string, data: unknown): void {
    this.update(tool, pathId, data, { mode: 'old-override-new' })
  }

  /**
   * Validate config data for a tool
   * @param tool Tool ID
   * @param pathId Config path ID
   * @param data Config data to validate
   */
  validate(tool: Tool, pathId: string, data: unknown): void {
    const descriptor = ToolRegistry.get(tool)

    if (!descriptor.adapters.config) {
      throw new ConfigOperationError(`Tool "${tool}" does not have config adapter`)
    }

    // Verify pathId exists
    const configPath = descriptor.configPaths.find((cp) => cp.id === pathId)
    if (!configPath) {
      throw new ConfigPathNotFoundError(tool, pathId)
    }

    // Delegate to ConfigAdapter
    if (descriptor.adapters.config.validate) {
      descriptor.adapters.config.validate(pathId, data)
    }
  }

  /**
   * Get config file metadata
   */
  getMetadata(tool: Tool, pathId?: string): any {
    const descriptor = ToolRegistry.get(tool)

    if (pathId) {
      const configPath = descriptor.configPaths.find((cp) => cp.id === pathId)
      if (!configPath) {
        throw new ConfigPathNotFoundError(tool, pathId)
      }
      return configPath
    }

    return descriptor.configPaths
  }
}

// Export singleton instance
export const ConfigService = new ConfigServiceImpl()

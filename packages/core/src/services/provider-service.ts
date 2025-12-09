/**
 * ProviderService - Unified provider management for all tools
 */

import fs from 'fs'
import path from 'path'
import { getRootDir } from '../adapters/path-resolver.js'
import { safeReadFile, safeWriteFileSync } from '../adapters/filesystem.js'
import { ToolRegistry } from './tool-registry.js'
import type { Provider, ProviderInput, Tool } from '../types.js'

/**
 * Storage structure for each tool
 */
interface ToolStorage {
  providers: Provider[]
  currentProviderId?: string
}

/**
 * Custom error classes
 */
export class ProviderNotFoundError extends Error {
  constructor(tool: Tool, name: string) {
    super(`Provider "${name}" not found for tool "${tool}"`)
    this.name = 'ProviderNotFoundError'
  }
}

export class ValidationFailedError extends Error {
  constructor(message: string) {
    super(`Validation failed: ${message}`)
    this.name = 'ValidationFailedError'
  }
}

/**
 * ProviderService implementation
 */
class ProviderServiceImpl {
  /**
   * Get storage file path for a tool
   */
  private getStoragePath(tool: Tool): string {
    const ccmanDir = path.join(getRootDir(), '.ccman')
    return path.join(ccmanDir, `${tool}.json`)
  }

  /**
   * Load storage for a tool
   */
  private loadStorage(tool: Tool): ToolStorage {
    const storagePath = this.getStoragePath(tool)
    const content = safeReadFile(storagePath)

    if (!content) {
      return { providers: [] }
    }

    try {
      const data = JSON.parse(content)
      return {
        providers: data.providers || [],
        currentProviderId: data.currentProviderId,
      }
    } catch (error) {
      throw new Error(
        `Failed to parse storage for ${tool}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Save storage for a tool
   */
  private saveStorage(tool: Tool, storage: ToolStorage): void {
    const storagePath = this.getStoragePath(tool)
    const dir = path.dirname(storagePath)

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    }

    try {
      const content = JSON.stringify(storage, null, 2)
      safeWriteFileSync(storagePath, content, { mode: 0o600 })
    } catch (error) {
      throw new Error(
        `Failed to save storage for ${tool}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Generate unique provider ID
   */
  private generateId(tool: Tool): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${tool}-${timestamp}-${random}`
  }

  /**
   * Add a new provider
   */
  add(tool: Tool, input: ProviderInput): Provider {
    // Validate tool exists
    const descriptor = ToolRegistry.get(tool)

    // Validate input using tool's ServiceAdapter
    if (descriptor.adapters.service) {
      descriptor.adapters.service.validate(input)
    }

    // Load storage
    const storage = this.loadStorage(tool)

    // Check for name conflict
    if (storage.providers.some((p) => p.name === input.name)) {
      throw new Error(`Provider with name "${input.name}" already exists for tool "${tool}"`)
    }

    // Create provider
    const now = Date.now()
    const provider: Provider = {
      id: this.generateId(tool),
      name: input.name,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      model: input.model,
      desc: input.desc,
      createdAt: now,
      updatedAt: now,
    }

    // Add to storage
    storage.providers.push(provider)
    this.saveStorage(tool, storage)

    return provider
  }

  /**
   * List all providers for a tool
   */
  list(tool: Tool): Provider[] {
    // Validate tool exists
    ToolRegistry.get(tool)

    // Load storage
    const storage = this.loadStorage(tool)

    // Sort by createdAt descending (newest first)
    return storage.providers.sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * Get a specific provider by name
   */
  get(tool: Tool, name: string): Provider {
    const storage = this.loadStorage(tool)
    const provider = storage.providers.find((p) => p.name === name)

    if (!provider) {
      throw new ProviderNotFoundError(tool, name)
    }

    return provider
  }

  /**
   * Update an existing provider
   */
  update(tool: Tool, name: string, updates: Partial<ProviderInput>): Provider {
    // Validate tool exists
    const descriptor = ToolRegistry.get(tool)

    // Load storage
    const storage = this.loadStorage(tool)

    // Find provider
    const index = storage.providers.findIndex((p) => p.name === name)
    if (index === -1) {
      throw new ProviderNotFoundError(tool, name)
    }

    const provider = storage.providers[index]

    // Check for name conflict if name is being changed
    if (updates.name && updates.name !== name) {
      if (storage.providers.some((p) => p.name === updates.name)) {
        throw new Error(`Provider with name "${updates.name}" already exists for tool "${tool}"`)
      }
    }

    // Apply updates
    const updated: Provider = {
      ...provider,
      ...updates,
      name: updates.name || provider.name, // Preserve name if not in updates
      updatedAt: Date.now(),
    }

    // Validate updated provider
    if (descriptor.adapters.service) {
      descriptor.adapters.service.validate(updated)
    }

    // Save
    storage.providers[index] = updated
    this.saveStorage(tool, storage)

    return updated
  }

  /**
   * Delete a provider
   */
  delete(tool: Tool, name: string): void {
    // Validate tool exists
    ToolRegistry.get(tool)

    // Load storage
    const storage = this.loadStorage(tool)

    // Find provider
    const index = storage.providers.findIndex((p) => p.name === name)
    if (index === -1) {
      throw new ProviderNotFoundError(tool, name)
    }

    // Remove provider
    storage.providers.splice(index, 1)

    // If this was the current provider, clear currentProviderId
    if (storage.currentProviderId === storage.providers[index]?.id) {
      storage.currentProviderId = undefined
    }

    this.saveStorage(tool, storage)
  }

  /**
   * Apply provider to tool's official config files
   */
  apply(tool: Tool, name: string): void {
    // Validate tool exists and has service adapter
    const descriptor = ToolRegistry.get(tool)
    if (!descriptor.adapters.service) {
      throw new Error(`Tool "${tool}" does not support service provider management`)
    }

    // Load storage and find provider
    const storage = this.loadStorage(tool)
    const provider = storage.providers.find((p) => p.name === name)

    if (!provider) {
      throw new ProviderNotFoundError(tool, name)
    }

    // Write to tool's official config files
    descriptor.adapters.service.writeOfficial(provider)

    // Update lastUsedAt and currentProviderId
    provider.lastUsedAt = Date.now()
    storage.currentProviderId = provider.id

    this.saveStorage(tool, storage)
  }

  /**
   * Clone an existing provider
   */
  clone(
    tool: Tool,
    sourceName: string,
    newName: string,
    overrides?: Partial<ProviderInput>
  ): Provider {
    // Get source provider
    const source = this.get(tool, sourceName)

    // Create new provider input with source values
    const input: ProviderInput = {
      name: newName,
      baseUrl: source.baseUrl,
      apiKey: source.apiKey,
      model: source.model,
      desc: source.desc,
      ...overrides, // Apply overrides
    }

    // Add as new provider
    return this.add(tool, input)
  }

  /**
   * Get current active provider for a tool
   */
  current(tool: Tool): Provider | null {
    // Validate tool exists
    ToolRegistry.get(tool)

    // Load storage
    const storage = this.loadStorage(tool)

    if (!storage.currentProviderId) {
      return null
    }

    // Find provider by id
    const provider = storage.providers.find((p) => p.id === storage.currentProviderId)
    return provider || null
  }
}

// Export singleton instance
export const ProviderService = new ProviderServiceImpl()

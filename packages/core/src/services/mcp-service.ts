/**
 * McpService - Unified MCP server management for all tools
 */

import fs from 'fs'
import path from 'path'
import { getRootDir } from '../adapters/path-resolver.js'
import { safeReadFile, safeWriteFileSync } from '../adapters/filesystem.js'
import { ToolRegistry } from './tool-registry.js'
import type { MCPServer, MCPServerInput, Tool } from '../types.js'

/**
 * MCP storage structure
 */
interface McpStorage {
  servers: MCPServer[]
}

/**
 * Custom error classes
 */
export class McpServerNotFoundError extends Error {
  constructor(name: string) {
    super(`MCP server "${name}" not found`)
    this.name = 'McpServerNotFoundError'
  }
}

export class McpValidationError extends Error {
  constructor(message: string) {
    super(`MCP validation failed: ${message}`)
    this.name = 'McpValidationError'
  }
}

/**
 * McpService implementation
 */
class McpServiceImpl {
  /**
   * Get MCP storage file path
   */
  private getStoragePath(): string {
    const ccmanDir = path.join(getRootDir(), '.ccman')
    return path.join(ccmanDir, 'mcp.json')
  }

  /**
   * Load MCP storage
   */
  private loadStorage(): McpStorage {
    const storagePath = this.getStoragePath()
    const content = safeReadFile(storagePath)

    if (!content) {
      return { servers: [] }
    }

    try {
      const data = JSON.parse(content)
      return {
        servers: data.servers || [],
      }
    } catch (error) {
      throw new Error(
        `Failed to parse MCP storage: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Save MCP storage
   */
  private saveStorage(storage: McpStorage): void {
    const storagePath = this.getStoragePath()
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
        `Failed to save MCP storage: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Generate unique MCP server ID
   */
  private generateId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `mcp-${timestamp}-${random}`
  }

  /**
   * Validate MCP server input
   */
  private validateInput(input: MCPServerInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new McpValidationError('Server name is required')
    }

    if (!input.command || input.command.trim().length === 0) {
      throw new McpValidationError('Command is required')
    }

    // Validate enabledApps if provided
    if (input.enabledApps) {
      for (const tool of input.enabledApps) {
        try {
          const descriptor = ToolRegistry.get(tool)
          if (!descriptor.capabilities.includes('mcp')) {
            throw new McpValidationError(`Tool "${tool}" does not support MCP`)
          }
        } catch (error) {
          throw new McpValidationError(`Invalid tool in enabledApps: ${tool}`)
        }
      }
    }
  }

  /**
   * Add a new MCP server
   */
  add(input: MCPServerInput): MCPServer {
    // Validate input
    this.validateInput(input)

    // Load storage
    const storage = this.loadStorage()

    // Check for name conflict
    if (storage.servers.some((s) => s.name === input.name)) {
      throw new Error(`MCP server with name "${input.name}" already exists`)
    }

    // Create server
    const now = Date.now()
    const server: MCPServer = {
      id: this.generateId(),
      name: input.name,
      command: input.command,
      args: input.args || [],
      env: input.env || {},
      enabledApps: input.enabledApps || [],
      desc: input.desc,
      createdAt: now,
      updatedAt: now,
    }

    // Add to storage
    storage.servers.push(server)
    this.saveStorage(storage)

    return server
  }

  /**
   * List all MCP servers
   */
  list(): MCPServer[] {
    const storage = this.loadStorage()
    return storage.servers
  }

  /**
   * Get a specific MCP server by name
   */
  get(name: string): MCPServer {
    const storage = this.loadStorage()
    const server = storage.servers.find((s) => s.name === name)

    if (!server) {
      throw new McpServerNotFoundError(name)
    }

    return server
  }

  /**
   * Update an existing MCP server
   */
  update(name: string, updates: Partial<MCPServerInput>): MCPServer {
    // Load storage
    const storage = this.loadStorage()

    // Find server
    const index = storage.servers.findIndex((s) => s.name === name)
    if (index === -1) {
      throw new McpServerNotFoundError(name)
    }

    const server = storage.servers[index]

    // Check for name conflict if name is being changed
    if (updates.name && updates.name !== name) {
      if (storage.servers.some((s) => s.name === updates.name)) {
        throw new Error(`MCP server with name "${updates.name}" already exists`)
      }
    }

    // Apply updates
    const updated: MCPServer = {
      ...server,
      ...updates,
      name: updates.name || server.name,
      enabledApps: updates.enabledApps || server.enabledApps,
      updatedAt: Date.now(),
    }

    // Validate updated server
    this.validateInput(updated)

    // Save
    storage.servers[index] = updated
    this.saveStorage(storage)

    return updated
  }

  /**
   * Delete an MCP server
   */
  delete(name: string): void {
    // Load storage
    const storage = this.loadStorage()

    // Find server
    const index = storage.servers.findIndex((s) => s.name === name)
    if (index === -1) {
      throw new McpServerNotFoundError(name)
    }

    const deletedServer = storage.servers[index]

    // Remove from all tools' configs
    for (const tool of deletedServer.enabledApps) {
      try {
        const descriptor = ToolRegistry.get(tool)
        if (descriptor.adapters.mcp) {
          // Get all servers for this tool except the one being deleted
          const toolServers = storage.servers.filter(
            (s) => s.name !== name && s.enabledApps.includes(tool)
          )
          descriptor.adapters.mcp.writeOfficial(toolServers)
        }
      } catch (error) {
        // Continue if tool doesn't exist or has no MCP adapter
        console.warn(`Failed to remove MCP server from ${tool}: ${error}`)
      }
    }

    // Remove server from storage
    storage.servers.splice(index, 1)
    this.saveStorage(storage)
  }

  /**
   * Apply MCP server to specific tools
   */
  apply(name: string, tools: Tool[]): void {
    // Validate server exists
    this.get(name)

    // Validate tools support MCP
    for (const tool of tools) {
      const descriptor = ToolRegistry.get(tool)
      if (!descriptor.capabilities.includes('mcp')) {
        throw new McpValidationError(`Tool "${tool}" does not support MCP`)
      }
      if (!descriptor.adapters.mcp) {
        throw new McpValidationError(`Tool "${tool}" does not have MCP adapter`)
      }
    }

    // Update enabledApps
    const storage = this.loadStorage()
    const index = storage.servers.findIndex((s) => s.name === name)
    if (index === -1) {
      throw new McpServerNotFoundError(name)
    }

    // Update server's enabledApps
    storage.servers[index].enabledApps = tools
    storage.servers[index].updatedAt = Date.now()

    // Write to each tool's config
    const allTools = ToolRegistry.list().filter((d) => d.capabilities.includes('mcp'))

    for (const descriptor of allTools) {
      if (!descriptor.adapters.mcp) continue

      // Get all servers enabled for this tool
      const toolServers = storage.servers.filter((s) =>
        s.enabledApps.includes(descriptor.id as Tool)
      )

      // Write to tool's config
      descriptor.adapters.mcp.writeOfficial(toolServers)
    }

    // Save storage
    this.saveStorage(storage)
  }

  /**
   * Sync all MCP servers to tools
   * Useful for re-applying configuration after manual edits
   */
  syncAll(): void {
    const storage = this.loadStorage()
    const allTools = ToolRegistry.list().filter((d) => d.capabilities.includes('mcp'))

    for (const descriptor of allTools) {
      if (!descriptor.adapters.mcp) continue

      // Get all servers enabled for this tool
      const toolServers = storage.servers.filter((s) =>
        s.enabledApps.includes(descriptor.id as Tool)
      )

      // Write to tool's config
      descriptor.adapters.mcp.writeOfficial(toolServers)
    }
  }
}

// Export singleton instance
export const McpService = new McpServiceImpl()

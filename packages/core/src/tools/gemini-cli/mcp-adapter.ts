/**
 * Gemini CLI MCP Adapter
 */

import type { MCPServer, McpAdapter } from '../../types.js'
import { GeminiConfigAdapter } from './config-adapter.js'

export class GeminiMcpAdapter implements McpAdapter {
  private configAdapter = new GeminiConfigAdapter()

  writeOfficial(servers: MCPServer[]): void {
    // Read existing settings
    const settings = this.configAdapter.read('main') as Record<string, any>

    // Convert MCPServer[] to Gemini's mcpServers format (same as Claude)
    const mcpServers: Record<string, any> = {}

    for (const server of servers) {
      mcpServers[server.name] = {
        command: server.command,
        args: server.args || [],
        env: server.env || {},
      }
    }

    // Update mcpServers field
    settings.mcpServers = mcpServers

    // Write back
    this.configAdapter.write('main', settings, 'new-override-old')
  }

  readOfficial(): MCPServer[] {
    // Read existing settings
    const settings = this.configAdapter.read('main') as Record<string, any>

    if (!settings.mcpServers || typeof settings.mcpServers !== 'object') {
      return []
    }

    // Convert Gemini's mcpServers format to MCPServer[]
    const servers: MCPServer[] = []

    for (const [name, config] of Object.entries(settings.mcpServers)) {
      const mcpConfig = config as Record<string, any>
      servers.push({
        id: `gemini-mcp-${name}`, // Generate ID from name
        name,
        command: mcpConfig.command || '',
        args: Array.isArray(mcpConfig.args) ? mcpConfig.args : [],
        env: typeof mcpConfig.env === 'object' ? mcpConfig.env : {},
        enabledApps: ['gemini-cli'], // This tool is gemini-cli
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    return servers
  }
}

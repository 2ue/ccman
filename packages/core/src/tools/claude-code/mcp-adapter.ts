/**
 * Claude Code MCP Adapter
 */

import type { MCPServer, McpAdapter } from '../../types.js'
import { ClaudeConfigAdapter } from './config-adapter.js'

export class ClaudeMcpAdapter implements McpAdapter {
  private configAdapter = new ClaudeConfigAdapter()

  writeOfficial(servers: MCPServer[]): void {
    // Read existing settings
    const settings = this.configAdapter.read('main') as Record<string, any>

    // Convert MCPServer[] to Claude's mcpServers format
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

    // Convert Claude's mcpServers format to MCPServer[]
    const servers: MCPServer[] = []

    for (const [name, config] of Object.entries(settings.mcpServers)) {
      const mcpConfig = config as Record<string, any>
      servers.push({
        id: `claude-mcp-${name}`, // Generate ID from name
        name,
        command: mcpConfig.command || '',
        args: Array.isArray(mcpConfig.args) ? mcpConfig.args : [],
        env: typeof mcpConfig.env === 'object' ? mcpConfig.env : {},
        enabledApps: ['claude-code'], // This tool is claude-code
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    return servers
  }
}

/**
 * Compatibility Layer - Legacy ToolManager API
 *
 * Provides backward-compatible wrappers for existing code.
 * All methods delegate to new services (ProviderService, McpService, ConfigService).
 *
 * @deprecated Use ProviderService, McpService, and ConfigService directly
 */

import { ProviderService } from '../services/provider-service.js'
import { McpService } from '../services/mcp-service.js'
import { ToolRegistry } from '../services/tool-registry.js'
import type { Provider, ProviderInput, Tool } from '../types.js'

/**
 * Legacy ToolManager interface
 */
export interface ToolManager {
  add(input: ProviderInput): Provider
  list(): Provider[]
  get(name: string): Provider
  edit(name: string, updates: Partial<ProviderInput>): Provider
  remove(name: string): void
  use(name: string): void
  current(): Provider | null
  clone(sourceName: string, newName: string, overrides?: Partial<ProviderInput>): Provider
}

/**
 * Create a legacy ToolManager for a specific tool
 * @deprecated Use ProviderService directly
 */
export function createToolManager(tool: Tool): ToolManager {
  // Emit deprecation warning once per tool
  if (!warnedTools.has(tool)) {
    console.warn(
      `[Deprecated] createToolManager('${tool}') is deprecated. Use ProviderService.add/list/update/delete/apply directly.`
    )
    warnedTools.add(tool)
  }

  return {
    add(input: ProviderInput): Provider {
      return ProviderService.add(tool, input)
    },

    list(): Provider[] {
      return ProviderService.list(tool)
    },

    get(name: string): Provider {
      return ProviderService.get(tool, name)
    },

    edit(name: string, updates: Partial<ProviderInput>): Provider {
      return ProviderService.update(tool, name, updates)
    },

    remove(name: string): void {
      ProviderService.delete(tool, name)
    },

    use(name: string): void {
      ProviderService.apply(tool, name)
    },

    current(): Provider | null {
      return ProviderService.current(tool)
    },

    clone(sourceName: string, newName: string, overrides?: Partial<ProviderInput>): Provider {
      return ProviderService.clone(tool, sourceName, newName, overrides)
    },
  }
}

// Track warned tools to avoid duplicate warnings
const warnedTools = new Set<Tool>()

/**
 * Legacy factory functions
 * @deprecated Use ProviderService directly
 */
export function createCodexManager(): ToolManager {
  return createToolManager('codex')
}

export function createClaudeManager(): ToolManager {
  return createToolManager('claude-code')
}

export function createGeminiManager(): ToolManager {
  return createToolManager('gemini-cli')
}

/**
 * Legacy presets access
 * @deprecated Access presets via ToolRegistry.get(tool).presets
 */
export function getPresets(tool: Tool) {
  console.warn(
    `[Deprecated] getPresets('${tool}') is deprecated. Use ToolRegistry.get('${tool}').presets instead.`
  )
  const descriptor = ToolRegistry.get(tool)
  return descriptor.presets || []
}

/**
 * Legacy MCP functions
 * @deprecated Use McpService directly
 */
let mcpWarned = false

export const legacyMcpService = {
  add(input: any) {
    if (!mcpWarned) {
      console.warn('[Deprecated] legacyMcpService is deprecated. Use McpService directly.')
      mcpWarned = true
    }
    return McpService.add(input)
  },

  list() {
    if (!mcpWarned) {
      console.warn('[Deprecated] legacyMcpService is deprecated. Use McpService directly.')
      mcpWarned = true
    }
    return McpService.list()
  },

  get(name: string) {
    if (!mcpWarned) {
      console.warn('[Deprecated] legacyMcpService is deprecated. Use McpService directly.')
      mcpWarned = true
    }
    return McpService.get(name)
  },

  update(name: string, updates: any) {
    if (!mcpWarned) {
      console.warn('[Deprecated] legacyMcpService is deprecated. Use McpService directly.')
      mcpWarned = true
    }
    return McpService.update(name, updates)
  },

  delete(name: string) {
    if (!mcpWarned) {
      console.warn('[Deprecated] legacyMcpService is deprecated. Use McpService directly.')
      mcpWarned = true
    }
    return McpService.delete(name)
  },

  apply(name: string, tools: Tool[]) {
    if (!mcpWarned) {
      console.warn('[Deprecated] legacyMcpService is deprecated. Use McpService directly.')
      mcpWarned = true
    }
    return McpService.apply(name, tools)
  },
}

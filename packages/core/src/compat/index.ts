/**
 * Compatibility Layer - Legacy APIs
 *
 * @deprecated All exports in this module are deprecated.
 * Use the new services (ProviderService, McpService, ConfigService) and ToolRegistry directly.
 */

export {
  createToolManager,
  createCodexManager,
  createClaudeManager,
  createGeminiManager,
  getPresets,
  legacyMcpService,
  type ToolManager,
} from './tool-manager.js'

/**
 * ccman Core Module
 * Business logic for managing Codex, Claude Code, and Gemini CLI service providers
 */
import pkg from '../package.json' assert { type: 'json' }

/** Core version */
export const VERSION = pkg.version as string

// =============================================================================
// New Plugin-Based Architecture (Recommended)
// =============================================================================

// Core Services
export {
  ToolRegistry,
  ProviderService,
  ProviderNotFoundError,
  ProviderNotFoundError as NewProviderNotFoundError,
  ValidationFailedError,
  McpService,
  McpServerNotFoundError,
  McpValidationError,
  ConfigService,
  ConfigPathNotFoundError,
  ConfigOperationError,
} from './services/index.js'

// Tool Descriptors and Adapters
export {
  claudeDescriptor,
  ClaudeConfigAdapter,
  ClaudeServiceAdapter,
  ClaudeMcpAdapter,
  CLAUDE_PRESETS as CLAUDE_PRESETS_NEW,
} from './tools/claude-code/index.js'

export {
  codexDescriptor,
  CodexConfigAdapter,
  CodexServiceAdapter,
  CODEX_PRESETS as CODEX_PRESETS_NEW,
} from './tools/codex/index.js'

export {
  geminiDescriptor,
  GeminiConfigAdapter,
  GeminiServiceAdapter,
  GeminiMcpAdapter,
  GEMINI_PRESETS as GEMINI_PRESETS_NEW,
} from './tools/gemini-cli/index.js'

export { ccmanDescriptor, CcmanConfigAdapter } from './tools/ccman/index.js'

// Adapters
export { getRootDir, setRootDir, resetRootDir } from './adapters/path-resolver.js'

export { safeReadFile, safeWriteFileSync } from './adapters/filesystem.js'

export { renderTemplate, deepMerge, loadTemplate } from './adapters/template-engine.js'

// Types
export type {
  Tool,
  ToolDescriptor,
  ConfigPath,
  ConfigAdapter,
  ServiceAdapter,
  McpAdapter,
  PresetSpec,
  TemplateSpec,
  Provider,
  ProviderInput,
  MCPServer,
  MCPServerInput,
  MergeMode,
} from './types.js'

// =============================================================================
// Legacy APIs (Backward Compatibility)
// =============================================================================

// Constants (全局常量和配置)
export {
  TOOL_TYPES,
  MAIN_TOOL_TYPES,
  TOOL_CONFIG,
  getToolConfig,
  isValidToolType,
  isMainToolType,
  type ToolType,
  type MainToolType,
} from './constants.js'

// Tool Manager (Factory Functions)
export {
  createCodexManager,
  createClaudeManager,
  createMCPManager,
  createGeminiManager,
  type ToolManager,
  type Provider as LegacyProvider, // Renamed to avoid conflict with new types
  type AddProviderInput,
  type EditProviderInput,
  type PresetTemplate,
  type AddPresetInput,
  type EditPresetInput,
  ProviderNotFoundError as LegacyProviderNotFoundError, // Renamed to avoid conflict
} from './tool-manager.js'

// Presets (只导出预设数据，不导出类型)
export { CODEX_PRESETS } from './presets/codex.js'
export { CC_PRESETS } from './presets/claude.js'
export { MCP_PRESETS, MCP_PRESETS_DETAIL, type MCPPresetDetail } from './presets/mcp.js'
export { GEMINI_PRESETS } from './presets/gemini.js'

// MCP Writers (导出辅助函数)
export {
  writeMCPConfig,
  writeMCPConfigForApp,
  loadMCPConfig,
  saveMCPConfig,
  providerToMCPServer,
  mcpServerToProvider,
  toggleMCPForApp,
  getMCPAppStatus,
  migrateMCPConfig,
  getMCPConfigPath,
  type MCPServer as LegacyMCPServer, // Renamed to avoid conflict with new types
  type MCPConfig,
  type AppType,
} from './writers/mcp.js'

// Migration
export {
  migrateConfig,
  rollbackMigration,
  migrateV2ToV3,
  validateMigration,
  migrateV32ToV33,
  runAllMigrations,
} from './migrate.js'

// Paths (导出用于测试和 CLI 输出)
export {
  getCcmanDir,
  getCodexDir,
  getClaudeDir,
  getGeminiDir,
  getConfigPath,
  getCodexConfigPath,
  getCodexAuthPath,
  getClaudeConfigPath,
  getClaudeJsonPath,
  getGeminiSettingsPath,
  getGeminiEnvPath,
  __setTestPaths,
} from './paths.js'

// Config (统一配置管理)
export {
  loadConfig,
  saveConfig,
  getSyncConfig,
  saveSyncConfig,
  deleteSyncConfig,
  updateLastSyncTime,
  type CcmanConfig,
} from './config.js'

// Sync (WebDAV 同步 - 加密 API Key)
export { testWebDAVConnection } from './sync/webdav-client.js'
export type { SyncConfig, SyncData, ToolConfigForSync, WebDAVAuthType } from './sync/types.js'
export { uploadToCloud, downloadFromCloud, mergeSync } from './sync/sync-v2.js'
export { encryptApiKey, decryptApiKey } from './sync/crypto.js'
export { mergeProviders, areProvidersEqual } from './sync/merge-advanced.js'

// Export/Import (配置导入导出)
export {
  exportConfig,
  importConfig,
  validateExport,
  validateImportDir,
  type ExportValidation,
  type ImportValidation,
  type ExportResult,
  type ImportResult,
} from './export.js'

// Claude Clean (~/.claude.json 清理功能)
export {
  analyzeClaudeJson,
  cleanClaudeJson,
  CleanPresets,
  getProjectDetails,
  getCacheDetails,
  deleteProjectHistory,
  deleteCacheItem,
  getProjectHistory,
  deleteHistoryEntry,
  clearProjectHistory,
  type CleanOptions,
  type CleanResult,
  type AnalyzeResult,
  type ProjectDetail,
  type CacheDetail,
  type HistoryEntry,
} from './claude-clean.js'

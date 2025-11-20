/**
 * ccman Core Module
 * Business logic for managing Codex and Claude Code service providers
 */
import pkg from '../package.json' with { type: 'json' }

/** Core version */
export const VERSION = pkg.version as string

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
  type Provider,
  type AddProviderInput,
  type EditProviderInput,
  type PresetTemplate,
  type AddPresetInput,
  type EditPresetInput,
  ProviderNotFoundError,
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
  type MCPServer,
  type MCPConfig,
  type AppType,
} from './writers/mcp.js'

// Migration
export { migrateConfig, rollbackMigration, migrateV2ToV3, validateMigration } from './migrate.js'

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

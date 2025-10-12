/**
 * ccman Core Module
 * Business logic for managing Codex and Claude Code service providers
 */
import pkg from '../package.json' assert { type: 'json' }

/** Core version */
export const VERSION = pkg.version as string

// Tool Manager (Factory Functions)
export {
  createCodexManager,
  createClaudeManager,
  type ToolManager,
  type Provider,
  type AddProviderInput,
  type EditProviderInput,
  type PresetTemplate,
  type AddPresetInput,
  type EditPresetInput,
  type ToolType,
  ProviderNotFoundError,
} from './tool-manager.js'

// Presets
export { CODEX_PRESETS, type PresetTemplate as CodexPresetTemplate } from './presets/codex.js'
export { CC_PRESETS, type PresetTemplate as ClaudePresetTemplate } from './presets/claude.js'

// Migration
export { migrateConfig, rollbackMigration, migrateV2ToV3, validateMigration } from './migrate.js'

// Paths (导出用于测试和 CLI 输出)
export {
  getCcmanDir,
  getCodexDir,
  getClaudeDir,
  getConfigPath,
  getCodexConfigPath,
  getCodexAuthPath,
  getClaudeConfigPath,
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

// Sync (WebDAV 同步)
export {
  uploadConfig,
  downloadAndOverwriteConfig,
  getRemoteSyncInfo,
  getLocalSyncData,
} from './sync/sync.js'
export { testWebDAVConnection } from './sync/webdav-client.js'
export type { SyncConfig, SyncData, ToolConfigForSync, WebDAVAuthType } from './sync/types.js'

// Sync V2 (智能同步)
export { uploadToCloud, downloadFromCloud, mergeSync } from './sync/sync-v2.js'
export { encryptApiKey, decryptApiKey } from './sync/crypto.js'
export { mergeProviders, areProvidersEqual } from './sync/merge-advanced.js'

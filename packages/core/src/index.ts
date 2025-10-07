/**
 * ccman Core Module
 * Business logic for managing Codex and Claude Code service providers
 */

// Tool Manager (Factory Functions)
export {
  createCodexManager,
  createClaudeCodeManager,
  type ToolManager,
  type Provider,
  type AddProviderInput,
  type EditProviderInput,
  type PresetTemplate,
  type AddPresetInput,
  type EditPresetInput,
  type ToolType,
  ProviderNotFoundError,
} from './tool-manager'

// Presets
export { CODEX_PRESETS, type PresetTemplate as CodexPresetTemplate } from './presets/codex'
export { CLAUDECODE_PRESETS, type PresetTemplate as ClaudeCodePresetTemplate } from './presets/claudecode'

// Migration
export { migrateConfig, rollbackMigration } from './migrate'

// Paths (导出用于测试)
export {
  getCcmanDir,
  getCodexDir,
  getClaudeDir,
  getCodexConfigPath,
  getCodexAuthPath,
  getClaudeConfigPath,
  __setTestPaths,
} from './paths'

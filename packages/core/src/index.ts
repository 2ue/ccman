/**
 * ccman Core Module
 * Business logic for managing Codex and Claude Code service providers
 */
import pkg from '../package.json';

/** Core version */
export const VERSION = pkg.version as string

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
} from './tool-manager.js'

// Presets
export { CODEX_PRESETS, type PresetTemplate as CodexPresetTemplate } from './presets/codex.js'
export { CLAUDECODE_PRESETS, type PresetTemplate as ClaudeCodePresetTemplate } from './presets/claudecode.js'

// Migration
export { migrateConfig, rollbackMigration } from './migrate.js'

// Paths (导出用于测试)
export {
  getCcmanDir,
  getCodexDir,
  getClaudeDir,
  getCodexConfigPath,
  getCodexAuthPath,
  getClaudeConfigPath,
  __setTestPaths,
} from './paths.js'

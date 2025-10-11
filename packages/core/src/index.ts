/**
 * ccman Core Module
 * Business logic for managing Codex and Claude Code service providers
 */
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

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
  getCodexConfigPath,
  getCodexAuthPath,
  getClaudeConfigPath,
  __setTestPaths,
} from './paths.js'

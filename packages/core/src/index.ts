/**
 * ccman Core Module
 * Business logic for managing Codex and Claude Code service providers
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Read version from package.json
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'))

/** Core version */
export const VERSION = packageJson.version as string

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

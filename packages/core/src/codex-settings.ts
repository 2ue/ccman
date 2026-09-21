import * as path from 'path'
import { getCcmanDir } from './paths.js'
import { fileExists, readJSON, writeJSON } from './utils/file.js'

/**
 * Settings that affect how ccman writes Codex configuration.
 *
 * Keeping the setting in ccman's Codex store makes it available to both the
 * CLI and Desktop clients without changing Codex's own configuration schema.
 */
export interface CodexSettings {
  /**
   * Keep the existing top-level `model_provider` key when switching providers
   * in merge mode. This keeps Codex's session identity stable.
   */
  preserveProviderName: boolean
}

interface CodexStore {
  providers?: unknown[]
  presets?: unknown[]
  settings?: unknown
  [key: string]: unknown
}

const DEFAULT_CODEX_SETTINGS: CodexSettings = {
  // Session continuity is the safe default. An explicit false remains a
  // supported opt-out for users who need provider names to change.
  preserveProviderName: true,
}

function getCodexStorePath(): string {
  return path.join(getCcmanDir(), 'codex.json')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function loadCodexStore(): CodexStore {
  const configPath = getCodexStorePath()
  if (!fileExists(configPath)) {
    return { providers: [], presets: [] }
  }

  return readJSON<CodexStore>(configPath)
}

/**
 * Read Codex writer settings.
 *
 * Older stores do not contain a settings object, so missing or malformed
 * values intentionally fall back to the current default.
 */
export function getCodexSettings(): CodexSettings {
  const config = loadCodexStore()
  const settings = isRecord(config.settings) ? config.settings : {}
  const preserveProviderName = settings.preserveProviderName

  return {
    ...DEFAULT_CODEX_SETTINGS,
    ...(typeof preserveProviderName === 'boolean' ? { preserveProviderName } : {}),
  }
}

/**
 * Persist the Codex provider-name continuity setting without touching the
 * provider list or any unrelated fields in codex.json.
 */
export function setCodexPreserveProviderName(enabled: boolean): CodexSettings {
  if (typeof enabled !== 'boolean') {
    throw new Error('preserveProviderName 必须是布尔值')
  }

  const config = loadCodexStore()
  const settings = isRecord(config.settings) ? config.settings : {}
  const nextSettings: CodexSettings = {
    ...DEFAULT_CODEX_SETTINGS,
    preserveProviderName: enabled,
  }

  config.settings = {
    ...settings,
    ...nextSettings,
  }
  writeJSON(getCodexStorePath(), config)
  return nextSettings
}

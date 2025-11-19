/**
 * Desktop Preload Script
 *
 * 安全桥接:渲染进程 ←→ 主进程
 *
 * 按照架构设计方案,Desktop 直接调用 Core API
 * Preload 只负责暴露 IPC 通道,不做任何业务逻辑
 *
 * 架构:
 * Renderer → Preload → Main → Core (tool-manager.ts)
 */

import { contextBridge, ipcRenderer } from 'electron'
import type {
  Provider,
  AddProviderInput,
  EditProviderInput,
  PresetTemplate,
  AddPresetInput,
  EditPresetInput,
  SyncConfig,
  AnalyzeResult,
  ProjectDetail,
  CacheDetail,
  CleanResult,
  MCPServer,
  AppType,
} from '@ccman/core'

// ============================================================================
// Codex API
// ============================================================================

export interface CodexAPI {
  addProvider: (input: AddProviderInput) => Promise<Provider>
  listProviders: () => Promise<Provider[]>
  getProvider: (id: string) => Promise<Provider | undefined>
  switchProvider: (id: string) => Promise<void>
  editProvider: (id: string, updates: EditProviderInput) => Promise<Provider>
  removeProvider: (id: string) => Promise<void>
  cloneProvider: (sourceId: string, newName: string) => Promise<Provider>
  getCurrent: () => Promise<Provider | undefined>
  findByName: (name: string) => Promise<Provider | undefined>

  addPreset: (input: AddPresetInput) => Promise<PresetTemplate>
  listPresets: () => Promise<PresetTemplate[]>
  editPreset: (name: string, updates: EditPresetInput) => Promise<PresetTemplate>
  removePreset: (name: string) => Promise<void>
}

const codexAPI: CodexAPI = {
  addProvider: (input) => ipcRenderer.invoke('codex:add-provider', input),
  listProviders: () => ipcRenderer.invoke('codex:list-providers'),
  getProvider: (id) => ipcRenderer.invoke('codex:get-provider', id),
  switchProvider: (id) => ipcRenderer.invoke('codex:switch-provider', id),
  editProvider: (id, updates) => ipcRenderer.invoke('codex:edit-provider', id, updates),
  removeProvider: (id) => ipcRenderer.invoke('codex:remove-provider', id),
  cloneProvider: (sourceId, newName) => ipcRenderer.invoke('codex:clone-provider', sourceId, newName),
  getCurrent: () => ipcRenderer.invoke('codex:get-current'),
  findByName: (name) => ipcRenderer.invoke('codex:find-by-name', name),

  addPreset: (input) => ipcRenderer.invoke('codex:add-preset', input),
  listPresets: () => ipcRenderer.invoke('codex:list-presets'),
  editPreset: (name, updates) => ipcRenderer.invoke('codex:edit-preset', name, updates),
  removePreset: (name) => ipcRenderer.invoke('codex:remove-preset', name),
}

// ============================================================================
// Claude API
// ============================================================================

export interface ClaudeAPI {
  addProvider: (input: AddProviderInput) => Promise<Provider>
  listProviders: () => Promise<Provider[]>
  getProvider: (id: string) => Promise<Provider | undefined>
  switchProvider: (id: string) => Promise<void>
  editProvider: (id: string, updates: EditProviderInput) => Promise<Provider>
  removeProvider: (id: string) => Promise<void>
  cloneProvider: (sourceId: string, newName: string) => Promise<Provider>
  getCurrent: () => Promise<Provider | undefined>
  findByName: (name: string) => Promise<Provider | undefined>

  addPreset: (input: AddPresetInput) => Promise<PresetTemplate>
  listPresets: () => Promise<PresetTemplate[]>
  editPreset: (name: string, updates: EditPresetInput) => Promise<PresetTemplate>
  removePreset: (name: string) => Promise<void>
}

const claudeAPI: ClaudeAPI = {
  addProvider: (input) => ipcRenderer.invoke('claude:add-provider', input),
  listProviders: () => ipcRenderer.invoke('claude:list-providers'),
  getProvider: (id) => ipcRenderer.invoke('claude:get-provider', id),
  switchProvider: (id) => ipcRenderer.invoke('claude:switch-provider', id),
  editProvider: (id, updates) => ipcRenderer.invoke('claude:edit-provider', id, updates),
  removeProvider: (id) => ipcRenderer.invoke('claude:remove-provider', id),
  cloneProvider: (sourceId, newName) =>
    ipcRenderer.invoke('claude:clone-provider', sourceId, newName),
  getCurrent: () => ipcRenderer.invoke('claude:get-current'),
  findByName: (name) => ipcRenderer.invoke('claude:find-by-name', name),

  addPreset: (input) => ipcRenderer.invoke('claude:add-preset', input),
  listPresets: () => ipcRenderer.invoke('claude:list-presets'),
  editPreset: (name, updates) => ipcRenderer.invoke('claude:edit-preset', name, updates),
  removePreset: (name) => ipcRenderer.invoke('claude:remove-preset', name),
}

// ============================================================================
// Gemini API
// ============================================================================

export interface GeminiAPI {
  addProvider: (input: AddProviderInput) => Promise<Provider>
  listProviders: () => Promise<Provider[]>
  getProvider: (id: string) => Promise<Provider | undefined>
  switchProvider: (id: string) => Promise<void>
  editProvider: (id: string, updates: EditProviderInput) => Promise<Provider>
  removeProvider: (id: string) => Promise<void>
  cloneProvider: (sourceId: string, newName: string) => Promise<Provider>
  getCurrent: () => Promise<Provider | undefined>
  findByName: (name: string) => Promise<Provider | undefined>
}

const geminiAPI: GeminiAPI = {
  addProvider: (input) => ipcRenderer.invoke('gemini:add-provider', input),
  listProviders: () => ipcRenderer.invoke('gemini:list-providers'),
  getProvider: (id) => ipcRenderer.invoke('gemini:get-provider', id),
  switchProvider: (id) => ipcRenderer.invoke('gemini:switch-provider', id),
  editProvider: (id, updates) => ipcRenderer.invoke('gemini:edit-provider', id, updates),
  removeProvider: (id) => ipcRenderer.invoke('gemini:remove-provider', id),
  cloneProvider: (sourceId, newName) =>
    ipcRenderer.invoke('gemini:clone-provider', sourceId, newName),
  getCurrent: () => ipcRenderer.invoke('gemini:get-current'),
  findByName: (name) => ipcRenderer.invoke('gemini:find-by-name', name),
}

// ============================================================================
// 配置文件 API
// ============================================================================

export interface ConfigAPI {
  readConfigFiles: (
    tool: 'codex' | 'claude' | 'mcp' | 'gemini'
  ) => Promise<
    Array<{ name: string; path: string; content: string; language: 'json' | 'toml' | 'env' }>
  >
  writeConfigFiles: (
    files: Array<{ name: string; path: string; content: string; language: 'json' | 'toml' | 'env' }>
  ) => Promise<{ success: boolean }>
  readCcmanConfigFiles: () => Promise<
    Array<{ name: string; path: string; content: string; language: 'json' | 'toml' | 'env' }>
  >
  writeCcmanConfigFiles: (
    files: Array<{ name: string; path: string; content: string; language: 'json' | 'toml' | 'env' }>
  ) => Promise<{ success: boolean }>
  migrate: () => Promise<{ success: boolean; message: string }>
}

export interface SystemAPI {
  openFolder: () => Promise<{ success: boolean }>
  openUrl: (url: string) => Promise<{ success: boolean }>
  getAppVersion: () => Promise<string>
}

// ============================================================================
// Update API
// ============================================================================

export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string; notes?: string | null }
  | { type: 'not-available'; version: string }
  | { type: 'error'; message: string }
  | { type: 'progress'; percent: number; bytesPerSecond: number; transferred: number; total: number }
  | { type: 'downloaded'; version: string }
  | { type: 'manual-downloaded'; filePath: string }

export interface UpdateAPI {
  check: () => Promise<{ started: boolean; error?: string }>
  download: () => Promise<{ ok: boolean; path?: string; manual?: boolean; error?: string }>
  install: (manualPath?: string) => Promise<{ ok: boolean; error?: string }>
  backgroundCheck: () => Promise<{ started: boolean; error?: string }>
  onEvent: (handler: (e: UpdateEvent) => void) => () => void
}

const configAPI: ConfigAPI = {
  readConfigFiles: (tool) => ipcRenderer.invoke('read-config-files', tool),
  writeConfigFiles: (files) => ipcRenderer.invoke('write-config-files', files),
  readCcmanConfigFiles: () => ipcRenderer.invoke('read-ccman-config-files'),
  writeCcmanConfigFiles: (files) => ipcRenderer.invoke('write-ccman-config-files', files),
  migrate: () => ipcRenderer.invoke('migrate-config'),
}

const systemAPI: SystemAPI = {
  openFolder: () => ipcRenderer.invoke('open-folder'),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  getAppVersion: () => ipcRenderer.invoke('system:get-app-version'),
}

const updateAPI: UpdateAPI = {
  check: () => ipcRenderer.invoke('update:check'),
  download: () => ipcRenderer.invoke('update:download'),
  install: (manualPath?: string) => ipcRenderer.invoke('update:install', { manualPath }),
  backgroundCheck: () => ipcRenderer.invoke('update:background-check'),
  onEvent: (handler) => {
    const listener = (_: any, payload: UpdateEvent) => handler(payload)
    ipcRenderer.on('update:event', listener)
    return () => ipcRenderer.removeListener('update:event', listener)
  },
}

// ============================================================================
// WebDAV Sync API
// ============================================================================

export interface SyncAPI {
  saveSyncConfig: (config: SyncConfig) => Promise<{ success: boolean }>
  getSyncConfig: () => Promise<SyncConfig | null>
  testConnection: (config: SyncConfig) => Promise<boolean>
  // 智能同步（加密 API Key）
  uploadToCloud: (config: SyncConfig, password: string) => Promise<{ success: boolean }>
  downloadFromCloud: (config: SyncConfig, password: string) => Promise<string[]>
  mergeSync: (
    config: SyncConfig,
    password: string
  ) => Promise<{ hasChanges: boolean; backupPaths: string[] }>
}

// ============================================================================
// Import/Export API
// ============================================================================

export interface ImportExportAPI {
  selectFolder: (title: string) => Promise<string | null>
  exportConfig: (targetDir: string) => Promise<{ success: boolean; exportedFiles: string[] }>
  importConfig: (sourceDir: string) => Promise<{ success: boolean; backupPaths: string[]; importedFiles: string[] }>
  validateImportDir: (sourceDir: string) => Promise<{ valid: boolean; message?: string; foundFiles: string[] }>
}

const syncAPI: SyncAPI = {
  saveSyncConfig: (config) => ipcRenderer.invoke('sync:save-config', config),
  getSyncConfig: () => ipcRenderer.invoke('sync:get-config'),
  testConnection: (config) => ipcRenderer.invoke('sync:test-connection', config),
  // 智能同步（加密 API Key）
  uploadToCloud: (config, password) =>
    ipcRenderer.invoke('sync:upload-to-cloud', config, password),
  downloadFromCloud: (config, password) =>
    ipcRenderer.invoke('sync:download-from-cloud', config, password),
  mergeSync: (config, password) => ipcRenderer.invoke('sync:merge-sync', config, password),
}

const importExportAPI: ImportExportAPI = {
  selectFolder: (title) => ipcRenderer.invoke('importexport:select-folder', title),
  exportConfig: (targetDir) => ipcRenderer.invoke('importexport:export', targetDir),
  importConfig: (sourceDir) => ipcRenderer.invoke('importexport:import', sourceDir),
  validateImportDir: (sourceDir) => ipcRenderer.invoke('importexport:validate', sourceDir),
}

// ============================================================================
// Clean API (~/.claude.json 清理)
// ============================================================================

export interface CleanAPI {
  analyze: () => Promise<AnalyzeResult>
  getProjects: () => Promise<ProjectDetail[]>
  getCaches: () => Promise<CacheDetail[]>
  deleteProject: (projectPath: string) => Promise<void>
  deleteCache: (cacheKey: string) => Promise<void>
  executePreset: (preset: 'conservative' | 'moderate' | 'aggressive') => Promise<CleanResult>
  getProjectHistory: (projectPath: string) => Promise<any[]>
  deleteHistoryEntry: (projectPath: string, index: number) => Promise<void>
  clearProjectHistory: (projectPath: string) => Promise<void>
}

const cleanAPI: CleanAPI = {
  analyze: () => ipcRenderer.invoke('clean:analyze'),
  getProjects: () => ipcRenderer.invoke('clean:get-projects'),
  getCaches: () => ipcRenderer.invoke('clean:get-caches'),
  deleteProject: (projectPath) => ipcRenderer.invoke('clean:delete-project', projectPath),
  deleteCache: (cacheKey) => ipcRenderer.invoke('clean:delete-cache', cacheKey),
  executePreset: (preset) => ipcRenderer.invoke('clean:execute-preset', preset),
  getProjectHistory: (projectPath) => ipcRenderer.invoke('clean:get-project-history', projectPath),
  deleteHistoryEntry: (projectPath, index) => ipcRenderer.invoke('clean:delete-history-entry', projectPath, index),
  clearProjectHistory: (projectPath) => ipcRenderer.invoke('clean:clear-project-history', projectPath),
}

// ============================================================================
// MCP API
// ============================================================================

export interface MCPAPI {
  addServer: (input: AddProviderInput) => Promise<Provider>
  listServers: () => Promise<MCPServer[]>
  getServer: (id: string) => Promise<Provider | undefined>
  editServer: (id: string, updates: EditProviderInput) => Promise<Provider>
  cloneServer: (sourceId: string, newName: string) => Promise<Provider>
  removeServer: (id: string) => Promise<{ success: boolean }>
  toggleApp: (mcpId: string, app: AppType, enabled: boolean) => Promise<{ success: boolean }>
  getAppStatus: (mcpId: string) => Promise<Record<AppType, boolean>>
}

const mcpAPI: MCPAPI = {
  addServer: (input) => ipcRenderer.invoke('mcp:add-server', input),
  listServers: () => ipcRenderer.invoke('mcp:list-servers'),
  getServer: (id) => ipcRenderer.invoke('mcp:get-server', id),
  editServer: (id, updates) => ipcRenderer.invoke('mcp:edit-server', id, updates),
  cloneServer: (sourceId, newName) => ipcRenderer.invoke('mcp:clone-server', sourceId, newName),
  removeServer: (id) => ipcRenderer.invoke('mcp:remove-server', id),
  toggleApp: (mcpId, app, enabled) => ipcRenderer.invoke('mcp:toggle-app', mcpId, app, enabled),
  getAppStatus: (mcpId) => ipcRenderer.invoke('mcp:get-app-status', mcpId),
}

// ============================================================================
// 暴露 API 给渲染进程
// ============================================================================

contextBridge.exposeInMainWorld('electronAPI', {
  codex: codexAPI,
  claude: claudeAPI,
  gemini: geminiAPI,
  config: configAPI,
  system: systemAPI,
  update: updateAPI,
  sync: syncAPI,
  importExport: importExportAPI,
  clean: cleanAPI,
  mcp: mcpAPI,
})

// ============================================================================
// TypeScript 类型声明
// ============================================================================

export interface ElectronAPI {
  codex: CodexAPI
  claude: ClaudeAPI
  gemini: GeminiAPI
  config: ConfigAPI
  system: SystemAPI
  update: UpdateAPI
  sync: SyncAPI
  importExport: ImportExportAPI
  clean: CleanAPI
  mcp: MCPAPI
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

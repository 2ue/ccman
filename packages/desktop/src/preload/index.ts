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
// 配置文件 API
// ============================================================================

export interface ConfigAPI {
  readConfigFiles: (
    tool: 'codex' | 'claude'
  ) => Promise<Array<{ name: string; path: string; content: string; language: 'json' | 'toml' }>>
  writeConfigFiles: (
    files: Array<{ name: string; path: string; content: string; language: 'json' | 'toml' }>
  ) => Promise<{ success: boolean }>
  readCcmanConfigFiles: () => Promise<
    Array<{ name: string; path: string; content: string; language: 'json' | 'toml' }>
  >
  writeCcmanConfigFiles: (
    files: Array<{ name: string; path: string; content: string; language: 'json' | 'toml' }>
  ) => Promise<{ success: boolean }>
  migrate: () => Promise<{ success: boolean; message: string }>
}

export interface SystemAPI {
  openFolder: () => Promise<{ success: boolean }>
  openUrl: (url: string) => Promise<{ success: boolean }>
  getAppVersion: () => Promise<string>
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

// ============================================================================
// WebDAV Sync API
// ============================================================================

export interface SyncAPI {
  saveSyncConfig: (config: SyncConfig) => Promise<{ success: boolean }>
  getSyncConfig: () => Promise<SyncConfig | null>
  testConnection: (config: SyncConfig) => Promise<boolean>
  uploadConfig: (config: SyncConfig) => Promise<{ success: boolean }>
  downloadConfig: (config: SyncConfig) => Promise<string[]>
  // V2: 智能同步
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
  uploadConfig: (config) => ipcRenderer.invoke('sync:upload-config', config),
  downloadConfig: (config) => ipcRenderer.invoke('sync:download-config', config),
  // V2: 智能同步
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
// 暴露 API 给渲染进程
// ============================================================================

contextBridge.exposeInMainWorld('electronAPI', {
  codex: codexAPI,
  claude: claudeAPI,
  config: configAPI,
  system: systemAPI,
  sync: syncAPI,
  importExport: importExportAPI,
})

// ============================================================================
// TypeScript 类型声明
// ============================================================================

export interface ElectronAPI {
  codex: CodexAPI
  claude: ClaudeAPI
  config: ConfigAPI
  system: SystemAPI
  sync: SyncAPI
  importExport: ImportExportAPI
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

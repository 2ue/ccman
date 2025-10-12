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
  CodexPresetTemplate,
  ClaudePresetTemplate,
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

  addPreset: (input: AddPresetInput) => Promise<CodexPresetTemplate>
  listPresets: () => Promise<CodexPresetTemplate[]>
  editPreset: (name: string, updates: EditPresetInput) => Promise<CodexPresetTemplate>
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

  addPreset: (input: AddPresetInput) => Promise<ClaudePresetTemplate>
  listPresets: () => Promise<ClaudePresetTemplate[]>
  editPreset: (name: string, updates: EditPresetInput) => Promise<ClaudePresetTemplate>
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
}

const syncAPI: SyncAPI = {
  saveSyncConfig: (config) => ipcRenderer.invoke('sync:save-config', config),
  getSyncConfig: () => ipcRenderer.invoke('sync:get-config'),
  testConnection: (config) => ipcRenderer.invoke('sync:test-connection', config),
  uploadConfig: (config) => ipcRenderer.invoke('sync:upload-config', config),
  downloadConfig: (config) => ipcRenderer.invoke('sync:download-config', config),
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

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
  ClaudeCodePresetTemplate,
  AddPresetInput,
  EditPresetInput,
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
// Claude Code API
// ============================================================================

export interface ClaudeCodeAPI {
  addProvider: (input: AddProviderInput) => Promise<Provider>
  listProviders: () => Promise<Provider[]>
  getProvider: (id: string) => Promise<Provider | undefined>
  switchProvider: (id: string) => Promise<void>
  editProvider: (id: string, updates: EditProviderInput) => Promise<Provider>
  removeProvider: (id: string) => Promise<void>
  cloneProvider: (sourceId: string, newName: string) => Promise<Provider>
  getCurrent: () => Promise<Provider | undefined>
  findByName: (name: string) => Promise<Provider | undefined>

  addPreset: (input: AddPresetInput) => Promise<ClaudeCodePresetTemplate>
  listPresets: () => Promise<ClaudeCodePresetTemplate[]>
  editPreset: (name: string, updates: EditPresetInput) => Promise<ClaudeCodePresetTemplate>
  removePreset: (name: string) => Promise<void>
}

const claudeCodeAPI: ClaudeCodeAPI = {
  addProvider: (input) => ipcRenderer.invoke('claudecode:add-provider', input),
  listProviders: () => ipcRenderer.invoke('claudecode:list-providers'),
  getProvider: (id) => ipcRenderer.invoke('claudecode:get-provider', id),
  switchProvider: (id) => ipcRenderer.invoke('claudecode:switch-provider', id),
  editProvider: (id, updates) => ipcRenderer.invoke('claudecode:edit-provider', id, updates),
  removeProvider: (id) => ipcRenderer.invoke('claudecode:remove-provider', id),
  cloneProvider: (sourceId, newName) =>
    ipcRenderer.invoke('claudecode:clone-provider', sourceId, newName),
  getCurrent: () => ipcRenderer.invoke('claudecode:get-current'),
  findByName: (name) => ipcRenderer.invoke('claudecode:find-by-name', name),

  addPreset: (input) => ipcRenderer.invoke('claudecode:add-preset', input),
  listPresets: () => ipcRenderer.invoke('claudecode:list-presets'),
  editPreset: (name, updates) => ipcRenderer.invoke('claudecode:edit-preset', name, updates),
  removePreset: (name) => ipcRenderer.invoke('claudecode:remove-preset', name),
}

// ============================================================================
// 配置文件 API
// ============================================================================

export interface ConfigAPI {
  readConfigFiles: (
    tool: 'codex' | 'claudecode'
  ) => Promise<Array<{ name: string; path: string; content: string; language: 'json' | 'toml' }>>
  writeConfigFiles: (
    files: Array<{ name: string; path: string; content: string; language: 'json' | 'toml' }>
  ) => Promise<{ success: boolean }>
  readPresetConfigFiles: () => Promise<
    Array<{ name: string; path: string; content: string; language: 'json' | 'toml' }>
  >
  writePresetConfigFiles: (
    files: Array<{ name: string; path: string; content: string; language: 'json' | 'toml' }>
  ) => Promise<{ success: boolean }>
  migrate: () => Promise<{ success: boolean; message: string }>
}

const configAPI: ConfigAPI = {
  readConfigFiles: (tool) => ipcRenderer.invoke('read-config-files', tool),
  writeConfigFiles: (files) => ipcRenderer.invoke('write-config-files', files),
  readPresetConfigFiles: () => ipcRenderer.invoke('read-preset-config-files'),
  writePresetConfigFiles: (files) => ipcRenderer.invoke('write-preset-config-files', files),
  migrate: () => ipcRenderer.invoke('migrate-config'),
}

// ============================================================================
// 暴露 API 给渲染进程
// ============================================================================

contextBridge.exposeInMainWorld('electronAPI', {
  codex: codexAPI,
  claudecode: claudeCodeAPI,
  config: configAPI,
})

// ============================================================================
// TypeScript 类型声明
// ============================================================================

export interface ElectronAPI {
  codex: CodexAPI
  claudecode: ClaudeCodeAPI
  config: ConfigAPI
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

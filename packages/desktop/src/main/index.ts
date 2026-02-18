/**
 * Desktop Main Process
 *
 * 按照架构设计方案,Desktop Main Process 直接调用 Core API
 * 不通过 CLI,不需要胶水层
 *
 * 架构:
 * Renderer → Preload → Main → Core (tool-manager.ts)
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { registerUpdaterHandlers, backgroundCheckOnce } from './updater'
import path from 'path'
import fs from 'fs'
import {
  createCodexManager,
  createClaudeManager,
  createMCPManager,
  createGeminiManager,
  createOpenCodeManager,
  createOpenClawManager,
  migrateConfig,
  getClaudeConfigPath,
  getCodexConfigPath,
  getCodexAuthPath,
  getGeminiSettingsPath,
  getOpenCodeConfigPath,
  getOpenClawConfigPath,
  getOpenClawModelsPath,
  getCcmanDir,
  getCodexDir,
  getClaudeDir,
  getGeminiDir,
  getOpenCodeDir,
  getOpenClawDir,
  getGeminiEnvPath,
  testWebDAVConnection,
  uploadToCloud,
  downloadFromCloud,
  mergeSync,
  getSyncConfig,
  saveSyncConfig,
  exportConfig,
  importConfig,
  validateImportDir,
  analyzeClaudeJson,
  getProjectDetails,
  getCacheDetails,
  deleteProjectHistory,
  deleteCacheItem,
  cleanClaudeJson,
  CleanPresets,
  getProjectHistory,
  deleteHistoryEntry,
  clearProjectHistory,
  loadMCPConfig,
  toggleMCPForApp,
  getMCPAppStatus,
  getMCPConfigPath,
} from '@ccman/core'
import type {
  AddProviderInput,
  EditProviderInput,
  AddPresetInput,
  EditPresetInput,
  SyncConfig,
  AppType,
} from '@ccman/core'

// 设置日志文件（生产模式）
const isDev = process.env.NODE_ENV === 'development'
const isDebugMode = process.env.CCMAN_DEBUG === '1'
let logStream: fs.WriteStream | null = null

if (!isDev) {
  const logDir = path.join(getCcmanDir(), 'logs')
  fs.mkdirSync(logDir, { recursive: true })
  const logFile = path.join(logDir, `desktop-${Date.now()}.log`)
  logStream = fs.createWriteStream(logFile, { flags: 'a' })

  // 重定向 console.log 到文件
  const originalLog = console.log
  const originalError = console.error
  console.log = (...args) => {
    const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')
    logStream?.write(`[LOG] ${new Date().toISOString()} ${msg}\n`)
    originalLog(...args)
  }
  console.error = (...args) => {
    const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')
    logStream?.write(`[ERROR] ${new Date().toISOString()} ${msg}\n`)
    originalError(...args)
  }

  console.log('[Main] Log file created:', logFile)
}

// 开发模式：输出配置目录
if (isDev) {
  console.log('\n[开发模式] 配置目录:')
  console.log(`  ccman: ${getCcmanDir()}`)
  console.log(`  codex:  ${getCodexDir()}`)
  console.log(`  claude: ${getClaudeDir()}`)
  console.log(`  gemini: ${getGeminiDir()}`)
  console.log(`  opencode: ${getOpenCodeDir()}`)
  console.log(`  openclaw: ${getOpenClawDir()}`)
  console.log()
} else {
  console.log('\n[生产模式] 启动信息:')
  console.log(`  ccman: ${getCcmanDir()}`)
  console.log(`  codex:  ${getCodexDir()}`)
  console.log(`  claude: ${getClaudeDir()}`)
  console.log(`  gemini: ${getGeminiDir()}`)
  console.log(`  opencode: ${getOpenCodeDir()}`)
  console.log(`  openclaw: ${getOpenClawDir()}`)
  console.log(`  app.isPackaged: ${app.isPackaged}`)
  console.log()
}

let mainWindow: BrowserWindow | null = null
const getMainWindow = () => mainWindow

function createWindow() {
  console.log('[Main] Creating window...')

  // 获取正确的资源路径
  // 开发模式：__dirname = /path/to/dist/main
  // 生产模式：__dirname = /path/to/app.asar/dist/main
  const preloadPath = isDev
    ? path.join(__dirname, '../preload/index.js')
    : path.join(__dirname, '../preload/index.js')

  // 图标路径：开发模式从 build 目录读取，生产模式 electron-builder 会自动处理
  // macOS 使用 .icns，其他平台使用 .png
  const iconExt = process.platform === 'darwin' ? 'icns' : 'png'
  const iconPath = path.join(__dirname, `../../build/icon.${iconExt}`)

  console.log('[Main] Preload path:', preloadPath)
  console.log('[Main] Preload exists:', fs.existsSync(preloadPath))
  console.log('[Main] Icon path:', iconPath)
  console.log('[Main] Icon exists:', fs.existsSync(iconPath))

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // 先隐藏，ready-to-show 时再显示
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  })

  console.log('[Main] Window created, loading content...')
  console.log('[Main] __dirname:', __dirname)
  console.log('[Main] NODE_ENV:', process.env.NODE_ENV)
  console.log('[Main] app.isPackaged:', app.isPackaged)

  // 确保窗口显示
  mainWindow.once('ready-to-show', () => {
    console.log('[Main] Window ready to show, showing now...')
    mainWindow!.show()
    mainWindow!.focus()
  })

  // 加载渲染进程
  if (isDev) {
    console.log('[Main] Loading dev server: http://localhost:5173')
    mainWindow.loadURL('http://localhost:5173')
  } else {
    const htmlPath = path.join(__dirname, '../renderer/index.html')
    console.log('[Main] Loading production file:', htmlPath)
    console.log('[Main] File exists:', fs.existsSync(htmlPath))

    mainWindow
      .loadFile(htmlPath)
      .then(() => console.log('[Main] HTML loaded successfully'))
      .catch((err) => {
        console.error('[Main] Failed to load HTML:', err)
        dialog.showErrorBox('加载失败', `无法加载应用界面：${err.message}`)
      })
  }

  // 在开发模式或显式开启调试模式(CCMAN_DEBUG=1)时打开 DevTools
  if (isDev || isDebugMode) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    console.log('[Main] Window closed')
    mainWindow = null
  })

  // 添加额外的错误处理
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Content loaded successfully')
  })
}

// ============================================================================
// IPC 处理器 - Codex
// ============================================================================

// 添加 Codex provider
ipcMain.handle('codex:add-provider', async (_event, input: AddProviderInput) => {
  const manager = createCodexManager()
  return manager.add(input)
})

// 列出所有 Codex providers
ipcMain.handle('codex:list-providers', async () => {
  const manager = createCodexManager()
  return manager.list()
})

// 获取 Codex provider
ipcMain.handle('codex:get-provider', async (_event, id: string) => {
  const manager = createCodexManager()
  return manager.get(id)
})

// 切换 Codex provider
ipcMain.handle('codex:switch-provider', async (_event, id: string) => {
  const manager = createCodexManager()
  return manager.switch(id)
})

// 编辑 Codex provider
ipcMain.handle('codex:edit-provider', async (_event, id: string, updates: EditProviderInput) => {
  const manager = createCodexManager()
  return manager.edit(id, updates)
})

// 删除 Codex provider
ipcMain.handle('codex:remove-provider', async (_event, id: string) => {
  const manager = createCodexManager()
  return manager.remove(id)
})

// 克隆 Codex provider
ipcMain.handle('codex:clone-provider', async (_event, sourceId: string, newName: string) => {
  const manager = createCodexManager()
  return manager.clone(sourceId, newName)
})

// 获取当前 Codex provider
ipcMain.handle('codex:get-current', async () => {
  const manager = createCodexManager()
  return manager.getCurrent()
})

// 根据名称查找 Codex provider
ipcMain.handle('codex:find-by-name', async (_event, name: string) => {
  const manager = createCodexManager()
  return manager.findByName(name)
})

// ============================================================================
// IPC 处理器 - Gemini
// ============================================================================

// 添加 Gemini provider
ipcMain.handle('gemini:add-provider', async (_event, input: AddProviderInput) => {
  const manager = createGeminiManager()
  return manager.add(input)
})

// 列出所有 Gemini providers
ipcMain.handle('gemini:list-providers', async () => {
  const manager = createGeminiManager()
  return manager.list()
})

// 获取 Gemini provider
ipcMain.handle('gemini:get-provider', async (_event, id: string) => {
  const manager = createGeminiManager()
  return manager.get(id)
})

// 切换 Gemini provider
ipcMain.handle('gemini:switch-provider', async (_event, id: string) => {
  const manager = createGeminiManager()
  return manager.switch(id)
})

// 编辑 Gemini provider
ipcMain.handle('gemini:edit-provider', async (_event, id: string, updates: EditProviderInput) => {
  const manager = createGeminiManager()
  return manager.edit(id, updates)
})

// 删除 Gemini provider
ipcMain.handle('gemini:remove-provider', async (_event, id: string) => {
  const manager = createGeminiManager()
  return manager.remove(id)
})

// 克隆 Gemini provider
ipcMain.handle('gemini:clone-provider', async (_event, sourceId: string, newName: string) => {
  const manager = createGeminiManager()
  return manager.clone(sourceId, newName)
})

// 获取当前 Gemini provider
ipcMain.handle('gemini:get-current', async () => {
  const manager = createGeminiManager()
  return manager.getCurrent()
})

// 根据名称查找 Gemini provider
ipcMain.handle('gemini:find-by-name', async (_event, name: string) => {
  const manager = createGeminiManager()
  return manager.findByName(name)
})

// ============================================================================
// IPC 处理器 - OpenCode
// ============================================================================

// 添加 OpenCode provider
ipcMain.handle('opencode:add-provider', async (_event, input: AddProviderInput) => {
  const manager = createOpenCodeManager()
  return manager.add(input)
})

// 列出所有 OpenCode providers
ipcMain.handle('opencode:list-providers', async () => {
  const manager = createOpenCodeManager()
  return manager.list()
})

// 获取 OpenCode provider
ipcMain.handle('opencode:get-provider', async (_event, id: string) => {
  const manager = createOpenCodeManager()
  return manager.get(id)
})

// 切换 OpenCode provider
ipcMain.handle('opencode:switch-provider', async (_event, id: string) => {
  const manager = createOpenCodeManager()
  return manager.switch(id)
})

// 编辑 OpenCode provider
ipcMain.handle('opencode:edit-provider', async (_event, id: string, updates: EditProviderInput) => {
  const manager = createOpenCodeManager()
  return manager.edit(id, updates)
})

// 删除 OpenCode provider
ipcMain.handle('opencode:remove-provider', async (_event, id: string) => {
  const manager = createOpenCodeManager()
  return manager.remove(id)
})

// 克隆 OpenCode provider
ipcMain.handle('opencode:clone-provider', async (_event, sourceId: string, newName: string) => {
  const manager = createOpenCodeManager()
  return manager.clone(sourceId, newName)
})

// 获取当前 OpenCode provider
ipcMain.handle('opencode:get-current', async () => {
  const manager = createOpenCodeManager()
  return manager.getCurrent()
})

// 根据名称查找 OpenCode provider
ipcMain.handle('opencode:find-by-name', async (_event, name: string) => {
  const manager = createOpenCodeManager()
  return manager.findByName(name)
})

// ============================================================================
// IPC 处理器 - OpenClaw
// ============================================================================

// 添加 OpenClaw provider
ipcMain.handle('openclaw:add-provider', async (_event, input: AddProviderInput) => {
  const manager = createOpenClawManager()
  return manager.add(input)
})

// 列出所有 OpenClaw providers
ipcMain.handle('openclaw:list-providers', async () => {
  const manager = createOpenClawManager()
  return manager.list()
})

// 获取 OpenClaw provider
ipcMain.handle('openclaw:get-provider', async (_event, id: string) => {
  const manager = createOpenClawManager()
  return manager.get(id)
})

// 切换 OpenClaw provider
ipcMain.handle('openclaw:switch-provider', async (_event, id: string) => {
  const manager = createOpenClawManager()
  return manager.switch(id)
})

// 编辑 OpenClaw provider
ipcMain.handle('openclaw:edit-provider', async (_event, id: string, updates: EditProviderInput) => {
  const manager = createOpenClawManager()
  return manager.edit(id, updates)
})

// 删除 OpenClaw provider
ipcMain.handle('openclaw:remove-provider', async (_event, id: string) => {
  const manager = createOpenClawManager()
  return manager.remove(id)
})

// 克隆 OpenClaw provider
ipcMain.handle('openclaw:clone-provider', async (_event, sourceId: string, newName: string) => {
  const manager = createOpenClawManager()
  return manager.clone(sourceId, newName)
})

// 获取当前 OpenClaw provider
ipcMain.handle('openclaw:get-current', async () => {
  const manager = createOpenClawManager()
  return manager.getCurrent()
})

// 根据名称查找 OpenClaw provider
ipcMain.handle('openclaw:find-by-name', async (_event, name: string) => {
  const manager = createOpenClawManager()
  return manager.findByName(name)
})

// ============================================================================
// IPC 处理器 - OpenCode Presets
// ============================================================================

// 获取 OpenCode presets
ipcMain.handle('opencode:list-presets', async () => {
  const manager = createOpenCodeManager()
  return manager.listPresets()
})

// 添加 OpenCode preset
ipcMain.handle('opencode:add-preset', async (_event, input: AddPresetInput) => {
  const manager = createOpenCodeManager()
  return manager.addPreset(input)
})

// 编辑 OpenCode preset
ipcMain.handle('opencode:edit-preset', async (_event, name: string, updates: EditPresetInput) => {
  const manager = createOpenCodeManager()
  return manager.editPreset(name, updates)
})

// 删除 OpenCode preset
ipcMain.handle('opencode:remove-preset', async (_event, name: string) => {
  const manager = createOpenCodeManager()
  return manager.removePreset(name)
})

// ============================================================================
// IPC 处理器 - OpenClaw Presets
// ============================================================================

// 获取 OpenClaw presets
ipcMain.handle('openclaw:list-presets', async () => {
  const manager = createOpenClawManager()
  return manager.listPresets()
})

// 添加 OpenClaw preset
ipcMain.handle('openclaw:add-preset', async (_event, input: AddPresetInput) => {
  const manager = createOpenClawManager()
  return manager.addPreset(input)
})

// 编辑 OpenClaw preset
ipcMain.handle('openclaw:edit-preset', async (_event, name: string, updates: EditPresetInput) => {
  const manager = createOpenClawManager()
  return manager.editPreset(name, updates)
})

// 删除 OpenClaw preset
ipcMain.handle('openclaw:remove-preset', async (_event, name: string) => {
  const manager = createOpenClawManager()
  return manager.removePreset(name)
})

// ============================================================================
// IPC 处理器 - Gemini Presets
// ============================================================================

// 获取 Gemini presets
ipcMain.handle('gemini:list-presets', async () => {
  const manager = createGeminiManager()
  return manager.listPresets()
})

// 添加 Gemini preset
ipcMain.handle('gemini:add-preset', async (_event, input: AddPresetInput) => {
  const manager = createGeminiManager()
  return manager.addPreset(input)
})

// 编辑 Gemini preset
ipcMain.handle('gemini:edit-preset', async (_event, name: string, updates: EditPresetInput) => {
  const manager = createGeminiManager()
  return manager.editPreset(name, updates)
})

// 删除 Gemini preset
ipcMain.handle('gemini:remove-preset', async (_event, name: string) => {
  const manager = createGeminiManager()
  return manager.removePreset(name)
})

// ============================================================================
// IPC 处理器 - Claude
// ============================================================================

// 添加 Claude provider
ipcMain.handle('claude:add-provider', async (_event, input: AddProviderInput) => {
  const manager = createClaudeManager()
  return manager.add(input)
})

// 列出所有 Claude providers
ipcMain.handle('claude:list-providers', async () => {
  const manager = createClaudeManager()
  return manager.list()
})

// 获取 Claude provider
ipcMain.handle('claude:get-provider', async (_event, id: string) => {
  const manager = createClaudeManager()
  return manager.get(id)
})

// 切换 Claude provider
ipcMain.handle('claude:switch-provider', async (_event, id: string) => {
  const manager = createClaudeManager()
  return manager.switch(id)
})

// 编辑 Claude provider
ipcMain.handle('claude:edit-provider', async (_event, id: string, updates: EditProviderInput) => {
  const manager = createClaudeManager()
  return manager.edit(id, updates)
})

// 删除 Claude provider
ipcMain.handle('claude:remove-provider', async (_event, id: string) => {
  const manager = createClaudeManager()
  return manager.remove(id)
})

// 克隆 Claude provider
ipcMain.handle('claude:clone-provider', async (_event, sourceId: string, newName: string) => {
  const manager = createClaudeManager()
  return manager.clone(sourceId, newName)
})

// 获取当前 Claude provider
ipcMain.handle('claude:get-current', async () => {
  const manager = createClaudeManager()
  return manager.getCurrent()
})

// 根据名称查找 Claude provider
ipcMain.handle('claude:find-by-name', async (_event, name: string) => {
  const manager = createClaudeManager()
  return manager.findByName(name)
})

// ============================================================================
// IPC 处理器 - Codex Presets
// ============================================================================

// 获取 Codex presets
ipcMain.handle('codex:list-presets', async () => {
  const manager = createCodexManager()
  return manager.listPresets()
})

// 添加 Codex preset
ipcMain.handle('codex:add-preset', async (_event, input: AddPresetInput) => {
  const manager = createCodexManager()
  return manager.addPreset(input)
})

// 编辑 Codex preset
ipcMain.handle('codex:edit-preset', async (_event, name: string, updates: EditPresetInput) => {
  const manager = createCodexManager()
  return manager.editPreset(name, updates)
})

// 删除 Codex preset
ipcMain.handle('codex:remove-preset', async (_event, name: string) => {
  const manager = createCodexManager()
  return manager.removePreset(name)
})

// ============================================================================
// IPC 处理器 - Claude Presets
// ============================================================================

// 获取 Claude presets
ipcMain.handle('claude:list-presets', async () => {
  const manager = createClaudeManager()
  return manager.listPresets()
})

// 添加 Claude preset
ipcMain.handle('claude:add-preset', async (_event, input: AddPresetInput) => {
  const manager = createClaudeManager()
  return manager.addPreset(input)
})

// 编辑 Claude preset
ipcMain.handle('claude:edit-preset', async (_event, name: string, updates: EditPresetInput) => {
  const manager = createClaudeManager()
  return manager.editPreset(name, updates)
})

// 删除 Claude preset
ipcMain.handle('claude:remove-preset', async (_event, name: string) => {
  const manager = createClaudeManager()
  return manager.removePreset(name)
})

// ============================================================================
// IPC 处理器 - 配置文件读写
// ============================================================================

// 读取配置文件
ipcMain.handle(
  'read-config-files',
  async (_event, tool: 'codex' | 'claude' | 'mcp' | 'gemini' | 'opencode' | 'openclaw') => {
    try {
      if (tool === 'claude') {
        const path = getClaudeConfigPath()

        // 检查文件是否存在
        if (!fs.existsSync(path)) {
          return [
            {
              name: 'settings.json',
              path,
              content: '# 配置文件不存在\n# 请先使用 ccman 添加服务商，配置文件将自动创建',
              language: 'json' as const,
            },
          ]
        }

        const content = fs.readFileSync(path, 'utf-8')
        return [
          {
            name: 'settings.json',
            path,
            content,
            language: 'json' as const,
          },
        ]
      } else if (tool === 'mcp') {
        const path = getMCPConfigPath()

        // 检查文件是否存在
        if (!fs.existsSync(path)) {
          return [
            {
              name: 'mcp.json',
              path,
              content: '# MCP 配置文件不存在\n# 请先使用 CLI 添加 MCP 服务器：ccman mcp add',
              language: 'json' as const,
            },
          ]
        }

        const content = fs.readFileSync(path, 'utf-8')
        return [
          {
            name: 'mcp.json',
            path,
            content,
            language: 'json' as const,
          },
        ]
      } else if (tool === 'codex') {
        const configPath = getCodexConfigPath()
        const authPath = getCodexAuthPath()

        const result = []

        // 检查 config.toml 是否存在
        if (fs.existsSync(configPath)) {
          result.push({
            name: 'config.toml',
            path: configPath,
            content: fs.readFileSync(configPath, 'utf-8'),
            language: 'toml' as const,
          })
        } else {
          result.push({
            name: 'config.toml',
            path: configPath,
            content: '# 配置文件不存在\n# 请先使用 ccman 添加服务商，配置文件将自动创建',
            language: 'toml' as const,
          })
        }

        // 检查 auth.json 是否存在
        if (fs.existsSync(authPath)) {
          result.push({
            name: 'auth.json',
            path: authPath,
            content: fs.readFileSync(authPath, 'utf-8'),
            language: 'json' as const,
          })
        } else {
          result.push({
            name: 'auth.json',
            path: authPath,
            content: '{\n  "注意": "配置文件不存在，请先使用 ccman 添加服务商"\n}',
            language: 'json' as const,
          })
        }

        return result
      } else if (tool === 'gemini') {
        const settingsPath = getGeminiSettingsPath()
        const envPath = getGeminiEnvPath()

        const result: Array<{
          name: string
          path: string
          content: string
          language: 'json' | 'toml' | 'env'
        }> = []

        // settings.json
        if (fs.existsSync(settingsPath)) {
          result.push({
            name: 'settings.json',
            path: settingsPath,
            content: fs.readFileSync(settingsPath, 'utf-8'),
            language: 'json',
          })
        } else {
          result.push({
            name: 'settings.json',
            path: settingsPath,
            content: '# 配置文件不存在\n# 请先使用 ccman gm add 添加服务商，配置文件将自动创建',
            language: 'json',
          })
        }

        // .env
        if (fs.existsSync(envPath)) {
          result.push({
            name: '.env',
            path: envPath,
            content: fs.readFileSync(envPath, 'utf-8'),
            language: 'env',
          })
        } else {
          result.push({
            name: '.env',
            path: envPath,
            content:
              '# .env 文件不存在\n# 将在切换到带有 baseUrl/apiKey 的服务商时自动创建\n' +
              '# 也可以手动创建，例如：\n' +
              '# GOOGLE_GEMINI_BASE_URL=https://gmn.chuangzuoli.com\n' +
              '# GEMINI_API_KEY=YOUR_GMN_TOKEN_HERE\n' +
              '# GEMINI_MODEL=gemini-2.5-pro\n',
            language: 'env',
          })
        }

        return result
      } else if (tool === 'opencode') {
        const opencodePath = getOpenCodeConfigPath()

        if (!fs.existsSync(opencodePath)) {
          return [
            {
              name: 'opencode.json',
              path: opencodePath,
              content: '# 配置文件不存在\n# 请先使用 ccman oc add 添加服务商，配置文件将自动创建\n',
              language: 'json' as const,
            },
          ]
        }

        const content = fs.readFileSync(opencodePath, 'utf-8')
        return [
          {
            name: 'opencode.json',
            path: opencodePath,
            content,
            language: 'json' as const,
          },
        ]
      } else if (tool === 'openclaw') {
        const openclawPath = getOpenClawConfigPath()
        const modelsPath = getOpenClawModelsPath()

        const result: Array<{
          name: string
          path: string
          content: string
          language: 'json' | 'toml' | 'env'
        }> = []

        if (fs.existsSync(openclawPath)) {
          result.push({
            name: 'openclaw.json',
            path: openclawPath,
            content: fs.readFileSync(openclawPath, 'utf-8'),
            language: 'json',
          })
        } else {
          result.push({
            name: 'openclaw.json',
            path: openclawPath,
            content:
              '# 配置文件不存在\n# 请先使用 ccman openclaw add 添加服务商，配置文件将自动创建\n',
            language: 'json',
          })
        }

        if (fs.existsSync(modelsPath)) {
          result.push({
            name: 'models.json',
            path: modelsPath,
            content: fs.readFileSync(modelsPath, 'utf-8'),
            language: 'json',
          })
        } else {
          result.push({
            name: 'models.json',
            path: modelsPath,
            content:
              '# 配置文件不存在\n# 请先使用 ccman openclaw use 切换服务商，配置文件将自动创建\n',
            language: 'json',
          })
        }

        return result
      }
      return []
    } catch (error) {
      throw new Error(`读取配置文件失败：${(error as Error).message}`)
    }
  }
)

// 写入配置文件
ipcMain.handle(
  'write-config-files',
  async (
    _event,
    files: Array<{ name: string; path: string; content: string; language: 'json' | 'toml' | 'env' }>
  ) => {
    try {
      // 备份所有文件
      const backups: Array<{ path: string; content: string }> = []
      for (const file of files) {
        if (fs.existsSync(file.path)) {
          backups.push({
            path: file.path,
            content: fs.readFileSync(file.path, 'utf-8'),
          })
        }
      }

      try {
        // 写入所有文件
        for (const file of files) {
          fs.mkdirSync(path.dirname(file.path), { recursive: true })
          fs.writeFileSync(file.path, file.content, 'utf-8')
        }
        return { success: true }
      } catch (error) {
        // 回滚
        for (const backup of backups) {
          fs.writeFileSync(backup.path, backup.content, 'utf-8')
        }
        throw error
      }
    } catch (error) {
      throw new Error(`写入配置文件失败：${(error as Error).message}`)
    }
  }
)

// 读取 ccman 配置文件（用于 Settings 按钮）
ipcMain.handle('read-ccman-config-files', async () => {
  try {
    const codexPath = path.join(getCcmanDir(), 'codex.json')
    const claudePath = path.join(getCcmanDir(), 'claude.json')
    const geminiPath = path.join(getCcmanDir(), 'gemini.json')
    const opencodePath = path.join(getCcmanDir(), 'opencode.json')
    const openclawPath = path.join(getCcmanDir(), 'openclaw.json')

    const files: Array<{ name: string; path: string; content: string; language: 'json' }> = []

    // Codex
    files.push({
      name: 'codex.json',
      path: codexPath,
      content: fs.existsSync(codexPath)
        ? fs.readFileSync(codexPath, 'utf-8')
        : '{\n  "providers": [],\n  "presets": []\n}\n',
      language: 'json',
    })

    // Claude
    files.push({
      name: 'claude.json',
      path: claudePath,
      content: fs.existsSync(claudePath)
        ? fs.readFileSync(claudePath, 'utf-8')
        : '{\n  "providers": [],\n  "presets": []\n}\n',
      language: 'json',
    })

    // Gemini
    files.push({
      name: 'gemini.json',
      path: geminiPath,
      content: fs.existsSync(geminiPath)
        ? fs.readFileSync(geminiPath, 'utf-8')
        : '{\n  "providers": [],\n  "presets": []\n}\n',
      language: 'json',
    })

    // OpenCode
    files.push({
      name: 'opencode.json',
      path: opencodePath,
      content: fs.existsSync(opencodePath)
        ? fs.readFileSync(opencodePath, 'utf-8')
        : '{\n  "providers": [],\n  "presets": []\n}\n',
      language: 'json',
    })

    // OpenClaw
    files.push({
      name: 'openclaw.json',
      path: openclawPath,
      content: fs.existsSync(openclawPath)
        ? fs.readFileSync(openclawPath, 'utf-8')
        : '{\n  "providers": [],\n  "presets": []\n}\n',
      language: 'json',
    })

    return files
  } catch (error) {
    throw new Error(`读取 ccman 配置文件失败：${(error as Error).message}`)
  }
})

// 写入 ccman 配置文件（用于 Settings 按钮）
ipcMain.handle(
  'write-ccman-config-files',
  async (
    _event,
    files: Array<{ name: string; path: string; content: string; language: 'json' | 'toml' | 'env' }>
  ) => {
    try {
      // 备份所有文件
      const backups: Array<{ path: string; content: string }> = []
      for (const file of files) {
        if (fs.existsSync(file.path)) {
          backups.push({
            path: file.path,
            content: fs.readFileSync(file.path, 'utf-8'),
          })
        }
      }

      try {
        // 写入所有文件
        for (const file of files) {
          fs.mkdirSync(path.dirname(file.path), { recursive: true })
          fs.writeFileSync(file.path, file.content, 'utf-8')
        }
        return { success: true }
      } catch (error) {
        // 回滚
        for (const backup of backups) {
          fs.writeFileSync(backup.path, backup.content, 'utf-8')
        }
        throw error
      }
    } catch (error) {
      throw new Error(`写入 ccman 配置文件失败：${(error as Error).message}`)
    }
  }
)

// ============================================================================
// IPC 处理器 - 迁移
// ============================================================================

// 迁移配置
ipcMain.handle('migrate-config', async () => {
  return migrateConfig()
})

// ============================================================================
// IPC 处理器 - WebDAV 同步
// ============================================================================

// 保存 WebDAV 配置（使用统一的 config.json）
ipcMain.handle('sync:save-config', async (_event, config: SyncConfig) => {
  try {
    saveSyncConfig(config)
    return { success: true }
  } catch (error) {
    throw new Error(`保存配置失败：${(error as Error).message}`)
  }
})

// 获取 WebDAV 配置
ipcMain.handle('sync:get-config', async () => {
  try {
    return getSyncConfig()
  } catch (error) {
    throw new Error(`读取配置失败：${(error as Error).message}`)
  }
})

// 测试 WebDAV 连接
ipcMain.handle('sync:test-connection', async (_event, config: SyncConfig) => {
  try {
    return await testWebDAVConnection(config)
  } catch (error) {
    throw new Error(`连接测试失败：${(error as Error).message}`)
  }
})

// ============================================================================
// IPC 处理器 - WebDAV 智能同步
// ============================================================================

// 上传到云端（加密 API Key）
ipcMain.handle('sync:upload-to-cloud', async (_event, config: SyncConfig, password: string) => {
  try {
    await uploadToCloud(config, password)
    return { success: true }
  } catch (error) {
    throw new Error(`上传到云端失败：${(error as Error).message}`)
  }
})

// 从云端下载（解密 API Key）
ipcMain.handle('sync:download-from-cloud', async (_event, config: SyncConfig, password: string) => {
  try {
    const backupPaths = await downloadFromCloud(config, password)
    return backupPaths
  } catch (error) {
    throw new Error(`从云端下载失败：${(error as Error).message}`)
  }
})

// 智能合并同步
ipcMain.handle('sync:merge-sync', async (_event, config: SyncConfig, password: string) => {
  try {
    const result = await mergeSync(config, password)
    return result
  } catch (error) {
    throw new Error(`智能合并失败：${(error as Error).message}`)
  }
})

// ============================================================================
// IPC 处理器 - 系统操作
// ============================================================================

// 打开文件夹
ipcMain.handle('open-folder', async () => {
  try {
    const ccmanDir = getCcmanDir()
    await shell.openPath(ccmanDir)
    return { success: true }
  } catch (error) {
    throw new Error(`打开文件夹失败：${(error as Error).message}`)
  }
})

// 打开 URL
ipcMain.handle('open-url', async (_event, url: string) => {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    throw new Error(`打开链接失败：${(error as Error).message}`)
  }
})

// 获取应用版本号
// 使用 Electron 的 app.getVersion() 自动读取 package.json
// 这比从 @ccman/core 导入 VERSION 更可靠，因为：
// 1. Electron 在打包时一定会读取 package.json（build 配置在里面）
// 2. app.getVersion() 在运行时从 Electron 内部获取，不依赖文件系统
ipcMain.handle('system:get-app-version', async () => {
  return app.getVersion()
})

// ============================================================================
// IPC 处理器 - 导入导出
// ============================================================================

// 选择文件夹
ipcMain.handle('importexport:select-folder', async (_event, title: string) => {
  try {
    const result = await dialog.showOpenDialog({
      title,
      properties: ['openDirectory', 'createDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  } catch (error) {
    throw new Error(`选择文件夹失败：${(error as Error).message}`)
  }
})

// 导出配置
ipcMain.handle('importexport:export', async (_event, targetDir: string) => {
  try {
    const result = exportConfig(targetDir)
    return {
      success: result.success,
      exportedFiles: result.exportedFiles,
    }
  } catch (error) {
    throw new Error(`导出配置失败：${(error as Error).message}`)
  }
})

// 导入配置
ipcMain.handle('importexport:import', async (_event, sourceDir: string) => {
  try {
    const result = importConfig(sourceDir)
    return {
      success: result.success,
      backupPaths: result.backupPaths,
      importedFiles: result.importedFiles,
    }
  } catch (error) {
    throw new Error(`导入配置失败：${(error as Error).message}`)
  }
})

// 验证导入目录
ipcMain.handle('importexport:validate', async (_event, sourceDir: string) => {
  try {
    const result = validateImportDir(sourceDir)
    return {
      valid: result.valid,
      message: result.message,
      foundFiles: result.foundFiles,
    }
  } catch (error) {
    throw new Error(`验证目录失败：${(error as Error).message}`)
  }
})

// ============================================================================
// IPC 处理器 - Clean (~/.claude.json 清理)
// ============================================================================

// 分析 ~/.claude.json 文件
ipcMain.handle('clean:analyze', async () => {
  try {
    return analyzeClaudeJson()
  } catch (error) {
    throw new Error(`分析失败：${(error as Error).message}`)
  }
})

// 获取所有项目详情
ipcMain.handle('clean:get-projects', async () => {
  try {
    return getProjectDetails()
  } catch (error) {
    throw new Error(`获取项目列表失败：${(error as Error).message}`)
  }
})

// 获取所有缓存详情
ipcMain.handle('clean:get-caches', async () => {
  try {
    return getCacheDetails()
  } catch (error) {
    throw new Error(`获取缓存列表失败：${(error as Error).message}`)
  }
})

// 删除单个项目的历史记录
ipcMain.handle('clean:delete-project', async (_event, projectPath: string) => {
  try {
    deleteProjectHistory(projectPath)
  } catch (error) {
    throw new Error(`删除项目历史失败：${(error as Error).message}`)
  }
})

// 删除单个缓存项
ipcMain.handle('clean:delete-cache', async (_event, cacheKey: string) => {
  try {
    deleteCacheItem(cacheKey)
  } catch (error) {
    throw new Error(`删除缓存失败：${(error as Error).message}`)
  }
})

// 执行预设清理
ipcMain.handle(
  'clean:execute-preset',
  async (_event, preset: 'conservative' | 'moderate' | 'aggressive') => {
    try {
      const options = CleanPresets[preset]()
      return cleanClaudeJson(options)
    } catch (error) {
      throw new Error(`清理失败：${(error as Error).message}`)
    }
  }
)

// 获取项目历史记录
ipcMain.handle('clean:get-project-history', async (_event, projectPath: string) => {
  try {
    return getProjectHistory(projectPath)
  } catch (error) {
    throw new Error(`获取历史记录失败：${(error as Error).message}`)
  }
})

// 删除单条历史记录
ipcMain.handle('clean:delete-history-entry', async (_event, projectPath: string, index: number) => {
  try {
    deleteHistoryEntry(projectPath, index)
  } catch (error) {
    throw new Error(`删除历史记录失败：${(error as Error).message}`)
  }
})

// 清空项目历史记录
ipcMain.handle('clean:clear-project-history', async (_event, projectPath: string) => {
  try {
    clearProjectHistory(projectPath)
  } catch (error) {
    throw new Error(`清空历史记录失败：${(error as Error).message}`)
  }
})

// ============================================================================
// IPC 处理器 - MCP 服务器管理
// ============================================================================

// 列出所有 MCP 服务器
ipcMain.handle('mcp:list-servers', async () => {
  try {
    const config = loadMCPConfig()
    return config.servers
  } catch (error) {
    throw new Error(`加载 MCP 列表失败：${(error as Error).message}`)
  }
})

// 切换 MCP 在某个应用上的启用状态
ipcMain.handle('mcp:toggle-app', async (_event, mcpId: string, app: AppType, enabled: boolean) => {
  try {
    toggleMCPForApp(mcpId, app, enabled)
    return { success: true }
  } catch (error) {
    throw new Error(`切换 MCP 状态失败：${(error as Error).message}`)
  }
})

// 获取 MCP 在各个应用上的启用状态
ipcMain.handle('mcp:get-app-status', async (_event, mcpId: string) => {
  try {
    return getMCPAppStatus(mcpId)
  } catch (error) {
    throw new Error(`获取 MCP 状态失败：${(error as Error).message}`)
  }
})

// 添加 MCP 服务器
ipcMain.handle('mcp:add-server', async (_event, input: AddProviderInput) => {
  try {
    const manager = createMCPManager()
    return manager.add(input)
  } catch (error) {
    throw new Error(`添加 MCP 失败：${(error as Error).message}`)
  }
})

// 获取单个 MCP 服务器
ipcMain.handle('mcp:get-server', async (_event, id: string) => {
  try {
    const manager = createMCPManager()
    return manager.get(id)
  } catch (error) {
    throw new Error(`获取 MCP 失败：${(error as Error).message}`)
  }
})

// 编辑 MCP 服务器
ipcMain.handle('mcp:edit-server', async (_event, id: string, updates: EditProviderInput) => {
  try {
    const manager = createMCPManager()
    return manager.edit(id, updates)
  } catch (error) {
    throw new Error(`编辑 MCP 失败：${(error as Error).message}`)
  }
})

// 克隆 MCP 服务器
ipcMain.handle('mcp:clone-server', async (_event, sourceId: string, newName: string) => {
  try {
    const manager = createMCPManager()
    return manager.clone(sourceId, newName)
  } catch (error) {
    throw new Error(`克隆 MCP 失败：${(error as Error).message}`)
  }
})

// 删除 MCP 服务器
ipcMain.handle('mcp:remove-server', async (_event, id: string) => {
  try {
    const manager = createMCPManager()
    manager.remove(id)
    return { success: true }
  } catch (error) {
    throw new Error(`删除 MCP 失败：${(error as Error).message}`)
  }
})

// ============================================================================
// App 生命周期
// ============================================================================

app.whenReady().then(() => {
  // macOS: 设置 Dock 图标
  if (process.platform === 'darwin' && app.dock) {
    const dockIconPath = path.join(__dirname, '../../build/icon.png')
    if (fs.existsSync(dockIconPath)) {
      app.dock.setIcon(dockIconPath)
      console.log('[Main] Dock icon set:', dockIconPath)
    }
  }

  createWindow()
  // Register auto-updater IPC and events
  registerUpdaterHandlers(getMainWindow)

  // Background check 15s after launch, then every 6 hours
  setTimeout(() => {
    backgroundCheckOnce().catch((e) => {
      console.error('[Updater] Background check failed:', e?.message || e)
    })
  }, 15000)
  setInterval(
    () => {
      backgroundCheckOnce().catch((e) => {
        console.error('[Updater] Periodic check failed:', e?.message || e)
      })
    },
    6 * 60 * 60 * 1000
  )

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  if (logStream) {
    logStream.end()
  }
})

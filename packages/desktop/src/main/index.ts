/**
 * Desktop Main Process
 *
 * 按照架构设计方案,Desktop Main Process 直接调用 Core API
 * 不通过 CLI,不需要胶水层
 *
 * 架构:
 * Renderer → Preload → Main → Core (tool-manager.ts)
 */

import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import {
  createCodexManager,
  createClaudeCodeManager,
  migrateConfig,
  getClaudeConfigPath,
  getCodexConfigPath,
  getCodexAuthPath,
  getCcmanDir,
  getCodexDir,
  getClaudeDir,
} from '@ccman/core'
import type { AddProviderInput, EditProviderInput, AddPresetInput, EditPresetInput } from '@ccman/core'

// 设置日志文件（生产模式）
const isDev = process.env.NODE_ENV === 'development'
let logStream: fs.WriteStream | null = null

if (!isDev) {
  const logDir = path.join(os.homedir(), '.ccman', 'logs')
  fs.mkdirSync(logDir, { recursive: true })
  const logFile = path.join(logDir, `desktop-${Date.now()}.log`)
  logStream = fs.createWriteStream(logFile, { flags: 'a' })

  // 重定向 console.log 到文件
  const originalLog = console.log
  const originalError = console.error
  console.log = (...args) => {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')
    logStream?.write(`[LOG] ${new Date().toISOString()} ${msg}\n`)
    originalLog(...args)
  }
  console.error = (...args) => {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')
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
  console.log()
} else {
  console.log('\n[生产模式] 启动信息:')
  console.log(`  ccman: ${getCcmanDir()}`)
  console.log(`  codex:  ${getCodexDir()}`)
  console.log(`  claude: ${getClaudeDir()}`)
  console.log(`  app.isPackaged: ${app.isPackaged}`)
  console.log(`  __dirname: ${__dirname}`)
  console.log()
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  console.log('[Main] Creating window...')

  // 获取正确的资源路径
  // 开发模式：__dirname = /path/to/dist/main
  // 生产模式：__dirname = /path/to/app.asar/dist/main
  const isDev = process.env.NODE_ENV === 'development'
  const preloadPath = isDev
    ? path.join(__dirname, '../preload/index.js')
    : path.join(__dirname, '../preload/index.js')

  console.log('[Main] Preload path:', preloadPath)
  console.log('[Main] Preload exists:', fs.existsSync(preloadPath))

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // 先隐藏，ready-to-show 时再显示
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
    mainWindow.webContents.openDevTools()
  } else {
    const htmlPath = path.join(__dirname, '../renderer/index.html')
    console.log('[Main] Loading production file:', htmlPath)
    console.log('[Main] File exists:', fs.existsSync(htmlPath))

    mainWindow.loadFile(htmlPath)
      .then(() => console.log('[Main] HTML loaded successfully'))
      .catch(err => {
        console.error('[Main] Failed to load HTML:', err)
        // 显示错误对话框
        const { dialog } = require('electron')
        dialog.showErrorBox('加载失败', `无法加载应用界面：${err.message}`)
      })
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
// IPC 处理器 - Claude Code
// ============================================================================

// 添加 Claude Code provider
ipcMain.handle('claudecode:add-provider', async (_event, input: AddProviderInput) => {
  const manager = createClaudeCodeManager()
  return manager.add(input)
})

// 列出所有 Claude Code providers
ipcMain.handle('claudecode:list-providers', async () => {
  const manager = createClaudeCodeManager()
  return manager.list()
})

// 获取 Claude Code provider
ipcMain.handle('claudecode:get-provider', async (_event, id: string) => {
  const manager = createClaudeCodeManager()
  return manager.get(id)
})

// 切换 Claude Code provider
ipcMain.handle('claudecode:switch-provider', async (_event, id: string) => {
  const manager = createClaudeCodeManager()
  return manager.switch(id)
})

// 编辑 Claude Code provider
ipcMain.handle('claudecode:edit-provider', async (_event, id: string, updates: EditProviderInput) => {
  const manager = createClaudeCodeManager()
  return manager.edit(id, updates)
})

// 删除 Claude Code provider
ipcMain.handle('claudecode:remove-provider', async (_event, id: string) => {
  const manager = createClaudeCodeManager()
  return manager.remove(id)
})

// 克隆 Claude Code provider
ipcMain.handle('claudecode:clone-provider', async (_event, sourceId: string, newName: string) => {
  const manager = createClaudeCodeManager()
  return manager.clone(sourceId, newName)
})

// 获取当前 Claude Code provider
ipcMain.handle('claudecode:get-current', async () => {
  const manager = createClaudeCodeManager()
  return manager.getCurrent()
})

// 根据名称查找 Claude Code provider
ipcMain.handle('claudecode:find-by-name', async (_event, name: string) => {
  const manager = createClaudeCodeManager()
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
// IPC 处理器 - Claude Code Presets
// ============================================================================

// 获取 Claude Code presets
ipcMain.handle('claudecode:list-presets', async () => {
  const manager = createClaudeCodeManager()
  return manager.listPresets()
})

// 添加 Claude Code preset
ipcMain.handle('claudecode:add-preset', async (_event, input: AddPresetInput) => {
  const manager = createClaudeCodeManager()
  return manager.addPreset(input)
})

// 编辑 Claude Code preset
ipcMain.handle('claudecode:edit-preset', async (_event, name: string, updates: EditPresetInput) => {
  const manager = createClaudeCodeManager()
  return manager.editPreset(name, updates)
})

// 删除 Claude Code preset
ipcMain.handle('claudecode:remove-preset', async (_event, name: string) => {
  const manager = createClaudeCodeManager()
  return manager.removePreset(name)
})

// ============================================================================
// IPC 处理器 - 配置文件读写
// ============================================================================

// 读取配置文件
ipcMain.handle('read-config-files', async (_event, tool: 'codex' | 'claudecode') => {
  try {
    if (tool === 'claudecode') {
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
    }
    return []
  } catch (error) {
    throw new Error(`读取配置文件失败：${(error as Error).message}`)
  }
})

// 写入配置文件
ipcMain.handle(
  'write-config-files',
  async (
    _event,
    files: Array<{ name: string; path: string; content: string; language: 'json' | 'toml' }>
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

// 读取预置配置文件（用于 Settings 按钮）
ipcMain.handle('read-preset-config-files', async () => {
  try {
    const codexPath = path.join(getCcmanDir(), 'codex.json')
    const claudecodePath = path.join(getCcmanDir(), 'claudecode.json')

    return [
      {
        name: 'codex.json',
        path: codexPath,
        content: fs.readFileSync(codexPath, 'utf-8'),
        language: 'json' as const,
      },
      {
        name: 'claudecode.json',
        path: claudecodePath,
        content: fs.readFileSync(claudecodePath, 'utf-8'),
        language: 'json' as const,
      },
    ]
  } catch (error) {
    throw new Error(`读取预置配置文件失败：${(error as Error).message}`)
  }
})

// 写入预置配置文件（用于 Settings 按钮）
ipcMain.handle(
  'write-preset-config-files',
  async (
    _event,
    files: Array<{ name: string; path: string; content: string; language: 'json' | 'toml' }>
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
      throw new Error(`写入预置配置文件失败：${(error as Error).message}`)
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
// App 生命周期
// ============================================================================

app.whenReady().then(() => {
  createWindow()

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

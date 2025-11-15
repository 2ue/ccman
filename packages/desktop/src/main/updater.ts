import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import os from 'os'
import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { URL } from 'url'
import { spawn } from 'child_process'

type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string; notes?: string | null }
  | { type: 'not-available'; version: string }
  | { type: 'error'; message: string }
  | { type: 'progress'; percent: number; bytesPerSecond: number; transferred: number; total: number }
  | { type: 'downloaded'; version: string }
  | { type: 'manual-downloaded'; filePath: string }

const REPO_OWNER = '2ue'
const REPO_NAME = 'ccman'

type UpdaterStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error'
const state: {
  status: UpdaterStatus
  version?: string
  lastError?: string
  manualPath?: string
  checkingPromise?: Promise<any> | null
  downloadPromise?: Promise<any> | null
} = {
  status: 'idle',
  checkingPromise: null,
  downloadPromise: null,
}

function send(win: BrowserWindow | null, payload: UpdateEvent) {
  try {
    win?.webContents.send('update:event', payload)
  } catch {
    // no-op
  }
}

function archLabel(): 'x64' | 'arm64' {
  return process.arch === 'arm64' ? 'arm64' : 'x64'
}

function chooseMacAssetName(version: string): string[] {
  // Prefer universal > arch-specific
  const a = `ccman-${version}-macos-universal.dmg`
  const b = `ccman-${version}-macos-${archLabel()}.dmg`
  // electron-builder also emits .zip used for auto-update on mac
  const zipA = `ccman-${version}-macos-universal.zip`
  const zipB = `ccman-${version}-macos-${archLabel()}.zip`
  return [a, b, zipA, zipB]
}

function chooseWinAssetName(version: string): string[] {
  const exe = `ccman-${version}-windows-x64.exe`
  return [exe]
}

async function fetchLatestRelease() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
  const headers = {
    'User-Agent': 'ccman-updater',
    Accept: 'application/vnd.github+json',
  }
  return new Promise<any>((resolve, reject) => {
    https
      .get(url, { headers }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`GitHub API error: ${res.statusCode}`))
          return
        }
        const chunks: Buffer[] = []
        res.on('data', (d) => chunks.push(d))
        res.on('end', () => {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
            resolve(json)
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })
}

function followableGet(u: string) {
  const parsed = new URL(u)
  return parsed.protocol === 'http:' ? http.get : https.get
}

function downloadWithProgress(urlStr: string, targetPath: string, onProgress: (p: UpdateEvent) => void, maxRedirects = 5) {
  return new Promise<string>((resolve, reject) => {
    const file = fs.createWriteStream(targetPath)
    const makeReq = (u: string, redirectsLeft: number) => {
      const getter = followableGet(u)
      const req = getter(u, { headers: { 'User-Agent': 'ccman-updater' } } as any, (res: any) => {
        // handle redirects
        if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode)) {
          if (redirectsLeft <= 0) {
            file.close()
            fs.rmSync(targetPath, { force: true })
            reject(new Error('Too many redirects'))
            return
          }
          const location = res.headers.location
          if (!location) {
            reject(new Error('Redirect without Location header'))
            return
          }
          // close previous response
          res.resume()
          makeReq(new URL(location, u).toString(), redirectsLeft - 1)
          return
        }
        if (res.statusCode && res.statusCode >= 400) {
          file.close()
          fs.rmSync(targetPath, { force: true })
          reject(new Error(`HTTP ${res.statusCode} downloading ${path.basename(targetPath)}`))
          return
        }
        const total = Number(res.headers['content-length'] || 0)
        let transferred = 0
        let lastTick = Date.now()
        let lastTransferred = 0
        res.on('data', (chunk: Buffer) => {
          transferred += chunk.length
          const now = Date.now()
          if (now - lastTick > 500) {
            const deltaBytes = transferred - lastTransferred
            const deltaMs = now - lastTick
            const bps = deltaMs > 0 ? (deltaBytes / (deltaMs / 1000)) : 0
            onProgress({
              type: 'progress',
              percent: total > 0 ? (transferred / total) * 100 : 0,
              bytesPerSecond: bps,
              transferred,
              total,
            })
            lastTick = now
            lastTransferred = transferred
          }
        })
        res.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve(targetPath)
        })
      })
      req.on('error', (err: any) => {
        try {
          file.close()
        } catch {}
        fs.rmSync(targetPath, { force: true })
        reject(err)
      })
    }
    makeReq(urlStr, maxRedirects)
  })
}

async function manualDownloadLatest(win: BrowserWindow | null) {
  state.status = 'checking'
  send(win, { type: 'checking' })
  const rel = await fetchLatestRelease()
  const tag: string = rel.tag_name // e.g., v3.0.28
  const version = tag?.startsWith('v') ? tag.slice(1) : tag
  const assets: Array<{ name: string; browser_download_url: string }> = rel.assets || []

  const candidates =
    process.platform === 'darwin' ? chooseMacAssetName(version) : chooseWinAssetName(version)

  const found = assets.find((a) => candidates.includes(a.name))
  if (!found) {
    throw new Error('No suitable installer found in Release assets')
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccman-update-'))
  const target = path.join(dir, found.name)

  const filePath = await downloadWithProgress(found.browser_download_url, target, (p) => {
    send(win, p)
  })

  send(win, { type: 'manual-downloaded', filePath })
  state.status = 'ready'
  state.version = version
  state.manualPath = filePath
  return { version, filePath }
}

export function registerUpdaterHandlers(winProvider: () => BrowserWindow | null) {
  const win = () => winProvider()
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => send(win(), { type: 'checking' }))
  autoUpdater.on('update-available', (info) =>
    {
      state.status = 'available'
      state.version = info?.version ?? ''
      send(win(), { type: 'available', version: state.version, notes: (info as any)?.releaseNotes })
    }
  )
  autoUpdater.on('update-not-available', (info) =>
    {
      state.status = 'not-available'
      state.version = info?.version ?? app.getVersion()
      send(win(), { type: 'not-available', version: state.version })
    }
  )
  autoUpdater.on('error', (err) => {
    state.status = 'error'
    state.lastError = err?.message || String(err)
    send(win(), { type: 'error', message: state.lastError })
  })
  autoUpdater.on('download-progress', (p) =>
    send(win(), {
      type: 'progress',
      percent: p.percent,
      bytesPerSecond: p.bytesPerSecond,
      transferred: p.transferred,
      total: p.total,
    })
  )
  autoUpdater.on('update-downloaded', (info) =>
    {
      state.status = 'ready'
      state.version = info?.version ?? state.version
      send(win(), { type: 'downloaded', version: state.version || '' })
    }
  )

  // IPC: interactive check (no autoDownload)
  ipcMain.handle('update:check', async () => {
    // Concurrency guard
    if (state.status === 'checking' && state.checkingPromise) {
      return { started: true }
    }
    if (state.status === 'downloading' || state.status === 'ready') {
      // 无需重复检查
      return { started: true }
    }
    try {
      autoUpdater.autoDownload = false
      state.status = 'checking'
      const p = autoUpdater.checkForUpdates()
      state.checkingPromise = p
      await p
      state.checkingPromise = null
      return { started: true }
    } catch (e: any) {
      state.checkingPromise = null
      // Fallback to manual flow will发生在 download 阶段，由 UI 决定是否下载
      return { started: false, error: e?.message || String(e) }
    }
  })

  // IPC: download update using electron-updater, fallback to manual if needed
  ipcMain.handle('update:download', async () => {
    if (state.status === 'downloading' && state.downloadPromise) {
      return { ok: true }
    }
    if (state.status === 'ready') {
      return { ok: true }
    }
    try {
      autoUpdater.autoDownload = true
      state.status = 'downloading'
      const p = autoUpdater.downloadUpdate()
      state.downloadPromise = p
      const result = await p
      state.downloadPromise = null
      return { ok: true, path: result }
    } catch (e: any) {
      // Fallback manual
      try {
        state.downloadPromise = manualDownloadLatest(win())
        const { filePath } = await state.downloadPromise
        state.downloadPromise = null
        return { ok: true, path: filePath, manual: true }
      } catch (err: any) {
        state.status = 'error'
        state.lastError = err?.message || String(err)
        state.downloadPromise = null
        return { ok: false, error: state.lastError }
      }
    }
  })

  // IPC: install (quit and install)
  ipcMain.handle('update:install', async (_e, options?: { manualPath?: string }) => {
    // Manual installer path provided (fallback path)
    if (state.manualPath || options?.manualPath) {
      // 仅允许使用主进程记录的下载路径，避免任意路径执行
      const filePath = state.manualPath || options?.manualPath
      if (process.platform === 'win32') {
        try {
          spawn(filePath, [], { detached: true, stdio: 'ignore' }).unref()
        } catch (e) {
          throw new Error(`启动安装程序失败：${(e as Error).message}`)
        }
        app.quit()
        return { ok: true }
      } else if (process.platform === 'darwin') {
        try {
          await shell.openPath(filePath)
        } catch (e) {
          throw new Error(`打开 DMG 失败：${(e as Error).message}`)
        }
        const r = await dialog.showMessageBox({
          type: 'info',
          buttons: ['立即退出', '稍后'],
          defaultId: 0,
          cancelId: 1,
          message: '安装器已打开，请按提示将应用拖入“应用程序”文件夹。',
          detail: '点击“立即退出”后，可在安装完成后重新启动 ccman。',
        })
        if (r.response === 0) app.quit()
        return { ok: true }
      }
      return { ok: false, error: 'Unsupported platform' }
    }

    // Built-in autoUpdater path
    try {
      setImmediate(() => autoUpdater.quitAndInstall(false, true))
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) }
    }
  })

  // IPC: background silent check (auto download)
  ipcMain.handle('update:background-check', async () => {
    try {
      autoUpdater.autoDownload = true
      if (state.status === 'checking' || state.status === 'downloading') {
        return { started: true }
      }
      state.status = 'checking'
      await autoUpdater.checkForUpdates()
      return { started: true }
    } catch (e: any) {
      // no fallback in silent mode
      state.status = 'error'
      state.lastError = e?.message || String(e)
      return { started: false, error: e?.message || String(e) }
    }
  })
}

export async function backgroundCheckOnce() {
  try {
    if (state.status === 'checking' || state.status === 'downloading') {
      return
    }
    autoUpdater.autoDownload = true
    state.status = 'checking'
    await autoUpdater.checkForUpdates()
  } catch (e) {
    state.status = 'error'
    state.lastError = (e as Error)?.message || String(e)
  }
}

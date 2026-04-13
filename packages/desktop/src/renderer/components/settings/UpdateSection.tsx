/**
 * 应用更新区块
 * 结构与 WebDAVSync/Backup 一致：标题在外，内容在卡片内
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { DownloadCloud } from 'lucide-react'

type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string; notes?: string | null }
  | { type: 'not-available'; version: string }
  | { type: 'error'; message: string }
  | {
      type: 'progress'
      percent: number
      bytesPerSecond: number
      transferred: number
      total: number
    }
  | { type: 'downloaded'; version: string }
  | { type: 'manual-downloaded'; filePath: string }

export default function UpdateSection() {
  const [currentVersion, setCurrentVersion] = useState<string>('-')
  const [status, setStatus] = useState<string>('未检查')
  const [latest, setLatest] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [downloading, setDownloading] = useState(false)
  const [ready, setReady] = useState(false)
  const manualPathRef = useRef<string | null>(null)

  useEffect(() => {
    window.electronAPI.system.getAppVersion().then(setCurrentVersion)
    const off = window.electronAPI.update.onEvent((e: UpdateEvent) => {
      switch (e.type) {
        case 'checking':
          setStatus('正在检查...')
          setErr(null)
          break
        case 'available':
          setLatest(e.version)
          setStatus(`发现新版本 v${e.version}`)
          setErr(null)
          break
        case 'not-available':
          setLatest(null)
          setStatus('已是最新版本')
          setErr(null)
          break
        case 'error':
          setStatus('检查失败')
          setErr(e.message)
          setDownloading(false)
          break
        case 'progress':
          setDownloading(true)
          setProgress(e.percent)
          break
        case 'downloaded':
          setDownloading(false)
          setReady(true)
          setStatus('更新包已就绪')
          break
        case 'manual-downloaded':
          manualPathRef.current = e.filePath
          setDownloading(false)
          setReady(true)
          setStatus('安装包已下载')
          break
      }
    })
    return off
  }, [])

  const canDownload = useMemo(() => latest && !downloading && !ready, [latest, downloading, ready])

  const onCheck = async () => {
    setErr(null)
    setStatus('正在检查...')
    const res = await window.electronAPI.update.check()
    if (!res.started && res.error) {
      setErr(res.error)
      setStatus('检查失败')
    }
  }

  const onDownload = async () => {
    setErr(null)
    setDownloading(true)
    const res = await window.electronAPI.update.download()
    if (!res.ok && res.error) {
      setErr(res.error)
      setDownloading(false)
    }
    if (res.manual && res.path) manualPathRef.current = res.path
  }

  const onInstall = async () => {
    const res = await window.electronAPI.update.install(manualPathRef.current || undefined)
    if (!res.ok && res.error) setErr(res.error)
  }

  const btnClass =
    'px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="w-full space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-2">
        <DownloadCloud className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">应用更新</h2>
      </div>

      {/* 更新卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm text-gray-600 mb-5">
          当前版本{' '}
          <span className="font-mono text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">
            {currentVersion}
          </span>
        </p>

        <div className="flex items-center gap-2 mb-5">
          <button onClick={onCheck} className={btnClass}>
            检查更新
          </button>
          {canDownload && (
            <button onClick={onDownload} className={btnClass}>
              下载更新
            </button>
          )}
          {ready && (
            <button onClick={onInstall} className={btnClass}>
              立即安装并重启
            </button>
          )}
        </div>

        <div className="text-sm text-gray-700 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                err ? 'bg-red-400' : latest ? 'bg-green-400' : 'bg-gray-300'
              }`}
            />
            <span>{status}</span>
            {latest && <span className="text-gray-400 text-xs">v{latest}</span>}
          </div>

          {downloading && (
            <div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.max(1, Math.min(progress, 100))}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{progress.toFixed(0)}%</p>
            </div>
          )}

          {err && <p className="text-xs text-red-500">错误：{err}</p>}
        </div>
      </div>

      {/* 提示 */}
      <div className="bg-gray-50 rounded-lg px-3 py-2">
        <p className="text-xs text-gray-400">
          Windows 将自动退出并运行安装程序；macOS 将打开 DMG 安装器
        </p>
      </div>
    </div>
  )
}

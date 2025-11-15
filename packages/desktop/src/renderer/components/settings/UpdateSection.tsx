import { useEffect, useMemo, useRef, useState } from 'react'

type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string; notes?: string | null }
  | { type: 'not-available'; version: string }
  | { type: 'error'; message: string }
  | { type: 'progress'; percent: number; bytesPerSecond: number; transferred: number; total: number }
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
    if (res.manual && res.path) {
      manualPathRef.current = res.path
    }
  }

  const onInstall = async () => {
    const manualPath = manualPathRef.current || undefined
    const res = await window.electronAPI.update.install(manualPath)
    if (!res.ok && res.error) {
      setErr(res.error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">应用更新</h2>
      <p className="text-sm text-gray-600 mb-6">
        当前版本 <span className="font-mono text-gray-900">{currentVersion}</span>
      </p>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onCheck}
          className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          检查更新
        </button>
        {canDownload ? (
          <button
            onClick={onDownload}
            className="px-3 py-1.5 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
          >
            下载更新
          </button>
        ) : null}
        {ready ? (
          <button
            onClick={onInstall}
            className="px-3 py-1.5 text-sm rounded-md bg-orange-600 text-white hover:bg-orange-700"
          >
            立即安装并重启
          </button>
        ) : null}
      </div>

      <div className="text-sm text-gray-700">
        <div className="mb-2">
          状态：<span className="font-medium">{status}</span>
          {latest ? <span className="ml-2 text-gray-500">最新 v{latest}</span> : null}
        </div>
        {downloading ? (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.max(1, Math.min(progress, 100))}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">正在下载... {progress.toFixed(0)}%</div>
          </div>
        ) : null}
        {err ? <div className="text-xs text-red-600 mt-2">错误：{err}</div> : null}
        <div className="text-xs text-gray-500 mt-4">
          小贴士：Windows 将自动退出并运行安装程序；macOS 将打开 DMG 安装器并提示退出应用。
        </div>
      </div>
    </div>
  )
}


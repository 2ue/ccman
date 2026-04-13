/**
 * WebDAV 智能同步配置区块
 * 单卡片，内部分段：连接配置 → 同步密码 → 同步操作
 */

import { useState, useEffect } from 'react'
import {
  Save,
  Network,
  Upload,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Cloud,
  AlertTriangle,
} from 'lucide-react'
import type { SyncConfig, WebDAVAuthType } from '@ccman/types'
import { BUTTON_WITH_ICON } from '../../styles/button'

interface WebDAVSyncSectionProps {
  onSuccess: (message: string) => void
  onError: (title: string, message: string) => void
  onDataChanged?: () => void
}

export default function WebDAVSyncSection({
  onSuccess,
  onError,
  onDataChanged,
}: WebDAVSyncSectionProps) {
  const [webdavUrl, setWebdavUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authType, setAuthType] = useState<WebDAVAuthType>('password')
  const [remoteDir, setRemoteDir] = useState('/')
  const [syncPassword, setSyncPassword] = useState('')
  const [rememberPassword, setRememberPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showSyncPassword, setShowSyncPassword] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isMerging, setIsMerging] = useState(false)

  useEffect(() => {
    loadSyncConfig()
  }, [])

  const loadSyncConfig = async () => {
    try {
      const config = await window.electronAPI.sync.getSyncConfig()
      if (config) {
        setWebdavUrl(config.webdavUrl || '')
        setUsername(config.username || '')
        setPassword(config.password || '')
        setAuthType(config.authType || 'password')
        setRemoteDir(config.remoteDir || '/')
        if (config.syncPassword) {
          setSyncPassword(config.syncPassword)
          setRememberPassword(true)
        }
      }
    } catch (error) {
      console.error('加载配置失败：', error)
    }
  }

  const buildConfig = (): SyncConfig | null => {
    const trimmed = {
      webdavUrl: webdavUrl.trim(),
      username: username.trim(),
      password: password.trim(),
      remoteDir: remoteDir.trim(),
    }
    if (!trimmed.webdavUrl || !trimmed.username || !trimmed.password) {
      onError('参数错误', '请填写完整的 WebDAV 配置信息')
      return null
    }
    return { ...trimmed, authType }
  }

  const handleTestConnection = async () => {
    const config = buildConfig()
    if (!config) return
    setIsTesting(true)
    try {
      const success = await window.electronAPI.sync.testConnection(config)
      if (success) onSuccess('WebDAV 连接测试成功')
      else onError('连接失败', 'WebDAV 连接测试失败，请检查配置')
    } catch (error) {
      onError('连接失败', (error as Error).message)
    } finally {
      setIsTesting(false)
    }
  }

  const handleSaveConfig = async () => {
    const config = buildConfig()
    if (!config) return
    try {
      await window.electronAPI.sync.saveSyncConfig({
        ...config,
        syncPassword: rememberPassword ? syncPassword.trim() || undefined : undefined,
      })
      onSuccess('配置保存成功')
    } catch (error) {
      onError('保存失败', (error as Error).message)
    }
  }

  const requireSyncPassword = (): boolean => {
    if (!syncPassword.trim()) {
      onError('参数错误', '请输入同步密码')
      return false
    }
    return true
  }

  const handleUploadToCloud = async () => {
    const config = buildConfig()
    if (!config || !requireSyncPassword()) return
    setIsUploading(true)
    try {
      await window.electronAPI.sync.uploadToCloud(config, syncPassword.trim())
      onSuccess('配置已上传到云端')
    } catch (error) {
      onError('上传失败', (error as Error).message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadFromCloud = async () => {
    const config = buildConfig()
    if (!config || !requireSyncPassword()) return
    setIsDownloading(true)
    try {
      const backupPaths = await window.electronAPI.sync.downloadFromCloud(
        config,
        syncPassword.trim()
      )
      onSuccess(`配置已从云端下载并应用\n备份: ${backupPaths.join(', ')}`)
      onDataChanged?.()
    } catch (error) {
      onError('下载失败', (error as Error).message)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleMergeSync = async () => {
    const config = buildConfig()
    if (!config || !requireSyncPassword()) return
    setIsMerging(true)
    try {
      const result = await window.electronAPI.sync.mergeSync(config, syncPassword.trim())
      if (!result.hasChanges) {
        onSuccess('配置已同步，无需操作')
      } else {
        onSuccess(`配置已智能合并并同步\n备份: ${result.backupPaths.join(', ')}`)
        onDataChanged?.()
      }
    } catch (error) {
      onError('合并失败', (error as Error).message)
    } finally {
      setIsMerging(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors'

  return (
    <div className="w-full space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-2">
        <Cloud className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">云同步</h2>
      </div>

      {/* 单卡片，内部分段 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {/* ── 段落 1: 连接配置 ── */}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
          连接配置
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">服务器地址</label>
            <input
              type="url"
              value={webdavUrl}
              onChange={(e) => setWebdavUrl(e.target.value)}
              placeholder="https://dav.example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">密码</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="WebDAV 密码"
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">认证类型</label>
            <select
              value={authType}
              onChange={(e) => setAuthType(e.target.value as WebDAVAuthType)}
              className={inputClass}
            >
              <option value="password">Basic Auth</option>
              <option value="digest">Digest Auth</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">远程目录</label>
            <input
              type="text"
              value={remoteDir}
              onChange={(e) => setRemoteDir(e.target.value)}
              placeholder="/"
              className={inputClass}
            />
          </div>
        </div>

        {/* ── 段落 2: 同步密码 ── */}
        <div className="border-t border-gray-100 mt-6 pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            同步密码
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                加密密码（用于加密 API Key）
              </label>
              <div className="relative">
                <input
                  type={showSyncPassword ? 'text' : 'password'}
                  value={syncPassword}
                  onChange={(e) => setSyncPassword(e.target.value)}
                  placeholder="请输入同步密码"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowSyncPassword(!showSyncPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  {showSyncPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center h-[38px]">
              <input
                type="checkbox"
                id="rememberPassword"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="rememberPassword" className="ml-2 text-sm text-gray-600">
                记住密码
              </label>
            </div>
          </div>

          <p className="mt-2 text-xs text-yellow-600 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            忘记密码将无法解密云端配置，请妥善保管
          </p>
        </div>

        {/* ── 测试与保存 ── */}
        <div className="flex gap-2 mt-6 pt-6 border-t border-gray-100">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className={`${BUTTON_WITH_ICON.secondary} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Network className="w-4 h-4" />
            {isTesting ? '测试中...' : '测试连接'}
          </button>
          <button onClick={handleSaveConfig} className={BUTTON_WITH_ICON.primary}>
            <Save className="w-4 h-4" />
            保存配置
          </button>
        </div>

        {/* ── 段落 3: 同步操作 ── */}
        <div className="border-t border-gray-100 mt-6 pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            同步操作
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleUploadToCloud}
              disabled={isUploading}
              className="flex flex-col items-center gap-1.5 px-4 py-3.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              <span className="text-sm font-medium">
                {isUploading ? '上传中...' : '上传到云端'}
              </span>
              <span className="text-[11px] text-gray-400">本地 → 云端</span>
            </button>

            <button
              onClick={handleDownloadFromCloud}
              disabled={isDownloading}
              className="flex flex-col items-center gap-1.5 px-4 py-3.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              <span className="text-sm font-medium">
                {isDownloading ? '下载中...' : '从云端下载'}
              </span>
              <span className="text-[11px] text-gray-400">云端 → 本地</span>
            </button>

            <button
              onClick={handleMergeSync}
              disabled={isMerging}
              className="flex flex-col items-center gap-1.5 px-4 py-3.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="text-sm font-medium">{isMerging ? '合并中...' : '智能合并'}</span>
              <span className="text-[11px] text-gray-400">自动合并双方</span>
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            所有操作会加密 API Key，下载和合并会自动备份本地配置
          </p>
        </div>
      </div>
    </div>
  )
}

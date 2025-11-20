/**
 * WebDAV 智能同步配置区块
 */

import { useState, useEffect } from 'react'
import { Save, Network, Upload, Download, RefreshCw, Eye, EyeOff, Cloud, BookOpen, AlertTriangle } from 'lucide-react'
import type { SyncConfig, WebDAVAuthType } from '@ccman/core'
import { BUTTON_WITH_ICON } from '../../styles/button'

interface WebDAVSyncSectionProps {
  onSuccess: (message: string) => void
  onError: (title: string, message: string) => void
  onDataChanged?: () => void
}

export default function WebDAVSyncSection({ onSuccess, onError, onDataChanged }: WebDAVSyncSectionProps) {
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

  // 加载已保存的配置
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

        // 加载同步密码（如果已保存）
        if (config.syncPassword) {
          setSyncPassword(config.syncPassword)
          setRememberPassword(true)
        }
      }
    } catch (error) {
      console.error('加载配置失败：', error)
    }
  }

  const handleTestConnection = async () => {
    if (!webdavUrl || !username || !password) {
      onError('参数错误', '请填写完整的 WebDAV 配置信息')
      return
    }

    const config: SyncConfig = { webdavUrl, username, password, authType, remoteDir }

    setIsTesting(true)
    try {
      const success = await window.electronAPI.sync.testConnection(config)
      if (success) {
        onSuccess('WebDAV 连接测试成功')
      } else {
        onError('连接失败', 'WebDAV 连接测试失败，请检查配置')
      }
    } catch (error) {
      onError('连接失败', (error as Error).message)
    } finally {
      setIsTesting(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!webdavUrl || !username || !password) {
      onError('参数错误', '请填写完整的 WebDAV 配置信息')
      return
    }

    const config: SyncConfig = {
      webdavUrl,
      username,
      password,
      authType,
      remoteDir,
      syncPassword: rememberPassword ? syncPassword : undefined,
    }

    try {
      await window.electronAPI.sync.saveSyncConfig(config)
      onSuccess('配置保存成功')
    } catch (error) {
      onError('保存失败', (error as Error).message)
    }
  }

  const handleUploadToCloud = async () => {
    if (!webdavUrl || !username || !password) {
      onError('参数错误', '请先保存 WebDAV 配置')
      return
    }

    if (!syncPassword) {
      onError('参数错误', '请输入同步密码')
      return
    }

    const config: SyncConfig = { webdavUrl, username, password, authType, remoteDir }

    setIsUploading(true)
    try {
      await window.electronAPI.sync.uploadToCloud(config, syncPassword)
      onSuccess('配置已上传到云端')
    } catch (error) {
      onError('上传失败', (error as Error).message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadFromCloud = async () => {
    if (!webdavUrl || !username || !password) {
      onError('参数错误', '请先保存 WebDAV 配置')
      return
    }

    if (!syncPassword) {
      onError('参数错误', '请输入同步密码')
      return
    }

    const config: SyncConfig = { webdavUrl, username, password, authType, remoteDir }

    setIsDownloading(true)
    try {
      const backupPaths = await window.electronAPI.sync.downloadFromCloud(config, syncPassword)
      onSuccess(`配置已从云端下载并应用\n备份: ${backupPaths.join(', ')}`)
      onDataChanged?.()
    } catch (error) {
      onError('下载失败', (error as Error).message)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleMergeSync = async () => {
    if (!webdavUrl || !username || !password) {
      onError('参数错误', '请先保存 WebDAV 配置')
      return
    }

    if (!syncPassword) {
      onError('参数错误', '请输入同步密码')
      return
    }

    const config: SyncConfig = { webdavUrl, username, password, authType, remoteDir }

    setIsMerging(true)
    try {
      const result = await window.electronAPI.sync.mergeSync(config, syncPassword)

      if (!result.hasChanges) {
        onSuccess('ℹ️ 配置已同步，无需操作')
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

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Cloud className="w-6 h-6" />
        云同步
      </h2>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* 说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            同步模式说明
          </h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>
              <strong>上传到云端</strong>：本地配置覆盖云端（包含加密的 API Key）
            </li>
            <li>
              <strong>从云端下载</strong>：云端配置覆盖本地（自动备份本地配置）
            </li>
            <li>
              <strong>智能合并</strong>：自动合并本地和云端配置
              <ul className="ml-6 mt-1 space-y-0.5">
                <li>• 相同 ID：保留最新修改</li>
                <li>• 相同配置（URL+Key）：保留最新修改</li>
                <li>• 不同配置：全部保留，自动处理 name 冲突</li>
              </ul>
            </li>
          </ul>
        </div>

        {/* WebDAV 基本配置 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">WebDAV 配置</h3>

          {/* WebDAV URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">服务器地址</label>
            <input
              type="url"
              value={webdavUrl}
              onChange={(e) => setWebdavUrl(e.target.value)}
              placeholder="https://dav.example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码（WebDAV 认证）
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="WebDAV 密码"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                title={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Auth Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">认证类型</label>
            <select
              value={authType}
              onChange={(e) => setAuthType(e.target.value as WebDAVAuthType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="password">Basic Auth（基础认证）</option>
              <option value="digest">Digest Auth（摘要认证）</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">大多数 WebDAV 服务使用 Basic Auth</p>
          </div>

          {/* Remote Directory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">远程同步目录</label>
            <input
              type="text"
              value={remoteDir}
              onChange={(e) => setRemoteDir(e.target.value)}
              placeholder="/"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              指定 WebDAV 服务器上的同步目录，默认为根目录 /
            </p>
          </div>
        </div>

        {/* 同步密码配置 */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium text-gray-900">同步密码</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              同步密码（用于加密 API Key）
            </label>
            <div className="relative">
              <input
                type={showSyncPassword ? 'text' : 'password'}
                value={syncPassword}
                onChange={(e) => setSyncPassword(e.target.value)}
                placeholder="请输入同步密码"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowSyncPassword(!showSyncPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                title={showSyncPassword ? '隐藏密码' : '显示密码'}
              >
                {showSyncPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-sm text-red-600 font-medium">
              警告：用于加密 API Key，请妥善保管。忘记密码将无法解密云端配置
            </p>
          </div>

          {/* 记住密码 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberPassword"
              checked={rememberPassword}
              onChange={(e) => setRememberPassword(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="rememberPassword" className="ml-2 text-sm text-gray-700">
              记住密码（本地加密存储）
            </label>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex flex-wrap gap-3">
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

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleUploadToCloud}
              disabled={isUploading}
              className={`${BUTTON_WITH_ICON.primary} bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Upload className="w-4 h-4" />
              {isUploading ? '上传中...' : '上传到云端'}
            </button>

            <button
              onClick={handleDownloadFromCloud}
              disabled={isDownloading}
              className={`${BUTTON_WITH_ICON.primary} bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Download className="w-4 h-4" />
              {isDownloading ? '下载中...' : '从云端下载'}
            </button>

            <button
              onClick={handleMergeSync}
              disabled={isMerging}
              className={`${BUTTON_WITH_ICON.primary} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <RefreshCw className="w-4 h-4" />
              {isMerging ? '合并中...' : '智能合并'}
            </button>
          </div>
        </div>

        {/* 警告信息 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-yellow-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            注意事项
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
            <li>所有同步操作都会加密 API Key（使用同步密码）</li>
            <li>下载和合并操作会自动备份本地配置</li>
            <li>如果同步密码错误，无法解密云端配置</li>
            <li>建议使用"智能合并"模式，避免配置丢失</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

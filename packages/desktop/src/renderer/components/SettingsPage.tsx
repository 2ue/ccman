/**
 * 设置页面 - WebDAV 同步配置
 */

import { useState, useEffect } from 'react'
import type { SyncConfig, WebDAVAuthType } from '@ccman/core'

interface SettingsPageProps {
  onSuccess: (message: string) => void
  onError: (title: string, message: string) => void
}

export default function SettingsPage({ onSuccess, onError }: SettingsPageProps) {
  const [webdavUrl, setWebdavUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authType, setAuthType] = useState<WebDAVAuthType>('password')
  const [remoteDir, setRemoteDir] = useState('/')
  const [showPassword, setShowPassword] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

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

    const config: SyncConfig = { webdavUrl, username, password, authType, remoteDir }

    try {
      await window.electronAPI.sync.saveSyncConfig(config)
      onSuccess('配置保存成功')
    } catch (error) {
      onError('保存失败', (error as Error).message)
    }
  }

  const handleUpload = async () => {
    if (!webdavUrl || !username || !password) {
      onError('参数错误', '请先保存 WebDAV 配置')
      return
    }

    const config: SyncConfig = { webdavUrl, username, password, authType, remoteDir }

    setIsUploading(true)
    try {
      await window.electronAPI.sync.uploadConfig(config)
      onSuccess('配置上传成功')
    } catch (error) {
      onError('上传失败', (error as Error).message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async () => {
    if (!webdavUrl || !username || !password) {
      onError('参数错误', '请先保存 WebDAV 配置')
      return
    }

    const config: SyncConfig = { webdavUrl, username, password, authType, remoteDir }

    setIsDownloading(true)
    try {
      const backupPaths = await window.electronAPI.sync.downloadConfig(config)
      onSuccess(`配置下载成功，已备份到：${backupPaths.join(', ')}`)
    } catch (error) {
      onError('下载失败', (error as Error).message)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">WebDAV 同步设置</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* 说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">关于 WebDAV 同步</h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>通过 WebDAV 同步配置，可在多台设备间共享服务商配置</li>
              <li>上传：将本地配置（不含 API Key）上传到 WebDAV</li>
              <li>下载：从 WebDAV 下载配置并覆盖本地（会自动备份）</li>
              <li>下载后，相同 ID 的服务商会保留本地 API Key</li>
            </ul>
          </div>

          {/* WebDAV URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">WebDAV 服务器地址</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? '隐藏' : '显示'}
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
            <p className="mt-1 text-sm text-gray-500">
              大多数 WebDAV 服务使用 Basic Auth。如果连接失败，可尝试 Digest Auth
            </p>
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
              指定 WebDAV 服务器上的同步目录，默认为根目录 /。如果目录不存在会自动创建
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? '测试中...' : '测试连接'}
            </button>

            <button
              onClick={handleSaveConfig}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              保存配置
            </button>

            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? '上传中...' : '上传配置'}
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed transition-colors"
            >
              {isDownloading ? '下载中...' : '下载配置'}
            </button>
          </div>

          {/* 警告信息 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-yellow-900 mb-2">⚠️ 注意事项</h3>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>下载配置会覆盖本地所有服务商配置（保留 API Key）</li>
              <li>下载前会自动备份本地配置</li>
              <li>上传的配置不含 API Key，保护隐私安全</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

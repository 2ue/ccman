import { Provider } from '@ccman/core'
import { Target, CheckCircle2, AlertCircle, Zap, Plus, FolderCog, BarChart3, FolderOpen } from 'lucide-react'
import { BUTTON_STYLES } from '../styles/button'

interface HomePageProps {
  claudeProvider?: Provider
  codexProvider?: Provider
  claudeCount: number
  codexCount: number
  serviceProviderCount: number
  onNavigate: (tab: 'claude' | 'codex' | 'service-providers') => void
  onAddClaude: () => void
  onAddCodex: () => void
}

export default function HomePage({
  claudeProvider,
  codexProvider,
  claudeCount,
  codexCount,
  serviceProviderCount,
  onNavigate,
  onAddClaude,
  onAddCodex,
}: HomePageProps) {
  const handleOpenFolder = async () => {
    try {
      await window.electronAPI.system.openFolder()
    } catch (error) {
      console.error('打开文件夹失败：', error)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Hero Section */}
        <div className="text-center mb-12 relative">
          <button
            onClick={handleOpenFolder}
            className="absolute top-0 right-0 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="打开配置文件夹"
          >
            <FolderOpen className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center gap-3 mb-4">
            <Target className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">ccman</h1>
          </div>
          <p className="text-xl text-gray-600">
            AI 服务商配置管理工具
          </p>
          <p className="text-sm text-gray-500 mt-2">
            统一管理 Claude Code 和 Codex 的 API 配置，快速切换服务商
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Claude Code Status */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Claude Code</h2>
              {claudeProvider ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  已激活
                </span>
              ) : (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  未配置
                </span>
              )}
            </div>

            <div className="flex-1 mb-4">
              {claudeProvider ? (
                <div>
                  <p className="text-sm text-gray-500">当前服务商</p>
                  <p className="text-lg font-medium text-gray-900">{claudeProvider.name}</p>
                  <p className="text-xs text-gray-400 truncate">{claudeProvider.baseUrl}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">还没有激活的服务商</p>
              )}
            </div>

            <div className="flex gap-2 mt-auto">
              <button onClick={() => onNavigate('claude')} className={`flex-1 ${BUTTON_STYLES.primary}`}>
                管理 →
              </button>
            </div>
          </div>

          {/* Codex Status */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Codex</h2>
              {codexProvider ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  已激活
                </span>
              ) : (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  未配置
                </span>
              )}
            </div>

            <div className="flex-1 mb-4">
              {codexProvider ? (
                <div>
                  <p className="text-sm text-gray-500">当前服务商</p>
                  <p className="text-lg font-medium text-gray-900">{codexProvider.name}</p>
                  <p className="text-xs text-gray-400 truncate">{codexProvider.baseUrl}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">还没有激活的服务商</p>
              )}
            </div>

            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => onNavigate('codex')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                管理 →
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">快速操作</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={onAddClaude}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div className="text-center">
                <Plus className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <div className="text-sm font-medium text-gray-700">添加 Claude 服务商</div>
              </div>
            </button>

            <button
              onClick={onAddCodex}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div className="text-center">
                <Plus className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <div className="text-sm font-medium text-gray-700">添加 Codex 服务商</div>
              </div>
            </button>

            <button
              onClick={() => onNavigate('service-providers')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div className="text-center">
                <FolderCog className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <div className="text-sm font-medium text-gray-700">预置服务商</div>
              </div>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">统计信息</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{claudeCount}</div>
              <div className="text-sm text-gray-600 mt-1">Claude 服务商</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{codexCount}</div>
              <div className="text-sm text-gray-600 mt-1">Codex 服务商</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{serviceProviderCount}</div>
              <div className="text-sm text-gray-600 mt-1">预置服务商</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

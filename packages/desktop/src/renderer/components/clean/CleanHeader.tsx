/**
 * Clean Header Component
 * 显示文件大小和预设清理按钮
 */

import { RefreshCw, Trash2 } from 'lucide-react'

interface CleanHeaderProps {
  fileSize: string
  onPresetClean: (preset: 'conservative' | 'moderate' | 'aggressive') => void
  onRefresh: () => void
  loading: boolean
}

export default function CleanHeader({ fileSize, onPresetClean, onRefresh, loading }: CleanHeaderProps) {
  const presets = [
    {
      key: 'conservative' as const,
      label: '保守清理',
      description: '保留最近10条记录',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      key: 'moderate' as const,
      label: '中等清理',
      description: '保留最近5条记录',
      color: 'bg-yellow-500 hover:bg-yellow-600',
    },
    {
      key: 'aggressive' as const,
      label: '激进清理',
      description: '清空所有历史记录',
      color: 'bg-red-500 hover:bg-red-600',
    },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      {/* 文件信息 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Claude Code 清理工具</h2>
          <p className="text-sm text-gray-600">
            配置文件大小: <span className="font-medium text-gray-900">{fileSize}</span>
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="刷新数据"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 预设清理按钮 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 mb-3">快速清理</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => onPresetClean(preset.key)}
              disabled={loading}
              className={`
                ${preset.color} text-white
                px-4 py-3 rounded-lg shadow-sm
                transition-all transform hover:scale-105
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                flex items-center justify-center gap-2
              `}
            >
              <Trash2 className="w-4 h-4" />
              <div className="text-left">
                <div className="font-medium">{preset.label}</div>
                <div className="text-xs opacity-90">{preset.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 提示信息 */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          提示：<span className="font-semibold">安全说明</span>：此工具仅清理 Claude Code 配置文件中的对话历史和缓存数据，
          <span className="font-semibold text-blue-900">不会影响您磁盘上的任何项目代码</span>。
        </p>
      </div>
    </div>
  )
}

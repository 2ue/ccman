import { Play, Edit2, Trash2, Copy, Check, Globe } from 'lucide-react'
import type { Provider } from '@ccman/types'

interface Props {
  providers: Provider[]
  currentProviderId: string | undefined
  tool: 'codex' | 'claude' | 'gemini' | 'opencode' | 'openclaw'
  onSwitch: (id: string) => void
  onEdit: (provider: Provider) => void
  onDelete: (id: string, name: string) => void
  onClone: (provider: Provider) => void
}

export default function ProviderGrid({
  providers,
  currentProviderId,
  onSwitch,
  onEdit,
  onDelete,
  onClone,
}: Props) {
  if (providers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
          <Globe className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-gray-500 font-medium">暂无服务商</p>
        <p className="text-sm text-gray-400 mt-1">点击"添加"按钮创建配置</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {providers.map((provider) => {
        const isActive = provider.id === currentProviderId

        return (
          <div
            key={provider.id}
            className={`group rounded-xl p-4 transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-br from-blue-50 to-white border border-blue-200 shadow-sm'
                : 'bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            {/* Name + Status */}
            <div className="flex items-center gap-2 mb-2">
              {isActive && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
              <h3 className="text-sm font-semibold text-gray-900 truncate">{provider.name}</h3>
              {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />}
            </div>

            {/* URL */}
            <p className="text-xs text-gray-500 font-mono mb-1 truncate" title={provider.baseUrl}>
              {provider.baseUrl}
            </p>

            {/* Description */}
            {provider.desc && (
              <p className="text-xs text-gray-400 mb-1 truncate" title={provider.desc}>
                {provider.desc}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-1.5 pt-3 mt-2 border-t border-gray-100/80">
              {!isActive && (
                <button
                  onClick={() => onSwitch(provider.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors text-blue-700 bg-blue-50 hover:bg-blue-100"
                  title="切换到此服务商"
                >
                  <Play className="w-3 h-3" />
                  切换
                </button>
              )}
              {isActive && (
                <span className="flex-1 flex items-center justify-center px-3 py-1.5 text-xs font-medium text-blue-600">
                  当前使用中
                </span>
              )}
              <button
                onClick={() => onClone(provider)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="克隆"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onEdit(provider)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="编辑"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(provider.id, provider.name)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

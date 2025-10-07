import { Play, Edit2, Trash2, Copy, Check } from 'lucide-react'
import type { Provider } from '@ccman/core'

interface Props {
  providers: Provider[]
  currentProviderId: string | undefined
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
  // 显示所有 providers，激活的用绿色边框高亮
  if (providers.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <p className="text-gray-500">暂无服务商</p>
        <p className="text-sm text-gray-400 mt-2">
          点击"添加服务商"创建配置
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {providers.map((provider) => {
          const isActive = provider.id === currentProviderId

          return (
            <div
              key={provider.id}
              className={`bg-white rounded-lg p-3 hover:shadow-md transition-all ${
                isActive
                  ? 'border-2 border-green-500 shadow-sm'
                  : 'border border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-medium text-gray-900 truncate">
                      {provider.name}
                    </h3>
                    {isActive && (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  {isActive && (
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        激活中
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-600 font-mono mb-3 truncate" title={provider.baseUrl}>
                {provider.baseUrl}
              </p>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {!isActive && (
                  <button
                    onClick={() => onSwitch(provider.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                    title="切换到此服务商"
                  >
                    <Play className="w-3.5 h-3.5" />
                    切换
                  </button>
                )}
                <button
                  onClick={() => onClone(provider)}
                  className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                  title="克隆服务商"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEdit(provider)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="编辑服务商"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(provider.id, provider.name)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="删除服务商"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

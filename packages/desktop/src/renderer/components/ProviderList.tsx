import { Play, Edit2, Trash2, Copy } from 'lucide-react'
import type { Provider } from '@ccman/core'

interface Props {
  providers: Provider[]
  currentProviderId: string | undefined
  onSwitch: (id: string) => void
  onEdit: (provider: Provider) => void
  onDelete: (id: string, name: string) => void
  onClone: (provider: Provider) => void
}

export default function ProviderList({
  providers,
  currentProviderId,
  onSwitch,
  onEdit,
  onDelete,
  onClone,
}: Props) {
  if (providers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无服务商</p>
        <p className="text-sm text-gray-400 mt-2">点击"添加服务商"开始使用</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">所有服务商</h2>
      <div className="space-y-3">
        {providers.map((provider) => {
          const isCurrent = provider.id === currentProviderId

          return (
            <div
              key={provider.id}
              className={`bg-white rounded-lg border p-4 transition-all ${
                isCurrent ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-medium text-gray-900">{provider.name}</h3>
                    {isCurrent && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        激活中
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 font-mono">{provider.baseUrl}</p>
                  {provider.desc && (
                    <p className="text-xs text-gray-500 mt-1">{provider.desc}</p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {!isCurrent && (
                    <button
                      onClick={() => onSwitch(provider.id)}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="切换到此服务商"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onClone(provider)}
                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="克隆服务商"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(provider)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="编辑服务商"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(provider.id, provider.name)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除服务商"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

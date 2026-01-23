import type { Provider } from '@ccman/types'

interface Props {
  provider: Provider | undefined
}

export default function CurrentProviderSection({ provider }: Props) {
  if (!provider) {
    return (
      <div className="px-8 py-4 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <span className="text-sm font-medium">No active provider</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-8 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm shadow-green-500/50 animate-pulse"></div>
        <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
          当前激活
        </span>
      </div>

      <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{provider.name}</h3>
        <p className="text-sm text-gray-600 font-mono">{provider.baseUrl}</p>
        {provider.lastUsedAt && (
          <p className="text-xs text-gray-500 mt-2">
            激活于 {new Date(provider.lastUsedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}

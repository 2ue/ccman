import { CheckCircle2 } from 'lucide-react'
import type { Provider } from '@ccman/core'

interface Props {
  provider: Provider | undefined
}

export default function CurrentStatus({ provider }: Props) {
  if (!provider) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">当前服务商</h2>
        <p className="text-sm text-gray-500">暂无激活的服务商</p>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">当前服务商</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <h3 className="text-base font-medium text-gray-900">{provider.name}</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex">
            <span className="w-20 text-gray-500">Base URL:</span>
            <span className="text-gray-900 font-mono">{provider.baseUrl}</span>
          </div>
          <div className="flex">
            <span className="w-20 text-gray-500">ID:</span>
            <span className="text-gray-600 font-mono text-xs">{provider.id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

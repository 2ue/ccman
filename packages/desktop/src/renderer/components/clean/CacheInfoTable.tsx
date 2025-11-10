/**
 * Cache Info Table Component
 * 显示所有缓存项，支持单独删除
 */

import { Trash2, Database, Clock } from 'lucide-react'
import type { CacheDetail } from '@ccman/core'

interface CacheInfoTableProps {
  caches: CacheDetail[]
  onDelete: (cacheKey: string) => void
  loading: boolean
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CacheInfoTable({ caches, onDelete, loading }: CacheInfoTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">加载缓存信息...</span>
        </div>
      </div>
    )
  }

  if (caches.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>暂无缓存数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 标题 */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">缓存数据</h3>
        <p className="text-sm text-gray-600 mt-1">共 {caches.length} 项缓存</p>
      </div>

      {/* 表格 - 移动端优化 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                缓存项
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                大小
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                最后更新
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {caches.map((cache) => (
              <tr key={cache.key} className="hover:bg-gray-50 transition-colors">
                {/* 缓存项名称 */}
                <td className="px-6 py-4">
                  <div className="flex items-start gap-2">
                    <Database className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{cache.name}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{cache.key}</p>
                      {/* 移动端显示统计信息 */}
                      <div className="md:hidden mt-1 space-y-1">
                        <p className="text-xs text-gray-500">{cache.sizeFormatted}</p>
                        {cache.lastUpdated && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(cache.lastUpdated)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* 大小 - 桌面端显示 */}
                <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {cache.sizeFormatted}
                  </span>
                </td>

                {/* 最后更新时间 - 大屏显示 */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {formatDate(cache.lastUpdated)}
                  </div>
                </td>

                {/* 操作按钮 */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onDelete(cache.key)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除此缓存项"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">删除</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

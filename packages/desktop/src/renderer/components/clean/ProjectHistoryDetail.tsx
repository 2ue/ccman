/**
 * Project History Detail Component
 * 显示单个项目的历史记录详情，支持删除单条和清空
 */

import { useState, useEffect } from 'react'
import { Trash2, X } from 'lucide-react'

interface HistoryEntry {
  display: string
  pastedContents: Record<string, any>
}

interface ProjectHistoryDetailProps {
  projectPath: string
  onClose: () => void
  onDelete: (index: number) => void
  onClear: () => void
}

export default function ProjectHistoryDetail({
  projectPath,
  onClose,
  onDelete,
  onClear,
}: ProjectHistoryDetailProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [projectPath])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.clean.getProjectHistory(projectPath)
      setHistory(data)
    } catch (error) {
      console.error('加载历史记录失败：', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (index: number) => {
    try {
      onDelete(index)
      // 重新加载历史记录
      await loadHistory()
    } catch (error) {
      console.error('删除失败：', error)
    }
  }

  const handleClear = () => {
    onClear()
  }

  if (loading) {
    return (
      <tr>
        <td colSpan={5} className="px-6 py-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">加载历史记录...</span>
          </div>
        </td>
      </tr>
    )
  }

  if (history.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="px-6 py-4 bg-gray-50">
          <div className="text-center text-gray-500">该项目暂无历史记录</div>
        </td>
      </tr>
    )
  }

  // 格式化 pastedContents 为可读文本
  const formatPastedContents = (contents: Record<string, any>): string => {
    if (!contents || Object.keys(contents).length === 0) {
      return '无'
    }
    const keys = Object.keys(contents)
    return `${keys.length} 个粘贴项`
  }

  return (
    <tr>
      <td colSpan={5} className="px-6 py-4 bg-gray-50">
        <div className="space-y-3">
          {/* 头部 */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">
              历史记录 ({history.length} 条)
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors"
              >
                清空全部
              </button>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 历史记录列表 - 限高滚动 */}
          <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    显示内容
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    粘贴内容
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((entry, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="max-w-md truncate" title={entry.display}>
                        {entry.display}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="max-w-xs truncate">
                        {formatPastedContents(entry.pastedContents)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDelete(index)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="删除此条记录"
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </td>
    </tr>
  )
}

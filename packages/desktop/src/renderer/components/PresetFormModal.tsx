import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { TOOL_TYPES, TOOL_CONFIG, type MainToolType } from '@ccman/types'
import { AlertDialog } from './dialogs'

interface PresetData {
  name: string
  baseUrl: string
  description: string
}

interface Props {
  show: boolean
  preset?: PresetData
  type: MainToolType
  onClose: () => void
  onSubmit: () => void
  onSuccess?: (message: string) => void
}

export default function PresetFormModal({
  show,
  preset,
  type,
  onClose,
  onSubmit,
  onSuccess,
}: Props) {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [description, setDescription] = useState('')

  const [alertDialog, setAlertDialog] = useState<{
    show: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
  }>({
    show: false,
    title: '',
    message: '',
    type: 'info',
  })

  useEffect(() => {
    if (preset) {
      setName(preset.name)
      setBaseUrl(preset.baseUrl)
      setDescription(preset.description)
    } else {
      setName('')
      setBaseUrl('')
      setDescription('')
    }
  }, [preset, show])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const api = (() => {
        switch (type) {
          case TOOL_TYPES.CODEX:
            return window.electronAPI.codex
          case TOOL_TYPES.CLAUDE:
            return window.electronAPI.claude
          case TOOL_TYPES.GEMINI:
            return window.electronAPI.gemini
        }
      })()

      if (preset) {
        // 编辑模式
        await api.editPreset(preset.name, { name, baseUrl, description })
        onSuccess?.('更新成功')
      } else {
        // 添加模式
        await api.addPreset({ name, baseUrl, description })
        onSuccess?.('添加成功')
      }

      onSubmit()
      onClose()
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '操作失败',
        message: (error as Error).message,
        type: 'error',
      })
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {preset ? '编辑预置服务商' : '添加预置服务商'} - {TOOL_CONFIG[type].displayName}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">服务商名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="我的自定义 API"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API 地址</label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://api.example.com/v1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="预置服务商描述"
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              {preset ? '更新' : '添加'}
            </button>
          </div>
        </form>
      </div>

      {/* Alert Dialog */}
      <AlertDialog
        show={alertDialog.show}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
        onClose={() => setAlertDialog({ ...alertDialog, show: false })}
      />
    </div>
  )
}

import { useState } from 'react'
import { X, Plus, Server, ExternalLink, AlertCircle, ArrowLeft } from 'lucide-react'
import type { MCPServer } from '@ccman/types'
import { MCP_PRESETS_DETAIL, type MCPPresetDetail } from '../constants/mcpPresets'
import MCPForm from './MCPForm'
import { AlertDialog } from './dialogs'

interface MCPFormData {
  name: string
  command: string
  args: string
  env: string
  description: string
}

interface Props {
  show: boolean
  onClose: () => void
  onSubmit: () => void
  onSuccess?: (message: string) => void
  existingServers: MCPServer[]
}

export default function AddMCPModal({
  show,
  onClose,
  onSubmit,
  onSuccess,
  existingServers,
}: Props) {
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<MCPPresetDetail | undefined>()

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

  const handleSelectPreset = (preset: MCPPresetDetail) => {
    setSelectedPreset(preset)
    setShowCustomForm(true)
  }

  const handleAddCustom = () => {
    setSelectedPreset(undefined)
    setShowCustomForm(true)
  }

  const handleMCPSubmit = async (formData: MCPFormData) => {
    try {
      // 解析表单数据
      const argsArray = formData.args
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      let envObject: Record<string, string | number> | undefined
      if (formData.env.trim()) {
        try {
          envObject = JSON.parse(formData.env)
        } catch (error) {
          throw new Error('环境变量 JSON 格式错误')
        }
      }

      // 构造 AddProviderInput
      // 映射：command → baseUrl, args → apiKey (space-separated), env + description → model (JSON)
      const input = {
        name: formData.name,
        baseUrl: formData.command,
        apiKey: argsArray.join(' '),
        model: JSON.stringify({
          env: envObject,
          description: formData.description,
        }),
      }

      await window.electronAPI.mcp.addServer(input)
      onSubmit()
      onClose()
      // 重置状态
      setSelectedPreset(undefined)
      setShowCustomForm(false)
      onSuccess?.('添加成功')
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '添加 MCP 失败',
        message: (error as Error).message,
        type: 'error',
      })
    }
  }

  const handleClose = () => {
    setSelectedPreset(undefined)
    setShowCustomForm(false)
    onClose()
  }

  const handleBackToList = () => {
    setSelectedPreset(undefined)
    setShowCustomForm(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${showCustomForm ? 'max-w-2xl' : 'max-w-4xl'} max-h-[90vh] overflow-hidden flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600" />
            添加 MCP 服务器
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showCustomForm ? (
            <div>
              <button
                onClick={handleBackToList}
                className="mb-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> 返回预设列表
              </button>
              <MCPForm
                preset={selectedPreset}
                existingServers={existingServers}
                onSubmit={handleMCPSubmit}
                onCancel={handleBackToList}
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-semibold text-gray-900">选择预设 MCP</h3>
                </div>
                <button
                  onClick={handleAddCustom}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  自定义添加
                </button>
              </div>

              {MCP_PRESETS_DETAIL.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Server className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500 mb-2">暂无可用的预设 MCP</p>
                  <p className="text-sm text-gray-400 mb-4">点击上方"自定义添加"创建配置</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {MCP_PRESETS_DETAIL.map((preset, index) => (
                    <div
                      key={`mcp-preset-${index}-${preset.name}`}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-purple-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium text-gray-900 mb-1">
                            {preset.name}
                          </h3>
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                            官方预设
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{preset.description}</p>

                      <div className="mb-3">
                        <code className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded block overflow-x-auto whitespace-nowrap">
                          {preset.command} {preset.args.join(' ')}
                        </code>
                      </div>

                      {(preset.envRequired || preset.argsPlaceholder) && (
                        <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 flex items-start gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <div>
                            {preset.envRequired && (
                              <div>需要配置环境变量: {preset.envRequired.join(', ')}</div>
                            )}
                            {preset.argsPlaceholder && <div>{preset.argsPlaceholder}</div>}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleSelectPreset(preset)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          title="使用此预设"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          使用
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
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

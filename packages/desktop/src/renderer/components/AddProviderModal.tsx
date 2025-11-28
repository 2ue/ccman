import { useState, useEffect } from 'react'
import { X, Plus, Package, ExternalLink } from 'lucide-react'
import type { Provider, AddProviderInput, EditProviderInput, PresetTemplate } from '@ccman/types'
import ProviderForm from './ProviderForm'
import { AlertDialog } from './dialogs'

interface Props {
  show: boolean
  type: 'codex' | 'claude' | 'gemini'
  onClose: () => void
  onSubmit: () => void
  onSuccess?: (message: string) => void
}

export default function AddProviderModal({ show, type, onClose, onSubmit, onSuccess }: Props) {
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<PresetTemplate | undefined>()
  const [presets, setPresets] = useState<PresetTemplate[]>([])
  const [providers, setProviders] = useState<Provider[]>([])

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

  const loadPresets = async () => {
    try {
      const api =
        type === 'codex'
          ? window.electronAPI.codex
          : type === 'claude'
            ? window.electronAPI.claude
            : window.electronAPI.gemini
      console.log(`[AddProviderModal] Loading ${type} presets...`)
      const presetsData = await api.listPresets()
      console.log(`[AddProviderModal] Loaded ${type} presets:`, presetsData)
      setPresets(presetsData)
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }

  const loadProviders = async () => {
    try {
      const api =
        type === 'codex'
          ? window.electronAPI.codex
          : type === 'claude'
            ? window.electronAPI.claude
            : window.electronAPI.gemini
      const providersData = await api.listProviders()
      setProviders(providersData)
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  }

  useEffect(() => {
    if (show) {
      loadPresets()
      loadProviders()
    }
  }, [show, type])

  const handleSelectPreset = (preset: PresetTemplate) => {
    console.log('[AddProviderModal] Selected preset:', preset)
    setSelectedPreset(preset)
    setShowCustomForm(true)
  }

  const handleAddCustom = () => {
    setSelectedPreset(undefined)
    setShowCustomForm(true)
  }

  const handleProviderSubmit = async (input: AddProviderInput | EditProviderInput) => {
    try {
      const api =
        type === 'codex'
          ? window.electronAPI.codex
          : type === 'claude'
            ? window.electronAPI.claude
            : window.electronAPI.gemini
      await api.addProvider(input as AddProviderInput)
      onSubmit()
      onClose()
      // 重置状态
      setSelectedPreset(undefined)
      setShowCustomForm(false)
      // 显示成功提示
      onSuccess?.('添加成功')
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '添加服务商失败',
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
        className={`bg-white rounded-lg shadow-xl w-full ${showCustomForm ? 'max-w-md' : 'max-w-4xl'} max-h-[90vh] overflow-hidden flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            添加 {type === 'claude' ? 'Claude' : type === 'codex' ? 'Codex' : 'Gemini CLI'} 服务商
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
                ← 返回服务商列表
              </button>
              <ProviderForm
                preset={selectedPreset}
                existingProviders={providers}
                onSubmit={handleProviderSubmit}
                onCancel={handleBackToList}
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package
                    className={`w-5 h-5 ${
                      type === 'codex'
                        ? 'text-blue-600'
                        : type === 'claude'
                          ? 'text-purple-600'
                          : 'text-green-600'
                    }`}
                  />
                  <h3 className="text-base font-semibold text-gray-900">选择预置服务商</h3>
                </div>
                <button
                  onClick={handleAddCustom}
                  className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                    type === 'codex'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : type === 'claude'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  自定义添加
                </button>
              </div>

              {presets.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500 mb-2">暂无可用的预置服务商</p>
                  <p className="text-sm text-gray-400 mb-4">点击上方"自定义添加"创建配置</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {presets.map((preset, index) => (
                    <div
                      key={`${type}-preset-${index}-${preset.name}`}
                      className="bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium text-gray-900 truncate mb-1">
                            {preset.name}
                          </h3>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
                              preset.isBuiltIn
                                ? 'bg-gray-100 text-gray-600 border-gray-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {preset.isBuiltIn ? '内置' : '自定义'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 mb-2">{preset.description}</p>

                      <p
                        className="text-xs text-gray-600 font-mono mb-3 truncate"
                        title={preset.baseUrl}
                      >
                        {preset.baseUrl}
                      </p>

                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleSelectPreset(preset)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                            type === 'codex'
                              ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                              : type === 'claude'
                                ? 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                                : 'text-green-700 bg-green-50 hover:bg-green-100'
                          }`}
                          title="使用此预置"
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

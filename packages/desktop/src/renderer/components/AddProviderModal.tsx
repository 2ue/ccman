import { useState, useEffect } from 'react'
import { X, Plus, Package, Check } from 'lucide-react'
import type {
  AddProviderInput,
  EditProviderInput,
  CodexPresetTemplate,
  ClaudeCodePresetTemplate,
} from '@ccman/core'
import ProviderForm from './ProviderForm'
import { AlertDialog } from './dialogs'

interface Props {
  show: boolean
  type: 'codex' | 'claudecode'
  onClose: () => void
  onSubmit: () => void
}

export default function AddProviderModal({ show, type, onClose, onSubmit }: Props) {
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<
    CodexPresetTemplate | ClaudeCodePresetTemplate | undefined
  >()
  const [presets, setPresets] = useState<
    Array<CodexPresetTemplate | ClaudeCodePresetTemplate>
  >([])

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
      const api = type === 'codex' ? window.electronAPI.codex : window.electronAPI.claudecode
      const presetsData = await api.listPresets()
      setPresets(presetsData)
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }

  useEffect(() => {
    if (show) {
      loadPresets()
    }
  }, [show, type])

  const handleSelectPreset = (preset: CodexPresetTemplate | ClaudeCodePresetTemplate) => {
    setSelectedPreset(preset)
    setShowCustomForm(true)
  }

  const handleAddCustom = () => {
    setSelectedPreset(undefined)
    setShowCustomForm(true)
  }

  const handleProviderSubmit = async (input: AddProviderInput | EditProviderInput) => {
    try {
      const api = type === 'codex' ? window.electronAPI.codex : window.electronAPI.claudecode
      await api.addProvider(input as AddProviderInput)
      onSubmit()
      onClose()
      // 重置状态
      setSelectedPreset(undefined)
      setShowCustomForm(false)
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            添加 {type === 'claudecode' ? 'Claude Code' : 'Codex'} 服务商
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
                onSubmit={handleProviderSubmit}
                onCancel={handleBackToList}
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-semibold text-gray-900">选择预置服务商</h3>
                </div>
                <button
                  onClick={handleAddCustom}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
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
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleSelectPreset(preset)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-base">{preset.name}</h3>
                      </div>

                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{preset.description}</p>

                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-1">Base URL:</div>
                        <div className="text-xs text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded break-all">
                          {preset.baseUrl}
                        </div>
                      </div>

                      <button
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectPreset(preset)
                        }}
                      >
                        <Check className="w-4 h-4" />
                        使用此预置
                      </button>
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

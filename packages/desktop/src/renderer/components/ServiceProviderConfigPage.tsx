/**
 * ServiceProviderConfigPage - 预置服务商展示页面
 *
 * 按照架构设计：
 * - 预置在Core层硬编码 (CODEX_PRESETS, CLAUDECODE_PRESETS)
 * - 两套独立的预设，完全分离
 * - 用户可以从预置中快速添加服务商（需要填写API Key）
 * - 用户可以添加自己的预置服务商
 */

import { useState, useEffect } from 'react'
import type { CodexPresetTemplate, ClaudeCodePresetTemplate, AddProviderInput, EditProviderInput } from '@ccman/core'
import { Search, Package, ExternalLink, Edit2, Trash2, Plus, FileCode2 } from 'lucide-react'
import PresetFormModal from './PresetFormModal'
import ConfigEditorModal from './ConfigEditorModal'
import ProviderForm from './ProviderForm'
import { ConfirmDialog, AlertDialog } from './dialogs'

interface ServiceProviderConfigPageProps {
  onUseServiceProvider: () => void
}

// 扩展预置类型，添加 isBuiltIn 标记
interface ExtendedPreset {
  name: string
  baseUrl: string
  description: string
  type: 'codex' | 'claudecode'
  isBuiltIn: boolean
}

export default function ServiceProviderConfigPage({ onUseServiceProvider }: ServiceProviderConfigPageProps) {
  const [codexPresets, setCodexPresets] = useState<CodexPresetTemplate[]>([])
  const [claudeCodePresets, setClaudeCodePresets] = useState<ClaudeCodePresetTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // 预置表单 Modal
  const [showPresetModal, setShowPresetModal] = useState(false)
  const [presetModalType, setPresetModalType] = useState<'codex' | 'claudecode'>('codex')
  const [editingPreset, setEditingPreset] = useState<{ name: string; baseUrl: string; description: string } | undefined>()

  // Settings Modal
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [configFiles, setConfigFiles] = useState<
    Array<{ name: string; path: string; content: string; language: 'json' | 'toml' }>
  >([])

  // Use Preset Modal
  const [showUsePresetModal, setShowUsePresetModal] = useState(false)
  const [usingPreset, setUsingPreset] = useState<ExtendedPreset | undefined>()

  // Dialog 状态
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

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
      const codex = await window.electronAPI.codex.listPresets()
      const claudecode = await window.electronAPI.claudecode.listPresets()
      setCodexPresets(codex)
      setClaudeCodePresets(claudecode)
    } catch (error) {
      console.error('加载预置失败:', error)
    }
  }

  useEffect(() => {
    loadPresets()
  }, [])

  const handleUsePreset = (preset: ExtendedPreset) => {
    setUsingPreset(preset)
    setShowUsePresetModal(true)
  }

  const handleUsePresetSubmit = async (input: AddProviderInput | EditProviderInput) => {
    if (!usingPreset) return

    try {
      const api = usingPreset.type === 'codex' ? window.electronAPI.codex : window.electronAPI.claudecode

      await api.addProvider(input as AddProviderInput)

      setShowUsePresetModal(false)
      setUsingPreset(undefined)
      setAlertDialog({
        show: true,
        title: '添加成功',
        message: '服务商已成功添加！',
        type: 'success',
      })
      onUseServiceProvider()
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '添加失败',
        message: (error as Error).message,
        type: 'error',
      })
    }
  }

  const handleAddPreset = (type: 'codex' | 'claudecode') => {
    setPresetModalType(type)
    setEditingPreset(undefined)
    setShowPresetModal(true)
  }

  const handleEditPreset = (preset: ExtendedPreset) => {
    setPresetModalType(preset.type)
    setEditingPreset({
      name: preset.name,
      baseUrl: preset.baseUrl,
      description: preset.description,
    })
    setShowPresetModal(true)
  }

  const handleDeletePreset = async (preset: ExtendedPreset) => {
    setConfirmDialog({
      show: true,
      title: '确认删除',
      message: `确定要删除预置 "${preset.name}" 吗？`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, show: false })

        try {
          const api = preset.type === 'codex' ? window.electronAPI.codex : window.electronAPI.claudecode
          await api.removePreset(preset.name)
          await loadPresets()
          setAlertDialog({
            show: true,
            title: '删除成功',
            message: '预置已成功删除！',
            type: 'success',
          })
        } catch (error) {
          setAlertDialog({
            show: true,
            title: '删除失败',
            message: (error as Error).message,
            type: 'error',
          })
        }
      },
    })
  }

  const handleEditConfig = async () => {
    try {
      const files = await window.electronAPI.config.readPresetConfigFiles()
      setConfigFiles(files)
      setShowConfigEditor(true)
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '读取配置文件失败',
        message: (error as Error).message,
        type: 'error',
      })
    }
  }

  const handleSaveConfig = async (
    files: Array<{ name: string; path: string; content: string; language: 'json' | 'toml' }>
  ) => {
    await window.electronAPI.config.writePresetConfigFiles(files)
    await loadPresets()
  }

  // 扩展预置数据，添加 type 和 isBuiltIn 字段
  const extendedCodexPresets: ExtendedPreset[] = codexPresets.map((p, index) => ({
    ...p,
    type: 'codex' as const,
    isBuiltIn: index < 7, // 前7个是内置的
  }))

  const extendedClaudeCodePresets: ExtendedPreset[] = claudeCodePresets.map((p, index) => ({
    ...p,
    type: 'claudecode' as const,
    isBuiltIn: index < 7, // 前7个是内置的
  }))

  // 前端搜索过滤
  const filteredCodexPresets = extendedCodexPresets.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.baseUrl.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredClaudeCodePresets = extendedClaudeCodePresets.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.baseUrl.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">预置服务商</h1>
            <p className="text-sm text-gray-500 mt-1">
              从预置模板快速添加服务商（共 {codexPresets.length + claudeCodePresets.length} 个预置）
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleEditConfig} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors" title="编辑预置配置文件">
              <FileCode2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索预置服务商..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Codex 预置组 */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Codex 预置</h2>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {filteredCodexPresets.length}
              </span>
            </div>
            <button
              onClick={() => handleAddPreset('codex')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加 Codex 预置
            </button>
          </div>

          {filteredCodexPresets.length === 0 ? (
            <p className="text-sm text-gray-500 mb-8">
              {searchQuery ? '没有匹配的 Codex 预置' : '暂无 Codex 预置'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              {filteredCodexPresets.map((preset) => (
                <div
                  key={`codex-${preset.name}`}
                  className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 truncate mb-1">{preset.name}</h3>
                      {preset.isBuiltIn && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          Built-in
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-2">{preset.description}</p>

                  <p className="text-xs text-gray-600 font-mono mb-3 truncate" title={preset.baseUrl}>
                    {preset.baseUrl}
                  </p>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleUsePreset(preset)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      title="使用此预置"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      使用
                    </button>
                    {!preset.isBuiltIn && (
                      <>
                        <button
                          onClick={() => handleEditPreset(preset)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="编辑预置"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePreset(preset)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="删除预置"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claude Code 预置组 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Claude Code 预置</h2>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                {filteredClaudeCodePresets.length}
              </span>
            </div>
            <button
              onClick={() => handleAddPreset('claudecode')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加 Claude Code 预置
            </button>
          </div>

          {filteredClaudeCodePresets.length === 0 ? (
            <p className="text-sm text-gray-500">
              {searchQuery ? '没有匹配的 Claude Code 预置' : '暂无 Claude Code 预置'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredClaudeCodePresets.map((preset) => (
                <div
                  key={`claudecode-${preset.name}`}
                  className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 truncate mb-1">{preset.name}</h3>
                      {preset.isBuiltIn && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          Built-in
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-2">{preset.description}</p>

                  <p className="text-xs text-gray-600 font-mono mb-3 truncate" title={preset.baseUrl}>
                    {preset.baseUrl}
                  </p>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleUsePreset(preset)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
                      title="使用此预置"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      使用
                    </button>
                    {!preset.isBuiltIn && (
                      <>
                        <button
                          onClick={() => handleEditPreset(preset)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="编辑预置"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePreset(preset)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="删除预置"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preset Form Modal */}
      <PresetFormModal
        show={showPresetModal}
        preset={editingPreset}
        type={presetModalType}
        onClose={() => {
          setShowPresetModal(false)
          setEditingPreset(undefined)
        }}
        onSubmit={() => {
          loadPresets()
        }}
      />

      {/* Config Editor Modal */}
      <ConfigEditorModal
        show={showConfigEditor}
        title="编辑预置配置文件"
        files={configFiles}
        onSave={handleSaveConfig}
        onClose={() => setShowConfigEditor(false)}
      />

      {/* Dialogs */}
      <ConfirmDialog
        show={confirmDialog.show}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, show: false })}
      />

      <AlertDialog
        show={alertDialog.show}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
        onClose={() => setAlertDialog({ ...alertDialog, show: false })}
      />

      {/* Use Preset Modal */}
      {showUsePresetModal && usingPreset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              使用预置服务商
            </h2>
            <ProviderForm
              preset={usingPreset}
              onSubmit={handleUsePresetSubmit}
              onCancel={() => {
                setShowUsePresetModal(false)
                setUsingPreset(undefined)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

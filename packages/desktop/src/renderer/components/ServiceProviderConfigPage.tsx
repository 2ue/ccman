/**
 * ServiceProviderConfigPage - 预置服务商展示页面
 *
 * 按照架构设计：
 * - 预置在Core层硬编码 (CODEX_PRESETS, CC_PRESETS)
 * - 两套独立的预设，完全分离
 * - 用户可以从预置中快速添加服务商（需要填写API Key）
 * - 用户可以添加自己的预置服务商
 */

import { useState, useEffect } from 'react'
import type {
  Provider,
  PresetTemplate,
  AddProviderInput,
  EditProviderInput,
  ToolType,
} from '@ccman/types'
import { TOOL_TYPES } from '@ccman/types'
import { Search, Package, ExternalLink, Edit2, Trash2, Plus, FileCode2 } from 'lucide-react'
import PresetFormModal from './PresetFormModal'
import ConfigEditorModal from './ConfigEditorModal'
import ProviderForm from './ProviderForm'
import { ConfirmDialog, AlertDialog } from './dialogs'

interface ServiceProviderConfigPageProps {
  onUseServiceProvider: () => void
  onSuccess?: (message: string) => void
}

type PresetToolType = Exclude<ToolType, 'mcp'>

// 扩展预置类型，添加 isBuiltIn 标记
interface ExtendedPreset {
  name: string
  baseUrl: string
  description: string
  type: PresetToolType
  isBuiltIn: boolean
}

/**
 * 获取对应工具类型的 API
 */
function getToolAPI(type: PresetToolType) {
  switch (type) {
    case TOOL_TYPES.CODEX:
      return window.electronAPI.codex
    case TOOL_TYPES.CLAUDE:
      return window.electronAPI.claude
    case TOOL_TYPES.GEMINI:
      return window.electronAPI.gemini
    case TOOL_TYPES.OPENCODE:
      return window.electronAPI.opencode
    case TOOL_TYPES.OPENCLAW:
      return window.electronAPI.openclaw
  }
}

export default function ServiceProviderConfigPage({
  onUseServiceProvider,
  onSuccess,
}: ServiceProviderConfigPageProps) {
  const [codexPresets, setCodexPresets] = useState<PresetTemplate[]>([])
  const [claudeCodePresets, setClaudeCodePresets] = useState<PresetTemplate[]>([])
  const [geminiPresets, setGeminiPresets] = useState<PresetTemplate[]>([])
  const [opencodePresets, setOpencodePresets] = useState<PresetTemplate[]>([])
  const [openclawPresets, setOpenclawPresets] = useState<PresetTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [codexProviders, setCodexProviders] = useState<Provider[]>([])
  const [claudeProviders, setClaudeProviders] = useState<Provider[]>([])
  const [geminiProviders, setGeminiProviders] = useState<Provider[]>([])
  const [opencodeProviders, setOpencodeProviders] = useState<Provider[]>([])
  const [openclawProviders, setOpenclawProviders] = useState<Provider[]>([])

  // 预置表单 Modal
  const [showPresetModal, setShowPresetModal] = useState(false)
  const [presetModalType, setPresetModalType] = useState<PresetToolType>(TOOL_TYPES.CODEX)
  const [editingPreset, setEditingPreset] = useState<
    { name: string; baseUrl: string; description: string } | undefined
  >()

  // Settings Modal
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [configFiles, setConfigFiles] = useState<
    Array<{ name: string; path: string; content: string; language: 'json' | 'toml' | 'env' }>
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
      const claude = await window.electronAPI.claude.listPresets()
      const gemini = await window.electronAPI.gemini.listPresets()
      const opencode = await window.electronAPI.opencode.listPresets()
      const openclaw = await window.electronAPI.openclaw.listPresets()
      setCodexPresets(codex)
      setClaudeCodePresets(claude)
      setGeminiPresets(gemini)
      setOpencodePresets(opencode)
      setOpenclawPresets(openclaw)
    } catch (error) {
      console.error('加载预置失败:', error)
    }
  }

  useEffect(() => {
    loadPresets()
  }, [])

  const handleUsePreset = async (preset: ExtendedPreset) => {
    setUsingPreset(preset)
    setShowUsePresetModal(true)

    // Load providers list for validation
    try {
      const api = getToolAPI(preset.type)
      const providersData = await api.listProviders()

      switch (preset.type) {
        case TOOL_TYPES.CODEX:
          setCodexProviders(providersData)
          break
        case TOOL_TYPES.CLAUDE:
          setClaudeProviders(providersData)
          break
        case TOOL_TYPES.GEMINI:
          setGeminiProviders(providersData)
          break
        case TOOL_TYPES.OPENCODE:
          setOpencodeProviders(providersData)
          break
        case TOOL_TYPES.OPENCLAW:
          setOpenclawProviders(providersData)
          break
      }
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  }

  const handleUsePresetSubmit = async (input: AddProviderInput | EditProviderInput) => {
    if (!usingPreset) return

    try {
      const api = getToolAPI(usingPreset.type)

      const addedProvider = await api.addProvider(input as AddProviderInput)

      setShowUsePresetModal(false)
      setUsingPreset(undefined)
      onSuccess?.('添加成功')
      onUseServiceProvider()

      setConfirmDialog({
        show: true,
        title: '是否立即使用？',
        message: `服务商 "${addedProvider.name}" 已添加，是否立即切换使用？`,
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, show: false }))
          try {
            await api.switchProvider(addedProvider.id)
            onSuccess?.('切换成功')
            onUseServiceProvider()
          } catch (error) {
            setAlertDialog({
              show: true,
              title: '切换失败',
              message: (error as Error).message,
              type: 'error',
            })
          }
        },
      })
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '添加失败',
        message: (error as Error).message,
        type: 'error',
      })
    }
  }

  const handleAddPreset = (type: PresetToolType) => {
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
          const api = getToolAPI(preset.type)
          await api.removePreset(preset.name)
          await loadPresets()
          onSuccess?.('删除成功')
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
      const files = await window.electronAPI.config.readCcmanConfigFiles()
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
    files: Array<{ name: string; path: string; content: string; language: 'json' | 'toml' | 'env' }>
  ) => {
    await window.electronAPI.config.writeCcmanConfigFiles(files)
    await loadPresets()
  }

  // 扩展预置数据，添加 type 字段
  const extendedCodexPresets: ExtendedPreset[] = codexPresets.map((p) => ({
    ...p,
    type: TOOL_TYPES.CODEX,
  }))

  const extendedClaudeCodePresets: ExtendedPreset[] = claudeCodePresets.map((p) => ({
    ...p,
    type: TOOL_TYPES.CLAUDE,
  }))

  const extendedGeminiPresets: ExtendedPreset[] = geminiPresets.map((p) => ({
    ...p,
    type: TOOL_TYPES.GEMINI,
  }))

  const extendedOpenCodePresets: ExtendedPreset[] = opencodePresets.map((p) => ({
    ...p,
    type: TOOL_TYPES.OPENCODE,
  }))

  const extendedOpenClawPresets: ExtendedPreset[] = openclawPresets.map((p) => ({
    ...p,
    type: TOOL_TYPES.OPENCLAW,
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

  const filteredGeminiPresets = extendedGeminiPresets.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.baseUrl.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredOpenCodePresets = extendedOpenCodePresets.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.baseUrl.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredOpenClawPresets = extendedOpenClawPresets.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.baseUrl.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">预置服务商</h1>
            <p className="text-sm text-gray-500 mt-1">
              从预置模板快速添加服务商（共{' '}
              {codexPresets.length +
                claudeCodePresets.length +
                geminiPresets.length +
                opencodePresets.length +
                openclawPresets.length}{' '}
              个预置）
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEditConfig}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="编辑预置配置文件"
            >
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
              onClick={() => handleAddPreset(TOOL_TYPES.CODEX)}
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
              <Package className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Claude Code 预置</h2>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {filteredClaudeCodePresets.length}
              </span>
            </div>
            <button
              onClick={() => handleAddPreset(TOOL_TYPES.CLAUDE)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加 Claude Code 预置
            </button>
          </div>

          {filteredClaudeCodePresets.length === 0 ? (
            <p className="text-sm text-gray-500 mb-8">
              {searchQuery ? '没有匹配的 Claude Code 预置' : '暂无 Claude Code 预置'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              {filteredClaudeCodePresets.map((preset) => (
                <div
                  key={`claudecode-${preset.name}`}
                  className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
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

        {/* Gemini CLI 预置组 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Gemini CLI 预置</h2>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {filteredGeminiPresets.length}
              </span>
            </div>
            <button
              onClick={() => handleAddPreset(TOOL_TYPES.GEMINI)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加 Gemini CLI 预置
            </button>
          </div>

          {filteredGeminiPresets.length === 0 ? (
            <p className="text-sm text-gray-500">
              {searchQuery ? '没有匹配的 Gemini CLI 预置' : '暂无 Gemini CLI 预置'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredGeminiPresets.map((preset) => (
                <div
                  key={`gemini-${preset.name}`}
                  className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
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

        {/* OpenCode 预置组 */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">OpenCode 预置</h2>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {filteredOpenCodePresets.length}
              </span>
            </div>
            <button
              onClick={() => handleAddPreset(TOOL_TYPES.OPENCODE)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加 OpenCode 预置
            </button>
          </div>

          {filteredOpenCodePresets.length === 0 ? (
            <p className="text-sm text-gray-500">
              {searchQuery ? '没有匹配的 OpenCode 预置' : '暂无 OpenCode 预置'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredOpenCodePresets.map((preset) => (
                <div
                  key={`opencode-${preset.name}`}
                  className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
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

        {/* OpenClaw 预置组 */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">OpenClaw 预置</h2>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {filteredOpenClawPresets.length}
              </span>
            </div>
            <button
              onClick={() => handleAddPreset(TOOL_TYPES.OPENCLAW)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加 OpenClaw 预置
            </button>
          </div>

          {filteredOpenClawPresets.length === 0 ? (
            <p className="text-sm text-gray-500">
              {searchQuery ? '没有匹配的 OpenClaw 预置' : '暂无 OpenClaw 预置'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredOpenClawPresets.map((preset) => (
                <div
                  key={`openclaw-${preset.name}`}
                  className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
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
        onSuccess={(message) => {
          onSuccess?.(message)
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">使用预置服务商</h2>
            <ProviderForm
              preset={usingPreset}
              tool={usingPreset.type}
              existingProviders={(() => {
                switch (usingPreset.type) {
                  case TOOL_TYPES.CODEX:
                    return codexProviders
                  case TOOL_TYPES.CLAUDE:
                    return claudeProviders
                  case TOOL_TYPES.GEMINI:
                    return geminiProviders
                  case TOOL_TYPES.OPENCODE:
                    return opencodeProviders
                  case TOOL_TYPES.OPENCLAW:
                    return openclawProviders
                }
              })()}
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

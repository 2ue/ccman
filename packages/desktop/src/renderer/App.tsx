/**
 * Desktop Renderer App
 *
 * 新架构：Dashboard + 小侧边栏渐进式导航
 * - Dashboard: 首页，展示所有功能模块的状态卡片
 * - 详情页: 显示小侧边栏（60px），快速切换页面
 *
 * 架构:
 * - Codex Providers: 独立管理,使用 window.electronAPI.codex.*
 * - Claude Providers: 独立管理,使用 window.electronAPI.claude.*
 * - OpenCode Providers: 独立管理,使用 window.electronAPI.opencode.*
 */

import { useState, useEffect } from 'react'
import type { Provider, AddProviderInput, EditProviderInput } from '@ccman/types'
import DashboardPage, { NavKey } from './components/DashboardPage'
import MiniSidebar from './components/MiniSidebar'
import ClaudeCodePage from './components/ClaudeCodePage'
import CodexPage from './components/CodexPage'
import GeminiPage from './components/GeminiPage'
import OpenCodePage from './components/OpenCodePage'
import MCPManagerPage from './components/MCPManagerPage'
import ServiceProviderConfigPage from './components/ServiceProviderConfigPage'
import CleanPage from './components/CleanPage'
import SettingsPage from './components/SettingsPage'
import AboutPage from './components/AboutPage'
import AddProviderModal from './components/AddProviderModal'
import ProviderForm from './components/ProviderForm'
import { ConfirmDialog, AlertDialog } from './components/dialogs'
import Toast from './components/Toast'

type ViewState = 'dashboard' | NavKey

export default function App() {
  // 视图状态：'dashboard' 或具体页面
  const [currentView, setCurrentView] = useState<ViewState>('dashboard')

  // Codex 数据
  const [codexProviders, setCodexProviders] = useState<Provider[]>([])
  const [currentCodex, setCurrentCodex] = useState<Provider | undefined>()

  // Claude 数据
  const [claudeProviders, setClaudeProviders] = useState<Provider[]>([])
  const [currentClaude, setCurrentClaude] = useState<Provider | undefined>()

  // Gemini 数据
  const [geminiProviders, setGeminiProviders] = useState<Provider[]>([])
  const [currentGemini, setCurrentGemini] = useState<Provider | undefined>()

  // OpenCode 数据
  const [opencodeProviders, setOpencodeProviders] = useState<Provider[]>([])
  const [currentOpenCode, setCurrentOpenCode] = useState<Provider | undefined>()

  // Modal 状态
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalTool, setAddModalTool] = useState<'codex' | 'claude' | 'gemini' | 'opencode'>(
    'claude'
  )
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | undefined>()
  const [editingTool, setEditingTool] = useState<'codex' | 'claude' | 'gemini' | 'opencode'>(
    'claude'
  )
  const [isCloneMode, setIsCloneMode] = useState(false)

  // Presets 数量
  const [codexPresetsCount, setCodexPresetsCount] = useState(0)
  const [claudePresetsCount, setClaudePresetsCount] = useState(0)
  const [geminiPresetsCount, setGeminiPresetsCount] = useState(0)
  const [opencodePresetsCount, setOpencodePresetsCount] = useState(0)

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

  const [toast, setToast] = useState<{
    show: boolean
    message: string
  }>({
    show: false,
    message: '',
  })

  // 加载数据
  const loadData = async () => {
    try {
      console.log('window.electronAPI', window.electronAPI)
      // 加载 Codex 数据
      const codexList = await window.electronAPI.codex.listProviders()
      setCodexProviders(codexList)
      const codexCurrent = await window.electronAPI.codex.getCurrent()
      setCurrentCodex(codexCurrent)
      const codexPresets = await window.electronAPI.codex.listPresets()
      setCodexPresetsCount(codexPresets.length)

      // 加载 Claude 数据
      const claudeList = await window.electronAPI.claude.listProviders()
      setClaudeProviders(claudeList)
      const claudeCurrent = await window.electronAPI.claude.getCurrent()
      setCurrentClaude(claudeCurrent)
      const claudePresets = await window.electronAPI.claude.listPresets()
      setClaudePresetsCount(claudePresets.length)

      // 加载 Gemini 数据
      if (window.electronAPI.gemini) {
        const geminiList = await window.electronAPI.gemini.listProviders()
        setGeminiProviders(geminiList)
        const geminiCurrent = await window.electronAPI.gemini.getCurrent()
        setCurrentGemini(geminiCurrent)
        const geminiPresets = await window.electronAPI.gemini.listPresets()
        setGeminiPresetsCount(geminiPresets.length)
      }

      // 加载 OpenCode 数据
      if (window.electronAPI.opencode) {
        const opencodeList = await window.electronAPI.opencode.listProviders()
        setOpencodeProviders(opencodeList)
        const opencodeCurrent = await window.electronAPI.opencode.getCurrent()
        setCurrentOpenCode(opencodeCurrent)
        const opencodePresets = await window.electronAPI.opencode.listPresets()
        setOpencodePresetsCount(opencodePresets.length)
      }
    } catch (error) {
      console.error('加载数据失败：', error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // ============================================================================
  // Codex 操作
  // ============================================================================

  const handleCodexSwitch = async (id: string) => {
    try {
      await window.electronAPI.codex.switchProvider(id)
      await loadData()
      setToast({
        show: true,
        message: '切换成功',
      })
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '切换失败',
        message: (error as Error).message,
        type: 'error',
      })
    }
  }

  const handleCodexDelete = (id: string, name: string) => {
    setConfirmDialog({
      show: true,
      title: '确认删除',
      message: `确定要删除 "${name}" 吗？`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, show: false })
        try {
          await window.electronAPI.codex.removeProvider(id)
          await loadData()
          setToast({
            show: true,
            message: '删除成功',
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

  const handleCodexClone = (provider: Provider) => {
    setEditingProvider({
      ...provider,
      name: `${provider.name}（副本）`,
    })
    setEditingTool('codex')
    setIsCloneMode(true)
    setShowEditModal(true)
  }

  const handleCodexEdit = (provider: Provider) => {
    setEditingProvider(provider)
    setEditingTool('codex')
    setIsCloneMode(false)
    setShowEditModal(true)
  }

  // ============================================================================
  // Claude 操作
  // ============================================================================

  const handleClaudeSwitch = async (id: string) => {
    try {
      await window.electronAPI.claude.switchProvider(id)
      await loadData()
      setToast({
        show: true,
        message: '切换成功',
      })
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '切换失败',
        message: (error as Error).message,
        type: 'error',
      })
    }
  }

  const handleClaudeDelete = (id: string, name: string) => {
    setConfirmDialog({
      show: true,
      title: '确认删除',
      message: `确定要删除 "${name}" 吗？`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, show: false })
        try {
          await window.electronAPI.claude.removeProvider(id)
          await loadData()
          setToast({
            show: true,
            message: '删除成功',
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

  const handleClaudeClone = (provider: Provider) => {
    setEditingProvider({
      ...provider,
      name: `${provider.name}（副本）`,
    })
    setEditingTool('claude')
    setIsCloneMode(true)
    setShowEditModal(true)
  }

  const handleClaudeEdit = (provider: Provider) => {
    setEditingProvider(provider)
    setEditingTool('claude')
    setIsCloneMode(false)
    setShowEditModal(true)
  }

  // ============================================================================
  // Gemini 操作
  // ============================================================================

  const handleGeminiSwitch = async (id: string) => {
    try {
      await window.electronAPI.gemini.switchProvider(id)
      await loadData()
      setToast({
        show: true,
        message: '切换成功',
      })
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '切换失败',
        message: (error as Error).message,
        type: 'error',
      })
    }
  }

  const handleGeminiDelete = (id: string, name: string) => {
    setConfirmDialog({
      show: true,
      title: '确认删除',
      message: `确定要删除 "${name}" 吗？`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, show: false })
        try {
          await window.electronAPI.gemini.removeProvider(id)
          await loadData()
          setToast({
            show: true,
            message: '删除成功',
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

  const handleGeminiClone = (provider: Provider) => {
    setEditingProvider({
      ...provider,
      name: `${provider.name}（副本）`,
    })
    setEditingTool('gemini')
    setIsCloneMode(true)
    setShowEditModal(true)
  }

  const handleGeminiEdit = (provider: Provider) => {
    setEditingProvider(provider)
    setEditingTool('gemini')
    setIsCloneMode(false)
    setShowEditModal(true)
  }

  // ============================================================================
  // OpenCode 操作
  // ============================================================================

  const handleOpenCodeSwitch = async (id: string) => {
    try {
      await window.electronAPI.opencode.switchProvider(id)
      await loadData()
      setToast({
        show: true,
        message: '切换成功',
      })
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '切换失败',
        message: (error as Error).message,
        type: 'error',
      })
    }
  }

  const handleOpenCodeDelete = (id: string, name: string) => {
    setConfirmDialog({
      show: true,
      title: '确认删除',
      message: `确定要删除 "${name}" 吗？`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, show: false })
        try {
          await window.electronAPI.opencode.removeProvider(id)
          await loadData()
          setToast({
            show: true,
            message: '删除成功',
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

  const handleOpenCodeClone = (provider: Provider) => {
    setEditingProvider({
      ...provider,
      name: `${provider.name}（副本）`,
    })
    setEditingTool('opencode')
    setIsCloneMode(true)
    setShowEditModal(true)
  }

  const handleOpenCodeEdit = (provider: Provider) => {
    setEditingProvider(provider)
    setEditingTool('opencode')
    setIsCloneMode(false)
    setShowEditModal(true)
  }

  // ============================================================================
  // 导航操作
  // ============================================================================

  // 从 Dashboard 进入详情页
  const handleEnterPage = (key: NavKey) => {
    setCurrentView(key)
  }

  // 小侧边栏导航
  const handleNavigate = (key: NavKey) => {
    if (key === 'home') {
      setCurrentView('dashboard')
    } else {
      setCurrentView(key)
    }
  }

  // ============================================================================
  // 通用操作
  // ============================================================================

  const handleAddProvider = (tool: 'codex' | 'claude' | 'gemini' | 'opencode') => {
    setAddModalTool(tool)
    setShowAddModal(true)
  }

  const handleEditSubmit = async (input: AddProviderInput | EditProviderInput) => {
    if (!editingProvider) return

    try {
      const api =
        editingTool === 'codex'
          ? window.electronAPI.codex
          : editingTool === 'claude'
            ? window.electronAPI.claude
            : editingTool === 'gemini'
              ? window.electronAPI.gemini
              : window.electronAPI.opencode

      if (isCloneMode) {
        // 克隆模式：创建新服务商
        await api.addProvider(input as AddProviderInput)
      } else {
        // 编辑模式：更新现有服务商
        await api.editProvider(editingProvider.id, input as EditProviderInput)
      }

      setShowEditModal(false)
      setEditingProvider(undefined)
      setIsCloneMode(false)
      await loadData()
      setToast({
        show: true,
        message: `${isCloneMode ? '克隆' : '更新'}成功`,
      })
    } catch (error) {
      setAlertDialog({
        show: true,
        title: `${isCloneMode ? '克隆' : '更新'}失败`,
        message: (error as Error).message,
        type: 'error',
      })
    }
  }

  return (
    <div className="flex h-screen bg-white">
      {/* 小侧边栏（始终显示） */}
      <MiniSidebar
        activeKey={currentView === 'dashboard' ? 'home' : (currentView as NavKey)}
        onNavigate={handleNavigate}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Dashboard 首页 */}
        {currentView === 'dashboard' && (
          <DashboardPage
            claudeData={{
              providers: claudeProviders,
              current: currentClaude,
              presetsCount: claudePresetsCount,
            }}
            codexData={{
              providers: codexProviders,
              current: currentCodex,
              presetsCount: codexPresetsCount,
            }}
            geminiData={{
              providers: geminiProviders,
              current: currentGemini,
              presetsCount: geminiPresetsCount,
            }}
            opencodeData={{
              providers: opencodeProviders,
              current: currentOpenCode,
              presetsCount: opencodePresetsCount,
            }}
            onEnterPage={handleEnterPage}
          />
        )}

        {/* Claude Code 页面 */}
        {currentView === 'claude' && (
          <ClaudeCodePage
            providers={claudeProviders}
            currentProvider={currentClaude}
            onAdd={() => handleAddProvider('claude')}
            onSwitch={handleClaudeSwitch}
            onEdit={handleClaudeEdit}
            onDelete={handleClaudeDelete}
            onClone={handleClaudeClone}
          />
        )}

        {/* Codex 页面 */}
        {currentView === 'codex' && (
          <CodexPage
            providers={codexProviders}
            currentProvider={currentCodex}
            onAdd={() => handleAddProvider('codex')}
            onSwitch={handleCodexSwitch}
            onEdit={handleCodexEdit}
            onDelete={handleCodexDelete}
            onClone={handleCodexClone}
          />
        )}

        {/* Gemini 页面 */}
        {currentView === 'gemini' && (
          <GeminiPage
            providers={geminiProviders}
            currentProvider={currentGemini}
            onAdd={() => handleAddProvider('gemini')}
            onSwitch={handleGeminiSwitch}
            onEdit={handleGeminiEdit}
            onDelete={handleGeminiDelete}
            onClone={handleGeminiClone}
          />
        )}

        {/* OpenCode 页面 */}
        {currentView === 'opencode' && (
          <OpenCodePage
            providers={opencodeProviders}
            currentProvider={currentOpenCode}
            onAdd={() => handleAddProvider('opencode')}
            onSwitch={handleOpenCodeSwitch}
            onEdit={handleOpenCodeEdit}
            onDelete={handleOpenCodeDelete}
            onClone={handleOpenCodeClone}
          />
        )}

        {/* MCP 页面 */}
        {currentView === 'mcp' && <MCPManagerPage />}

        {/* 预置服务商页面 */}
        {currentView === 'service-providers' && (
          <ServiceProviderConfigPage
            onUseServiceProvider={() => {
              loadData()
            }}
            onSuccess={(message) => {
              setToast({ show: true, message })
            }}
          />
        )}

        {/* 清理工具页面 */}
        {currentView === 'clean' && (
          <CleanPage
            onSuccess={(message) => {
              setToast({ show: true, message })
            }}
            onError={(title, message) => {
              setAlertDialog({
                show: true,
                title,
                message,
                type: 'error',
              })
            }}
          />
        )}

        {/* 设置页面 */}
        {currentView === 'settings' && (
          <SettingsPage
            onSuccess={(message) => {
              setToast({ show: true, message })
            }}
            onError={(title, message) => {
              setAlertDialog({
                show: true,
                title,
                message,
                type: 'error',
              })
            }}
            onDataChanged={loadData}
          />
        )}

        {/* 关于页面 */}
        {currentView === 'about' && <AboutPage />}
      </div>

      {/* Add Provider Modal */}
      <AddProviderModal
        show={showAddModal}
        type={addModalTool}
        onClose={() => setShowAddModal(false)}
        onSubmit={() => {
          setShowAddModal(false)
          loadData()
        }}
        onSuccess={(message) => {
          setToast({ show: true, message })
        }}
      />

      {/* Edit/Clone Provider Modal */}
      {showEditModal && editingProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {isCloneMode ? '克隆' : '编辑'}服务商 -{' '}
              {editingTool === 'claude'
                ? 'Claude'
                : editingTool === 'codex'
                  ? 'Codex'
                  : editingTool === 'gemini'
                    ? 'Gemini'
                    : 'OpenCode'}
            </h2>
            <ProviderForm
              provider={editingProvider}
              isClone={isCloneMode}
              tool={editingTool}
              existingProviders={
                editingTool === 'codex'
                  ? codexProviders
                  : editingTool === 'claude'
                    ? claudeProviders
                    : editingTool === 'gemini'
                      ? geminiProviders
                      : opencodeProviders
              }
              onSubmit={handleEditSubmit}
              onCancel={() => {
                setShowEditModal(false)
                setEditingProvider(undefined)
                setIsCloneMode(false)
              }}
            />
          </div>
        </div>
      )}

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

      {/* Toast */}
      <Toast
        show={toast.show}
        message={toast.message}
        onClose={() => setToast({ show: false, message: '' })}
      />
    </div>
  )
}

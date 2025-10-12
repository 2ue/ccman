/**
 * Desktop Renderer App
 *
 * 按照架构设计方案,分别管理 Codex 和 Claude
 * 不再有混合的 providers 数组
 *
 * 架构:
 * - Codex Providers: 独立管理,使用 window.electronAPI.codex.*
 * - Claude Providers: 独立管理,使用 window.electronAPI.claude.*
 */

import { useState, useEffect } from 'react'
import type { Provider, AddProviderInput, EditProviderInput } from '@ccman/core'
import TabNavigation, { TabType } from './components/TabNavigation'
import HomePage from './components/HomePage'
import ClaudeCodePage from './components/ClaudeCodePage'
import CodexPage from './components/CodexPage'
import ServiceProviderConfigPage from './components/ServiceProviderConfigPage'
import SettingsPage from './components/SettingsPage'
import AboutPage from './components/AboutPage'
import AddProviderModal from './components/AddProviderModal'
import ProviderForm from './components/ProviderForm'
import { ConfirmDialog, AlertDialog } from './components/dialogs'
import Toast from './components/Toast'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home')

  // Codex 数据
  const [codexProviders, setCodexProviders] = useState<Provider[]>([])
  const [currentCodex, setCurrentCodex] = useState<Provider | undefined>()

  // Claude 数据
  const [claudeProviders, setClaudeProviders] = useState<Provider[]>([])
  const [currentClaude, setCurrentClaude] = useState<Provider | undefined>()

  // Modal 状态
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalTool, setAddModalTool] = useState<'codex' | 'claude'>('claude')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | undefined>()
  const [editingTool, setEditingTool] = useState<'codex' | 'claude'>('claude')
  const [isCloneMode, setIsCloneMode] = useState(false)

  // Presets 数量
  const [codexPresetsCount, setCodexPresetsCount] = useState(0)
  const [claudePresetsCount, setClaudePresetsCount] = useState(0)

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
      console.log('window.electronAPI', window.electronAPI);
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
  // 通用操作
  // ============================================================================

  const handleAddProvider = (tool: 'codex' | 'claude') => {
    setAddModalTool(tool)
    setShowAddModal(true)
  }

  const handleEditSubmit = async (input: AddProviderInput | EditProviderInput) => {
    if (!editingProvider) return

    try {
      const api = editingTool === 'codex' ? window.electronAPI.codex : window.electronAPI.claude

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
    <div className="flex flex-col h-screen bg-gray-50">
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 根据 activeTab 渲染不同页面 */}
      {activeTab === 'home' && (
        <HomePage
          claudeProvider={currentClaude}
          codexProvider={currentCodex}
          claudeCount={claudeProviders.length}
          codexCount={codexProviders.length}
          serviceProviderCount={codexPresetsCount + claudePresetsCount}
          onNavigate={setActiveTab}
          onAddClaude={() => handleAddProvider('claude')}
          onAddCodex={() => handleAddProvider('codex')}
        />
      )}

      {activeTab === 'claude' && (
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

      {activeTab === 'codex' && (
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

      {activeTab === 'service-providers' && (
        <ServiceProviderConfigPage
          onUseServiceProvider={() => {
            loadData()
          }}
          onSuccess={(message) => {
            setToast({ show: true, message })
          }}
        />
      )}

      {activeTab === 'settings' && (
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
        />
      )}

      {activeTab === 'about' && <AboutPage />}

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
              {isCloneMode ? '克隆' : '编辑'}服务商 - {editingTool === 'claude' ? 'Claude' : 'Codex'}
            </h2>
            <ProviderForm
              provider={editingProvider}
              isClone={isCloneMode}
              existingProviders={editingTool === 'codex' ? codexProviders : claudeProviders}
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

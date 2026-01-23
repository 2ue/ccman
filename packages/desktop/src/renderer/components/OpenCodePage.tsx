import { useState } from 'react'
import type { Provider } from '@ccman/types'
import ProviderGrid from './ProviderGrid'
import ConfigEditorModal from './ConfigEditorModal'
import { AlertDialog } from './dialogs'
import { Plus, Inbox, FileCode2, Search } from 'lucide-react'
import { BUTTON_WITH_ICON, BUTTON_STYLES } from '../styles/button'

interface OpenCodePageProps {
  providers: Provider[]
  currentProvider?: Provider
  onAdd: () => void
  onSwitch: (id: string) => void
  onEdit: (provider: Provider) => void
  onDelete: (id: string, name: string) => void
  onClone: (provider: Provider) => void
}

export default function OpenCodePage({
  providers,
  currentProvider,
  onAdd,
  onSwitch,
  onEdit,
  onDelete,
  onClone,
}: OpenCodePageProps) {
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [configFiles, setConfigFiles] = useState<
    Array<{ name: string; path: string; content: string; language: 'json' | 'toml' | 'env' }>
  >([])
  const [searchQuery, setSearchQuery] = useState('')

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

  const handleEditConfig = async () => {
    try {
      const files = await window.electronAPI.config.readConfigFiles('opencode')
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
    await window.electronAPI.config.writeConfigFiles(files)
  }

  const filteredProviders = providers.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.baseUrl.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OpenCode 服务商管理</h1>
            <p className="text-sm text-gray-500 mt-1">
              管理 OpenCode 的 API 配置，当前共 {providers.length} 个服务商
              {searchQuery && ` · 搜索结果: ${filteredProviders.length} 个`}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleEditConfig} className={BUTTON_STYLES.icon} title="编辑配置文件">
              <FileCode2 className="w-5 h-5" />
            </button>
            <button onClick={onAdd} className={BUTTON_WITH_ICON.primary}>
              <Plus className="w-4 h-4" />
              添加
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
              placeholder="搜索服务商..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Provider Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Inbox className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">还没有 OpenCode 服务商</p>
            <p className="text-sm text-gray-400 mb-4">
              点击右上角&quot;添加服务商&quot;按钮开始配置
            </p>
            <button onClick={onAdd} className={BUTTON_WITH_ICON.primary}>
              <Plus className="w-4 h-4" />
              添加
            </button>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Inbox className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">没有匹配的服务商</p>
            <p className="text-sm text-gray-400 mb-4">尝试使用其他关键词搜索</p>
          </div>
        ) : (
          <ProviderGrid
            providers={filteredProviders}
            currentProviderId={currentProvider?.id}
            tool="opencode"
            onSwitch={onSwitch}
            onEdit={(provider) => onEdit(provider)}
            onDelete={onDelete}
            onClone={(provider) => onClone(provider)}
          />
        )}
      </div>

      {/* Config Editor Modal */}
      <ConfigEditorModal
        show={showConfigEditor}
        title="编辑 OpenCode 配置"
        files={configFiles}
        onSave={handleSaveConfig}
        onClose={() => setShowConfigEditor(false)}
      />

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

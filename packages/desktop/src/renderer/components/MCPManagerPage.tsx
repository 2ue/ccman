import { useState, useEffect } from 'react'
import type { MCPServer, AppType } from '@ccman/types'
import MCPCard from './MCPCard'
import ConfigEditorModal from './ConfigEditorModal'
import AddMCPModal from './AddMCPModal'
import EditMCPModal from './EditMCPModal'
import CloneMCPModal from './CloneMCPModal'
import { AlertDialog, ConfirmDialog } from './dialogs'
import { Plus, Inbox, Search, Server, FileCode2 } from 'lucide-react'
import { BUTTON_WITH_ICON, BUTTON_STYLES } from '../styles/button'

export default function MCPManagerPage() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [selectedServer, setSelectedServer] = useState<MCPServer | undefined>()
  const [configFiles, setConfigFiles] = useState<
    Array<{ name: string; path: string; content: string; language: 'json' | 'toml' | 'env' }>
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

  // 加载 MCP 列表
  useEffect(() => {
    loadServers()
  }, [])

  const loadServers = async () => {
    try {
      setLoading(true)
      const data = await window.electronAPI.mcp.listServers()
      // 防御性处理: 确保始终为数组,即使后端返回了异常结构也不至于打崩页面
      if (Array.isArray(data)) {
        setServers(data)
      } else {
        console.error('Invalid MCP servers data:', data)
        setServers([])
        setAlertDialog({
          show: true,
          title: '加载失败',
          message: 'MCP 配置格式异常，请检查 ~/.ccman/mcp.json 或通过 CLI 重新生成。',
          type: 'error',
        })
      }
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '加载失败',
        message: (error as Error).message,
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  // 切换应用启用状态
  const handleToggleApp = async (serverId: string, app: AppType, enabled: boolean) => {
    try {
      await window.electronAPI.mcp.toggleApp(serverId, app, enabled)

      // 更新本地状态
      setServers((prev) =>
        prev.map((s) =>
          s.id === serverId
            ? {
                ...s,
                enabledApps: enabled
                  ? [...s.enabledApps, app]
                  : s.enabledApps.filter((a) => a !== app),
              }
            : s
        )
      )

      setAlertDialog({
        show: true,
        title: '操作成功',
        message: `已${enabled ? '启用' : '禁用'} MCP 在该应用上`,
        type: 'success',
      })
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '操作失败',
        message: (error as Error).message,
        type: 'error',
      })
    }
  }

  // 编辑 MCP
  const handleEdit = (server: MCPServer) => {
    setSelectedServer(server)
    setShowEditModal(true)
  }

  // 克隆 MCP
  const handleClone = (server: MCPServer) => {
    setSelectedServer(server)
    setShowCloneModal(true)
  }

  // 删除 MCP
  const handleDelete = (server: MCPServer) => {
    setConfirmDialog({
      show: true,
      title: '确认删除',
      message: `确定要删除 MCP 服务器 "${server.name}" 吗？这将从所有应用中移除此 MCP 配置。`,
      onConfirm: async () => {
        try {
          await window.electronAPI.mcp.removeServer(server.id)
          setServers((prev) => prev.filter((s) => s.id !== server.id))
          setAlertDialog({
            show: true,
            title: '删除成功',
            message: `已删除 MCP: ${server.name}`,
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

  // 添加 MCP
  const handleAdd = () => {
    setShowAddModal(true)
  }

  // 编辑配置文件
  const handleEditConfig = async () => {
    try {
      const files = await window.electronAPI.config.readConfigFiles('mcp')
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

  // 保存配置文件
  const handleSaveConfig = async (
    files: Array<{ name: string; path: string; content: string; language: 'json' | 'toml' | 'env' }>
  ) => {
    try {
      await window.electronAPI.config.writeConfigFiles(files)
      // 重新加载服务器列表
      await loadServers()
      setAlertDialog({
        show: true,
        title: '保存成功',
        message: 'MCP 配置文件已更新',
        type: 'success',
      })
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '保存失败',
        message: (error as Error).message,
        type: 'error',
      })
    }
  }

  // 搜索过滤
  const filteredServers = servers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Server className="w-7 h-7 text-blue-600" />
              MCP 服务器管理
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              管理 Model Context Protocol 服务器，当前共 {servers.length} 个
              {searchQuery && ` · 搜索结果: ${filteredServers.length} 个`}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleEditConfig} className={BUTTON_STYLES.icon} title="编辑配置文件">
              <FileCode2 className="w-5 h-5" />
            </button>
            <button onClick={handleAdd} className={BUTTON_WITH_ICON.primary}>
              <Plus className="w-4 h-4" />
              添加 MCP
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
              placeholder="搜索 MCP 服务器..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* MCP Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Inbox className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">还没有 MCP 服务器</p>
            <p className="text-sm text-gray-400 mb-2">
              MCP (Model Context Protocol) 可以让 AI 工具连接外部服务
            </p>
            <p className="text-xs text-gray-400 mb-4">目前请使用 CLI 命令添加: ccman mcp add</p>
            <button onClick={handleAdd} className={BUTTON_WITH_ICON.primary}>
              <Plus className="w-4 h-4" />
              添加 MCP
            </button>
          </div>
        ) : filteredServers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Inbox className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">没有匹配的 MCP</p>
            <p className="text-sm text-gray-400 mb-4">尝试使用其他关键词搜索</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServers.map((server) => (
              <MCPCard
                key={server.id}
                server={server}
                enabledApps={server.enabledApps}
                onToggleApp={(app, enabled) => handleToggleApp(server.id, app, enabled)}
                onEdit={() => handleEdit(server)}
                onClone={() => handleClone(server)}
                onDelete={() => handleDelete(server)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AlertDialog
        show={alertDialog.show}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
        onClose={() => setAlertDialog({ ...alertDialog, show: false })}
      />

      <ConfirmDialog
        show={confirmDialog.show}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => {
          confirmDialog.onConfirm()
          setConfirmDialog({ ...confirmDialog, show: false })
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, show: false })}
      />

      {/* Config Editor Modal */}
      <ConfigEditorModal
        show={showConfigEditor}
        title="编辑 MCP 配置文件"
        files={configFiles}
        onSave={handleSaveConfig}
        onClose={() => setShowConfigEditor(false)}
      />

      {/* Add MCP Modal */}
      <AddMCPModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={() => loadServers()}
        onSuccess={(message) => {
          setAlertDialog({
            show: true,
            title: '添加成功',
            message,
            type: 'success',
          })
        }}
        existingServers={servers}
      />

      {/* Edit MCP Modal */}
      {selectedServer && (
        <EditMCPModal
          show={showEditModal}
          server={selectedServer}
          onClose={() => {
            setShowEditModal(false)
            setSelectedServer(undefined)
          }}
          onSubmit={() => loadServers()}
          onSuccess={(message) => {
            setAlertDialog({
              show: true,
              title: '编辑成功',
              message,
              type: 'success',
            })
          }}
          existingServers={servers}
        />
      )}

      {/* Clone MCP Modal */}
      {selectedServer && (
        <CloneMCPModal
          show={showCloneModal}
          server={selectedServer}
          onClose={() => {
            setShowCloneModal(false)
            setSelectedServer(undefined)
          }}
          onSuccess={(message) => {
            loadServers()
            setAlertDialog({
              show: true,
              title: '克隆成功',
              message,
              type: 'success',
            })
          }}
          existingServers={servers}
        />
      )}
    </div>
  )
}

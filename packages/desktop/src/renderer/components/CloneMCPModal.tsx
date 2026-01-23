import { useState } from 'react'
import { X, Copy, Server } from 'lucide-react'
import type { MCPServer } from '@ccman/types'
import { AlertDialog } from './dialogs'
import { BUTTON_STYLES } from '../styles/button'

interface Props {
  show: boolean
  server: MCPServer
  onClose: () => void
  onSuccess: (message: string) => void
  existingServers: MCPServer[]
}

export default function CloneMCPModal({
  show,
  server,
  onClose,
  onSuccess,
  existingServers,
}: Props) {
  const [newName, setNewName] = useState(`${server.name} - 副本`)
  const [nameError, setNameError] = useState('')
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

  // 检查名称是否重复
  const checkNameConflict = (inputName: string): boolean => {
    if (!inputName.trim()) return false
    return existingServers.some((s) => s.name === inputName.trim())
  }

  // 处理名称输入变化
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewName(value)

    if (value.trim() && checkNameConflict(value)) {
      setNameError(`MCP 服务器名称已存在: ${value.trim()}`)
    } else {
      setNameError('')
    }
  }

  const handleClone = async () => {
    // 提交前再次检查名称冲突
    if (checkNameConflict(newName)) {
      setNameError(`MCP 服务器名称已存在: ${newName.trim()}`)
      return
    }

    if (!newName.trim()) {
      setNameError('名称不能为空')
      return
    }

    try {
      await window.electronAPI.mcp.cloneServer(server.id, newName.trim())
      onSuccess(`已克隆为: ${newName.trim()}`)
      onClose()
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '克隆失败',
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
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Copy className="w-5 h-5 text-blue-600" />
            克隆 MCP 服务器
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* 源服务器信息 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Server className="w-4 h-4" />
              <span className="font-medium">源服务器</span>
            </div>
            <p className="text-base font-medium text-gray-900">{server.name}</p>
            <code className="text-xs text-gray-600 mt-1 block">
              {server.command} {server.args.join(' ')}
            </code>
          </div>

          {/* 新名称输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              新服务器名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={handleNameChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                nameError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="例如：filesystem - 副本"
              autoFocus
            />
            {nameError && <p className="text-sm text-red-600 mt-1">{nameError}</p>}
          </div>

          {/* 提示信息 */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              克隆将创建一个与源服务器配置完全相同的新服务器，包括命令、参数和环境变量。克隆后的服务器默认不会启用任何应用，需要手动配置。
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            取消
          </button>
          <button onClick={handleClone} className={BUTTON_STYLES.primary} disabled={!!nameError}>
            <Copy className="w-4 h-4" />
            克隆
          </button>
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

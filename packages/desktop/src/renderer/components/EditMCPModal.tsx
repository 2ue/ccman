import { useState } from 'react'
import { X, Server } from 'lucide-react'
import type { MCPServer } from '@ccman/types'
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
  server: MCPServer
  onClose: () => void
  onSubmit: () => void
  onSuccess?: (message: string) => void
  existingServers: MCPServer[]
}

export default function EditMCPModal({
  show,
  server,
  onClose,
  onSubmit,
  onSuccess,
  existingServers,
}: Props) {
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

      // 构造 EditProviderInput
      // 映射：command → baseUrl, args → apiKey (space-separated), env + description → model (JSON)
      const updates = {
        name: formData.name,
        baseUrl: formData.command,
        apiKey: argsArray.join(' '),
        model: JSON.stringify({
          env: envObject,
          description: formData.description,
        }),
      }

      await window.electronAPI.mcp.editServer(server.id, updates)
      onSubmit()
      onClose()
      onSuccess?.('编辑成功')
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '编辑 MCP 失败',
        message: (error as Error).message,
        type: 'error',
      })
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-purple-600" />
            编辑 MCP 服务器
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <MCPForm
            server={server}
            existingServers={existingServers}
            onSubmit={handleMCPSubmit}
            onCancel={onClose}
          />
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

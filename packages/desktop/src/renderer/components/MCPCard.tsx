import { useState } from 'react'
import type { MCPServer, AppType } from '@ccman/types'
import { Server, Edit2, Trash2, Copy, Terminal, Settings } from 'lucide-react'
import { CARD_STYLES } from '../styles/card'

// 应用信息配置
const APP_INFO: Record<
  AppType,
  {
    name: string
    icon: string
    supported: boolean
  }
> = {
  claude: {
    name: 'Claude Code',
    icon: '\ud83e\udd16',
    supported: true,
  },
  codex: {
    name: 'Codex',
    icon: '\ud83d\udce6',
    supported: false, // Codex 暂不支持 MCP
  },
  gemini: {
    name: 'Gemini CLI',
    icon: '\ud83d\udca1',
    supported: true,
  },
}

interface MCPCardProps {
  server: MCPServer
  enabledApps: AppType[]
  onToggleApp: (app: AppType, enabled: boolean) => void
  onEdit: () => void
  onClone: () => void
  onDelete: () => void
}

export default function MCPCard({
  server,
  enabledApps,
  onToggleApp,
  onEdit,
  onClone,
  onDelete,
}: MCPCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const enabledCount = enabledApps.length
  const hasAnyEnabled = enabledCount > 0

  return (
    <div
      className={`${CARD_STYLES.base} ${CARD_STYLES.provider} group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {server.name}
          </h3>
        </div>

        {/* Actions */}
        <div className={`flex gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="编辑"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClone}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="克隆"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Command Info */}
      <div className="mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <Terminal className="w-3.5 h-3.5" />
          <span className="font-medium">启动命令</span>
        </div>
        <code className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded block overflow-x-auto whitespace-nowrap">
          {server.command} {server.args.join(' ')}
        </code>
      </div>

      {/* 环境变量（如果有）*/}
      {server.env && Object.keys(server.env).length > 0 && (
        <div className="mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Settings className="w-3.5 h-3.5" />
            <span className="font-medium">环境变量</span>
          </div>
          <div className="text-xs text-gray-600">
            {Object.keys(server.env).map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-gray-500">{key}:</span>
                <span className="text-gray-700 font-mono">{String(server.env![key])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* App Toggles */}
      <div>
        <div className="text-xs font-medium text-gray-600 mb-3">启用的应用</div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(APP_INFO) as AppType[]).map((app) => {
            const appInfo = APP_INFO[app]
            const isEnabled = enabledApps.includes(app)
            const isSupported = appInfo.supported

            return (
              <label
                key={app}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all cursor-pointer
                  ${
                    !isSupported
                      ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                      : isEnabled
                        ? 'bg-blue-50 border-blue-300 hover:border-blue-400'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  disabled={!isSupported}
                  onChange={(e) => onToggleApp(app, e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-lg">{appInfo.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700 truncate">{appInfo.name}</div>
                  {!isSupported && <div className="text-[10px] text-gray-400">暂不支持</div>}
                </div>
              </label>
            )
          })}
        </div>

        {/* Status */}
        {hasAnyEnabled && (
          <div className="mt-3 text-xs text-blue-600 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            已同步到 {enabledCount} 个应用
          </div>
        )}
      </div>

      {/* Description */}
      {server.description && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">{server.description}</p>
        </div>
      )}
    </div>
  )
}

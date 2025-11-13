import { LucideIcon, ArrowRight, CheckCircle2, AlertCircle, XCircle, Info } from 'lucide-react'

export type StatusType = 'success' | 'warning' | 'error' | 'info'

interface DashboardCardProps {
  icon: LucideIcon
  title: string
  statusLines: string[]
  statusType?: StatusType
  onClick: () => void
}

export default function DashboardCard({
  icon: Icon,
  title,
  statusLines,
  statusType = 'info',
  onClick,
}: DashboardCardProps) {
  const statusColors = {
    success: 'bg-green-50 border-green-200 hover:border-green-300',
    warning: 'bg-yellow-50 border-yellow-200 hover:border-yellow-300',
    error: 'bg-red-50 border-red-200 hover:border-red-300',
    info: 'bg-blue-50 border-blue-200 hover:border-blue-300',
  }

  const statusIcons = {
    success: CheckCircle2,
    warning: AlertCircle,
    error: XCircle,
    info: Info,
  }

  const StatusIcon = statusIcons[statusType]

  return (
    <div
      onClick={onClick}
      className={`
        group relative w-full h-32 rounded-lg border-2 p-4
        ${statusColors[statusType]}
        hover:shadow-lg hover:scale-[1.02]
        transition-all duration-200 cursor-pointer
      `}
    >
      {/* 状态角标 */}
      <div className="absolute top-3 right-3">
        <StatusIcon className="w-4 h-4 text-gray-600" />
      </div>

      {/* 图标 + 标题 */}
      <div className="flex items-center gap-2.5 mb-3">
        <Icon className="w-9 h-9 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      {/* 状态信息 */}
      <div className="space-y-0.5 mb-3">
        {statusLines.map((line, i) => (
          <p key={i} className="text-xs text-gray-600">
            {line}
          </p>
        ))}
      </div>

      {/* 进入按钮（Hover 显示） */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
          进入 <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  )
}

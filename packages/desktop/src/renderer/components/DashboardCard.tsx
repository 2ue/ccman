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
        group relative w-full h-40 rounded-xl border-2 p-6
        ${statusColors[statusType]}
        hover:shadow-lg hover:scale-[1.02]
        transition-all duration-200 cursor-pointer
      `}
    >
      {/* 状态角标 */}
      <div className="absolute top-4 right-4">
        <StatusIcon className="w-5 h-5 text-gray-600" />
      </div>

      {/* 图标 + 标题 */}
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-12 h-12 text-gray-700" />
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      </div>

      {/* 状态信息 */}
      <div className="space-y-1 mb-4">
        {statusLines.map((line, i) => (
          <p key={i} className="text-sm text-gray-600">
            {line}
          </p>
        ))}
      </div>

      {/* 进入按钮（Hover 显示） */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-sm font-medium text-blue-600 flex items-center gap-1">
          进入 <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  )
}

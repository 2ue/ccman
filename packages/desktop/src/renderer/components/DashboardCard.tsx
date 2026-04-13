import { LucideIcon } from 'lucide-react'

export type StatusType = 'success' | 'warning' | 'error' | 'info'

interface DashboardCardProps {
  icon: LucideIcon | React.ElementType
  title: string
  statusLines: string[]
  statusType?: StatusType
  onClick: () => void
  isBrandIcon?: boolean
}

export default function DashboardCard({
  icon: Icon,
  title,
  statusLines,
  statusType = 'info',
  onClick,
  isBrandIcon = false,
}: DashboardCardProps) {
  const dotColors = {
    success: 'bg-green-400',
    warning: 'bg-yellow-400',
    error: 'bg-red-400',
    info: 'bg-blue-400',
  }

  return (
    <div
      onClick={onClick}
      className={`
        group relative w-full rounded-xl border border-gray-200 p-5
        bg-white
        hover:shadow-lg hover:border-blue-300 hover:-translate-y-0.5
        transition-all duration-200 cursor-pointer
      `}
    >
      {/* 图标 + 标题 */}
      <div className="flex items-center gap-3 mb-3">
        {isBrandIcon ? (
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-50">
            <Icon size={28} />
          </div>
        ) : (
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-100/60">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h3>
          <span className={`w-2 h-2 rounded-full ${dotColors[statusType]}`} />
        </div>
      </div>

      {/* 状态信息 */}
      <div className="space-y-0.5 mb-3">
        {statusLines.map((line, i) => (
          <p key={i} className="text-xs text-gray-600">
            {line}
          </p>
        ))}
      </div>

      {/* 进入链接（始终可见） */}
      <div className="flex justify-end">
        <span className="text-xs font-medium text-blue-500">进入 →</span>
      </div>
    </div>
  )
}

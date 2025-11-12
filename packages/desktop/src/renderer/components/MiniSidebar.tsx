import * as Tooltip from '@radix-ui/react-tooltip'
import { Home, Sparkles, Terminal, Server, Package, Trash2, Settings, Info } from 'lucide-react'
import type { NavKey } from './DashboardPage'

interface MiniSidebarProps {
  activeKey: NavKey
  onNavigate: (key: NavKey) => void
}

interface NavItem {
  key: NavKey
  icon: React.ElementType
  label: string
}

interface NavDivider {
  type: 'divider'
}

interface NavSpacer {
  type: 'spacer'
}

type NavElement = NavItem | NavDivider | NavSpacer

export default function MiniSidebar({ activeKey, onNavigate }: MiniSidebarProps) {
  const items: NavElement[] = [
    { key: 'home', icon: Home, label: '返回首页' },
    { type: 'divider' },
    { key: 'claude', icon: Sparkles, label: 'Claude Code' },
    { key: 'codex', icon: Terminal, label: 'Codex' },
    { key: 'mcp', icon: Server, label: 'MCP 服务器' },
    { key: 'service-providers', icon: Package, label: '预置服务商' },
    { key: 'clean', icon: Trash2, label: '清理工具' },
    { type: 'spacer' },
    { key: 'settings', icon: Settings, label: '设置' },
    { key: 'about', icon: Info, label: '关于' },
  ]

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="w-[60px] bg-gray-900 flex flex-col items-center py-3 border-r border-gray-800">
        {items.map((item, index) => {
          // 分隔线
          if ('type' in item && item.type === 'divider') {
            return <div key={`divider-${index}`} className="w-8 h-px bg-gray-700 my-2" />
          }

          // 弹性空间
          if ('type' in item && item.type === 'spacer') {
            return <div key={`spacer-${index}`} className="flex-1" />
          }

          // 导航项
          const navItem = item as NavItem
          const Icon = navItem.icon
          const isActive = activeKey === navItem.key

          return (
            <Tooltip.Root key={navItem.key}>
              <Tooltip.Trigger asChild>
                <button
                  onClick={() => onNavigate(navItem.key)}
                  className={`
                    w-12 h-12 flex items-center justify-center rounded-lg
                    transition-all duration-200 mb-1
                    ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-6 h-6" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="right"
                  sideOffset={8}
                  className="bg-gray-800 text-white px-3 py-1.5 rounded-md text-sm shadow-lg z-50"
                >
                  {navItem.label}
                  <Tooltip.Arrow className="fill-gray-800" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )
        })}
      </div>
    </Tooltip.Provider>
  )
}

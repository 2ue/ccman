import * as Tooltip from '@radix-ui/react-tooltip'
import { Home, Bot, Code2, Server, Package, Trash2, Settings, Info } from 'lucide-react'
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
    { key: 'claude', icon: Bot, label: 'Claude Code' },
    { key: 'codex', icon: Code2, label: 'Codex' },
    { key: 'gemini', icon: Code2, label: 'Gemini CLI' },
    { key: 'mcp', icon: Server, label: 'MCP 服务器' },
    { key: 'service-providers', icon: Package, label: '预置服务商' },
    { key: 'clean', icon: Trash2, label: '清理工具' },
    { type: 'spacer' },
    { key: 'settings', icon: Settings, label: '设置' },
    { key: 'about', icon: Info, label: '关于' },
  ]

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="w-[60px] bg-white flex flex-col items-center py-3 border-r border-gray-200">
        {items.map((item, index) => {
          // 分隔线
          if ('type' in item && item.type === 'divider') {
            return <div key={`divider-${index}`} className="w-8 h-px bg-gray-200 my-2" />
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
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
                  className="bg-gray-900 text-white px-3 py-1.5 rounded-md text-sm shadow-lg z-50"
                >
                  {navItem.label}
                  <Tooltip.Arrow className="fill-gray-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )
        })}
      </div>
    </Tooltip.Provider>
  )
}

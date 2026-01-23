export type TabType =
  | 'home'
  | 'claude'
  | 'codex'
  | 'gemini'
  | 'opencode'
  | 'mcp'
  | 'service-providers'
  | 'clean'
  | 'settings'
  | 'about'

interface TabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: { key: TabType; label: string }[] = [
    { key: 'home', label: 'CCMAN' },
    { key: 'claude', label: 'Claude Code' },
    { key: 'codex', label: 'Codex' },
    { key: 'gemini', label: 'Gemini CLI' },
    { key: 'opencode', label: 'OpenCode' },
    { key: 'mcp', label: 'MCP 服务器' },
    { key: 'service-providers', label: '预置服务商' },
    { key: 'clean', label: '清理工具' },
    { key: 'settings', label: '设置' },
    { key: 'about', label: '关于' },
  ]

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex space-x-8 px-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

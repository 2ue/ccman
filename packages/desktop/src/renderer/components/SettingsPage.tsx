/**
 * 设置页面 - 响应式布局
 * 移动端：顶部标签页
 * 桌面端：侧边栏导航
 */

import { useState } from 'react'
import { Cloud, HardDrive, Menu, X } from 'lucide-react'
import WebDAVSyncSection from './settings/WebDAVSyncSection'
import BackupSection from './settings/BackupSection'

interface SettingsPageProps {
  onSuccess: (message: string) => void
  onError: (title: string, message: string) => void
}

type SettingSection = 'sync' | 'backup'

export default function SettingsPage({ onSuccess, onError }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingSection>('sync')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const sections = [
    {
      id: 'sync' as const,
      name: '云同步',
      icon: Cloud,
      description: 'WebDAV 智能同步',
    },
    {
      id: 'backup' as const,
      name: '本地备份',
      icon: HardDrive,
      description: '导入/导出配置',
    },
  ]

  const handleSectionChange = (section: SettingSection) => {
    setActiveSection(section)
    setMobileMenuOpen(false)
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-50">
      {/* 移动端顶部标题栏 */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">设置</h2>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="切换菜单"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5 text-gray-600" />
          ) : (
            <Menu className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200">
          <nav className="px-3 py-2 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                    ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${isActive ? 'font-medium' : ''}`}>{section.name}</div>
                    <div className="text-xs text-gray-500 truncate">{section.description}</div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>
      )}

      {/* 桌面端侧边栏 */}
      <aside className="hidden md:block w-48 lg:w-56 bg-white border-r border-gray-200 py-6 flex-shrink-0">
        <div className="px-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">设置</h2>
        </div>
        <nav className="space-y-1 px-3">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                  ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${isActive ? 'font-medium' : ''}`}>{section.name}</div>
                  <div className="text-xs text-gray-500 truncate">{section.description}</div>
                </div>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex items-start justify-center p-4 md:p-6 lg:p-8">
          <div className="w-full max-w-4xl">
            {activeSection === 'sync' && <WebDAVSyncSection onSuccess={onSuccess} onError={onError} />}
            {activeSection === 'backup' && <BackupSection onSuccess={onSuccess} onError={onError} />}
          </div>
        </div>
      </main>
    </div>
  )
}

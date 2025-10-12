/**
 * 设置页面 - 侧边栏导航布局
 */

import { useState } from 'react'
import { Cloud, HardDrive } from 'lucide-react'
import WebDAVSyncSection from './settings/WebDAVSyncSection'
import BackupSection from './settings/BackupSection'

interface SettingsPageProps {
  onSuccess: (message: string) => void
  onError: (title: string, message: string) => void
}

type SettingSection = 'sync' | 'backup'

export default function SettingsPage({ onSuccess, onError }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingSection>('sync')

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

  return (
    <div className="flex h-full bg-gray-50">
      {/* 侧边栏 */}
      <aside className="w-56 bg-white border-r border-gray-200 py-6">
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
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
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
      <main className="flex-1 overflow-auto p-8">
        {activeSection === 'sync' && <WebDAVSyncSection onSuccess={onSuccess} onError={onError} />}
        {activeSection === 'backup' && <BackupSection onSuccess={onSuccess} onError={onError} />}
      </main>
    </div>
  )
}

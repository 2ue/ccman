import { Provider } from '@ccman/core'
import { Sparkles, Terminal, Server, Package, Trash2, Settings, Target } from 'lucide-react'
import DashboardCard from './DashboardCard'

export type NavKey =
  | 'home'
  | 'claude'
  | 'codex'
  | 'mcp'
  | 'service-providers'
  | 'clean'
  | 'settings'
  | 'about'

interface ToolData {
  providers: Provider[]
  current?: Provider
  presetsCount: number
}

interface DashboardPageProps {
  claudeData: ToolData
  codexData: ToolData
  onEnterPage: (key: NavKey) => void
}

export default function DashboardPage({
  claudeData,
  codexData,
  onEnterPage,
}: DashboardPageProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-[880px] mx-auto p-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Target className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">ccman</h1>
          </div>
          <p className="text-xl text-gray-600">AI 服务商配置管理工具</p>
          <p className="text-sm text-gray-500 mt-2">
            统一管理 Claude Code 和 Codex 的 API 配置，快速切换服务商
          </p>
        </div>

        {/* 卡片网格 */}
        <div className="grid grid-cols-2 gap-6">
          {/* Claude Code */}
          <DashboardCard
            icon={Sparkles}
            title="Claude Code"
            statusLines={[
              claudeData.current ? `✅ ${claudeData.current.name}` : '⚠️ 未配置',
              `${claudeData.providers.length} 个服务商`,
            ]}
            statusType={claudeData.current ? 'success' : 'warning'}
            onClick={() => onEnterPage('claude')}
          />

          {/* Codex */}
          <DashboardCard
            icon={Terminal}
            title="Codex"
            statusLines={[
              codexData.current ? `✅ ${codexData.current.name}` : '⚠️ 未配置',
              `${codexData.providers.length} 个服务商`,
            ]}
            statusType={codexData.current ? 'success' : 'warning'}
            onClick={() => onEnterPage('codex')}
          />

          {/* MCP 服务器 */}
          <DashboardCard
            icon={Server}
            title="MCP 服务器"
            statusLines={['Model Context Protocol', '管理 MCP 配置']}
            statusType="info"
            onClick={() => onEnterPage('mcp')}
          />

          {/* 预置服务商 */}
          <DashboardCard
            icon={Package}
            title="预置服务商"
            statusLines={[
              `${claudeData.presetsCount + codexData.presetsCount} 个模板`,
              '快速添加服务商',
            ]}
            statusType="info"
            onClick={() => onEnterPage('service-providers')}
          />

          {/* 清理工具 */}
          <DashboardCard
            icon={Trash2}
            title="清理工具"
            statusLines={['Claude Code 历史数据', '释放存储空间']}
            statusType="info"
            onClick={() => onEnterPage('clean')}
          />

          {/* 设置 & 关于 */}
          <DashboardCard
            icon={Settings}
            title="设置 & 关于"
            statusLines={['全局配置', '应用信息']}
            statusType="info"
            onClick={() => onEnterPage('settings')}
          />
        </div>
      </div>
    </div>
  )
}

import { Provider } from '@ccman/core'
import { Server, Package, Trash2, Settings, Target } from 'lucide-react'
import { ClaudeIcon, OpenAIIcon, GeminiIcon } from './icons/BrandIcons'
import DashboardCard from './DashboardCard'

export type NavKey =
  | 'home'
  | 'claude'
  | 'codex'
  | 'gemini'
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
  geminiData: ToolData
  onEnterPage: (key: NavKey) => void
}

export default function DashboardPage({
  claudeData,
  codexData,
  geminiData,
  onEnterPage,
}: DashboardPageProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="max-w-[880px] mx-auto p-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Target className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">ccman</h1>
          </div>
          <p className="text-xl text-gray-600">AI 代码助手配置管理工具</p>
          <p className="text-sm text-gray-500 mt-2">
            统一管理多个 AI 代码工具的 API 配置，快速切换服务商
          </p>
        </div>

        {/* AI 代码助手区域 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider px-3">
              AI 代码助手
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          </div>
          {/* 响应式网格：2个工具显示2列，3+个工具显示3列，自动换行 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Claude Code */}
            <DashboardCard
              icon={ClaudeIcon}
              title="Claude Code"
              statusLines={[
                claudeData.current ? `已配置：${claudeData.current.name}` : '未配置',
                `${claudeData.providers.length} 个服务商`,
              ]}
              statusType={claudeData.current ? 'success' : 'warning'}
              onClick={() => onEnterPage('claude')}
              isBrandIcon
            />

            {/* Codex */}
            <DashboardCard
              icon={OpenAIIcon}
              title="Codex"
              statusLines={[
                codexData.current ? `已配置：${codexData.current.name}` : '未配置',
                `${codexData.providers.length} 个服务商`,
              ]}
              statusType={codexData.current ? 'success' : 'warning'}
              onClick={() => onEnterPage('codex')}
              isBrandIcon
            />

            {/* Gemini CLI */}
            <DashboardCard
              icon={GeminiIcon}
              title="Gemini CLI"
              statusLines={[
                geminiData.current ? `已配置：${geminiData.current.name}` : '未配置',
                `${geminiData.providers.length} 个服务商`,
              ]}
              statusType={geminiData.current ? 'success' : 'warning'}
              onClick={() => onEnterPage('gemini')}
              isBrandIcon
            />
          </div>
        </div>

        {/* 配置与工具区域 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider px-3">
              配置与工具
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          </div>
          {/* 响应式网格：自动适应卡片数量 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* MCP 服务器 */}
            <DashboardCard
              icon={Server}
              title="MCP 服务器"
              statusLines={['Model Context Protocol', '扩展 AI 工具能力']}
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
    </div>
  )
}

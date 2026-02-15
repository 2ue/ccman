/**
 * @ccman/types
 *
 * 通用 TypeScript 类型定义,不依赖 Node.js 环境,
 * 可在 Desktop 渲染进程等浏览器环境中安全使用。
 */

// ---------------------------------------------------------------------------
// 工具类型
// ---------------------------------------------------------------------------

export type ToolType = 'codex' | 'claude' | 'mcp' | 'gemini' | 'opencode' | 'openclaw'

export type MainToolType = 'codex' | 'claude' | 'gemini' | 'openclaw'

// 和 @ccman/core 中 constants.ts 的结构保持一致,但不引入任何 Node 依赖
export const TOOL_TYPES = {
  CODEX: 'codex',
  CLAUDE: 'claude',
  MCP: 'mcp',
  GEMINI: 'gemini',
  OPENCODE: 'opencode',
  OPENCLAW: 'openclaw',
} as const

export const MAIN_TOOL_TYPES = {
  CODEX: TOOL_TYPES.CODEX,
  CLAUDE: TOOL_TYPES.CLAUDE,
  GEMINI: TOOL_TYPES.GEMINI,
  OPENCLAW: TOOL_TYPES.OPENCLAW,
} as const

export const TOOL_CONFIG = {
  [TOOL_TYPES.CODEX]: {
    displayName: 'Codex',
    color: 'blue',
    textColorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-50',
    hoverBgColorClass: 'hover:bg-blue-100',
    description: 'Codex AI 助手'
  },
  [TOOL_TYPES.CLAUDE]: {
    displayName: 'Claude Code',
    color: 'purple',
    textColorClass: 'text-purple-600',
    bgColorClass: 'bg-purple-50',
    hoverBgColorClass: 'hover:bg-purple-100',
    description: 'Claude Code AI 助手'
  },
  [TOOL_TYPES.MCP]: {
    displayName: 'MCP',
    color: 'gray',
    textColorClass: 'text-gray-600',
    bgColorClass: 'bg-gray-50',
    hoverBgColorClass: 'hover:bg-gray-100',
    description: 'MCP 服务'
  },
  [TOOL_TYPES.GEMINI]: {
    displayName: 'Gemini CLI',
    color: 'green',
    textColorClass: 'text-green-600',
    bgColorClass: 'bg-green-50',
    hoverBgColorClass: 'hover:bg-green-100',
    description: 'Gemini CLI AI 助手'
  },
  [TOOL_TYPES.OPENCODE]: {
    displayName: 'OpenCode',
    color: 'amber',
    textColorClass: 'text-amber-600',
    bgColorClass: 'bg-amber-50',
    hoverBgColorClass: 'hover:bg-amber-100',
    description: 'OpenCode 配置'
  },
  [TOOL_TYPES.OPENCLAW]: {
    displayName: 'OpenClaw',
    color: 'teal',
    textColorClass: 'text-teal-600',
    bgColorClass: 'bg-teal-50',
    hoverBgColorClass: 'hover:bg-teal-100',
    description: 'OpenClaw 配置'
  }
} as const

// ---------------------------------------------------------------------------
// Provider / Preset 相关类型
// 来源: packages/core/src/tool-manager.types.ts
// ---------------------------------------------------------------------------

export interface Provider {
  /** 唯一标识符(自动生成) */
  id: string
  /** 显示名称 */
  name: string
  /** 描述(可选,用于 UI 展示) */
  desc?: string
  /** API Base URL */
  baseUrl: string
  /** API Key */
  apiKey: string
  /** 模型名称(可选,仅 Codex 使用) */
  model?: string
  /** 创建时间(Unix timestamp) */
  createdAt: number
  /** 最后修改时间(Unix timestamp) */
  lastModified: number
  /** 最后使用时间(Unix timestamp,可选) */
  lastUsedAt?: number
}

export interface PresetTemplate {
  /** 预设名称 */
  name: string
  /** 默认 Base URL */
  baseUrl: string
  /** 描述 */
  description: string
  /** 是否为内置预设 */
  isBuiltIn: boolean
}

export interface AddProviderInput {
  name: string
  desc?: string
  baseUrl: string
  apiKey: string
  model?: string // 可选,仅 Codex 使用
}

export interface EditProviderInput {
  name?: string
  desc?: string
  baseUrl?: string
  apiKey?: string
  model?: string // 可选,仅 Codex 使用
}

export interface AddPresetInput {
  name: string
  baseUrl: string
  description: string
}

export interface EditPresetInput {
  name?: string
  baseUrl?: string
  description?: string
}

// ---------------------------------------------------------------------------
// MCP 相关类型
// 来源: packages/core/src/writers/mcp.ts
// ---------------------------------------------------------------------------

export type AppType = 'claude' | 'codex' | 'gemini'

export interface MCPServer {
  id: string
  name: string
  command: string
  args: string[]
  env?: Record<string, string | number>
  description?: string
  createdAt: number
  lastModified: number
  enabledApps: AppType[]
}

export interface MCPConfig {
  servers: MCPServer[]
  managedServerNames: Record<AppType, string[]>
}

// ---------------------------------------------------------------------------
// WebDAV 同步相关类型
// 来源: packages/core/src/sync/types.ts
// ---------------------------------------------------------------------------

export type WebDAVAuthType = 'password' | 'digest'

export interface SyncConfig {
  webdavUrl: string
  username: string
  password: string
  authType?: WebDAVAuthType
  remoteDir?: string
  syncPassword?: string
}

// ---------------------------------------------------------------------------
// Claude Clean (~/.claude.json) 相关类型
// 来源: packages/core/src/claude-clean.ts
// ---------------------------------------------------------------------------

export interface CleanOptions {
  cleanProjectHistory?: boolean
  keepRecentCount?: number
  projectPaths?: string[]
  cleanCache?: boolean
  cleanStats?: boolean
}

export interface CleanResult {
  sizeBefore: number
  sizeAfter: number
  saved: number
  cleanedItems: {
    projectHistory: number
    cache: boolean
    stats: boolean
  }
  backupPath: string
}

export interface AnalyzeResult {
  fileSize: number
  fileSizeFormatted: string
  projectCount: number
  totalHistoryCount: number
  projectHistory: Array<{
    path: string
    count: number
  }>
  cacheSize: number
  estimatedSavings: {
    conservative: number
    moderate: number
    aggressive: number
  }
}

export interface ProjectDetail {
  path: string
  historyCount: number
  estimatedSize: number
  lastMessage?: string
}

export interface CacheDetail {
  key: string
  name: string
  size: number
  sizeFormatted: string
  lastUpdated?: number
}

export interface HistoryEntry {
  display: string
  pastedContents: Record<string, any>
}

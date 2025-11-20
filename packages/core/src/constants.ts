/**
 * 全局常量定义
 *
 * 这个文件定义了项目中所有工具类型的常量，确保类型安全和一致性。
 * 使用常量而不是硬编码字符串可以：
 * 1. 避免拼写错误
 * 2. 提供更好的 IDE 自动完成
 * 3. 便于重构和维护
 */

/**
 * 工具类型常量对象
 * 使用 as const 确保类型推导为字面量类型而不是 string
 */
export const TOOL_TYPES = {
  CODEX: 'codex',
  CLAUDE: 'claude',
  MCP: 'mcp',
  GEMINI: 'gemini',
} as const

/**
 * 工具类型联合类型
 * 从 TOOL_TYPES 对象推导而来，确保类型和值的一致性
 */
export type ToolType = typeof TOOL_TYPES[keyof typeof TOOL_TYPES]

/**
 * 主要工具类型（排除 MCP）
 * 用于只支持 Codex、Claude、Gemini 的场景
 */
export const MAIN_TOOL_TYPES = {
  CODEX: TOOL_TYPES.CODEX,
  CLAUDE: TOOL_TYPES.CLAUDE,
  GEMINI: TOOL_TYPES.GEMINI,
} as const

export type MainToolType = typeof MAIN_TOOL_TYPES[keyof typeof MAIN_TOOL_TYPES]

/**
 * 工具配置对象
 * 集中管理每个工具的元数据，避免在代码中重复定义
 */
export const TOOL_CONFIG = {
  [TOOL_TYPES.CODEX]: {
    displayName: 'Codex',
    color: 'blue',
    textColorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-50',
    hoverBgColorClass: 'hover:bg-blue-100',
    description: 'Codex AI 助手',
  },
  [TOOL_TYPES.CLAUDE]: {
    displayName: 'Claude Code',
    color: 'purple',
    textColorClass: 'text-purple-600',
    bgColorClass: 'bg-purple-50',
    hoverBgColorClass: 'hover:bg-purple-100',
    description: 'Claude Code AI 助手',
  },
  [TOOL_TYPES.MCP]: {
    displayName: 'MCP',
    color: 'gray',
    textColorClass: 'text-gray-600',
    bgColorClass: 'bg-gray-50',
    hoverBgColorClass: 'hover:bg-gray-100',
    description: 'MCP 服务',
  },
  [TOOL_TYPES.GEMINI]: {
    displayName: 'Gemini CLI',
    color: 'green',
    textColorClass: 'text-green-600',
    bgColorClass: 'bg-green-50',
    hoverBgColorClass: 'hover:bg-green-100',
    description: 'Gemini CLI AI 助手',
  },
} as const

/**
 * 获取工具配置的辅助函数
 * @param toolType 工具类型
 * @returns 工具配置对象
 */
export function getToolConfig(toolType: ToolType) {
  return TOOL_CONFIG[toolType]
}

/**
 * 检查是否为有效的工具类型
 * @param value 要检查的值
 * @returns 是否为有效的工具类型
 */
export function isValidToolType(value: unknown): value is ToolType {
  return Object.values(TOOL_TYPES).includes(value as ToolType)
}

/**
 * 检查是否为主要工具类型（排除 MCP）
 * @param value 要检查的值
 * @returns 是否为主要工具类型
 */
export function isMainToolType(value: unknown): value is MainToolType {
  return Object.values(MAIN_TOOL_TYPES).includes(value as MainToolType)
}

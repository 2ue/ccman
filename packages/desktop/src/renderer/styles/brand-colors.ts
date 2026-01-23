/**
 * 品牌色配置
 *
 * 基于各个 AI 工具的官方品牌色：
 * - Claude (Anthropic): 橙棕色 #CC785C
 * - Codex (OpenAI): 青绿色 #10A37F
 * - Gemini (Google): 蓝色 #4285F4
 * - OpenCode: 蓝色 #007ACC (VS Code)
 */

type ToolType = 'claude' | 'codex' | 'gemini' | 'opencode'

/**
 * 品牌色样式类名映射
 */
export const BRAND_COLORS = {
  claude: {
    // 按钮
    button: 'bg-orange-600 hover:bg-orange-700',
    buttonText: 'text-white',
    // 文字
    text: 'text-orange-600',
    textDark: 'text-orange-700',
    // 背景
    bgLight: 'bg-orange-50',
    bgMedium: 'bg-orange-100',
    // 边框/焦点
    border: 'border-orange-600',
    ring: 'ring-orange-500',
    focus: 'focus:ring-orange-500',
  },
  codex: {
    button: 'bg-emerald-600 hover:bg-emerald-700',
    buttonText: 'text-white',
    text: 'text-emerald-600',
    textDark: 'text-emerald-700',
    bgLight: 'bg-emerald-50',
    bgMedium: 'bg-emerald-100',
    border: 'border-emerald-600',
    ring: 'ring-emerald-500',
    focus: 'focus:ring-emerald-500',
  },
  gemini: {
    button: 'bg-blue-600 hover:bg-blue-700',
    buttonText: 'text-white',
    text: 'text-blue-600',
    textDark: 'text-blue-700',
    bgLight: 'bg-blue-50',
    bgMedium: 'bg-blue-100',
    border: 'border-blue-600',
    ring: 'ring-blue-500',
    focus: 'focus:ring-blue-500',
  },
  opencode: {
    button: 'bg-blue-600 hover:bg-blue-700',
    buttonText: 'text-white',
    text: 'text-blue-600',
    textDark: 'text-blue-700',
    bgLight: 'bg-blue-50',
    bgMedium: 'bg-blue-100',
    border: 'border-blue-600',
    ring: 'ring-blue-500',
    focus: 'focus:ring-blue-500',
  },
} as const

/**
 * 生成带品牌色的按钮样式
 */
export function getBrandButton(tool: ToolType) {
  const colors = BRAND_COLORS[tool]
  return `px-4 py-2 ${colors.button} ${colors.buttonText} rounded-lg transition-colors text-sm font-medium`
}

/**
 * 生成带品牌色和图标的按钮样式
 */
export function getBrandButtonWithIcon(tool: ToolType) {
  return `${getBrandButton(tool)} flex items-center gap-2`
}

/**
 * 生成带品牌色的输入框焦点样式
 */
export function getBrandInputFocus(tool: ToolType) {
  const colors = BRAND_COLORS[tool]
  return `focus:outline-none focus:ring-2 ${colors.focus}`
}

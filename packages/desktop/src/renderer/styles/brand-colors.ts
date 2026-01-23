/**
 * 品牌色配置
 *
 * 统一使用主题色：蓝色 #4285F4
 */

type ToolType = 'claude' | 'codex' | 'gemini' | 'opencode'

/**
 * 统一的主题色样式类名
 */
const THEME_COLORS = {
  // 按钮
  button: 'bg-blue-600 hover:bg-blue-700',
  buttonText: 'text-white',
  // 文字
  text: 'text-blue-600',
  textDark: 'text-blue-700',
  // 背景
  bgLight: 'bg-blue-50',
  bgMedium: 'bg-blue-100',
  // 边框/焦点
  border: 'border-blue-600',
  ring: 'ring-blue-500',
  focus: 'focus:ring-blue-500',
} as const

/**
 * 品牌色样式类名映射（所有工具统一使用主题色）
 */
export const BRAND_COLORS = {
  claude: THEME_COLORS,
  codex: THEME_COLORS,
  gemini: THEME_COLORS,
  opencode: THEME_COLORS,
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

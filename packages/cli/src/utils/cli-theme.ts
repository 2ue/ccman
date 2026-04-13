import chalk from 'chalk'

// 每个工具的 chalk 颜色函数
const TOOL_COLORS: Record<string, chalk.Chalk> = {
  codex: chalk.hex('#10A37F'), // OpenAI 绿
  claude: chalk.hex('#D97706'), // Anthropic 橙
  gemini: chalk.hex('#4285F4'), // Google 蓝
  opencode: chalk.hex('#FF6B35'), // 活力橙
  openclaw: chalk.hex('#E74C3C'), // 红色
  mcp: chalk.hex('#9B59B6'), // 紫色
}

// 工具缩写标签
const TOOL_LABELS: Record<string, string> = {
  codex: 'CX',
  claude: 'CC',
  gemini: 'GM',
  opencode: 'OC',
  openclaw: 'OW',
  mcp: 'MCP',
}

// 工具显示名
const TOOL_NAMES: Record<string, string> = {
  codex: 'Codex',
  claude: 'Claude Code',
  gemini: 'Gemini CLI',
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
  mcp: 'MCP',
}

/** 返回工具对应的 chalk 颜色函数 */
export function toolColor(tool: string): chalk.Chalk {
  return TOOL_COLORS[tool] || chalk.blue
}

/** 返回彩色工具缩写标签，如 [CC] */
export function toolBadge(tool: string): string {
  const color = TOOL_COLORS[tool] || chalk.blue
  const label = TOOL_LABELS[tool] || tool.toUpperCase()
  return color.bold(`[${label}]`)
}

/** 返回工具全名 */
export function toolName(tool: string): string {
  return TOOL_NAMES[tool] || tool
}

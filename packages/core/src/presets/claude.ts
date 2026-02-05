/**
 * Claude Code 预设模板(不包含 API Key 和 isBuiltIn)
 * isBuiltIn 字段由 tool-manager 在运行时添加
 */
export interface PresetTemplate {
  /** 预设名称 */
  name: string
  /** 默认 Base URL */
  baseUrl: string
  /** 描述 */
  description: string
}

/**
 * Claude Code 内置预设列表
 */
export const CC_PRESETS: PresetTemplate[] = [
  {
    name: 'Anthropic Official',
    baseUrl: 'https://api.anthropic.com',
    description: 'Anthropic 官方 API',
  },
  {
    name: 'GMN',
    baseUrl: 'https://gmn.chuangzuoli.com/api',
    description: 'GMN 服务 (Claude 兼容)',
  },
]

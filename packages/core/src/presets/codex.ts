/**
 * Codex 预设模板(不包含 API Key 和 isBuiltIn)
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
 * Codex 内置预设列表
 */
export const CODEX_PRESETS: PresetTemplate[] = [
  {
    name: 'OpenAI Official',
    baseUrl: 'https://api.openai.com/v1',
    description: 'OpenAI 官方 API',
  },
  {
    name: 'GMN',
    baseUrl: 'https://gmn.chuangzuoli.cn/openai',
    description: 'GMN 服务 (OpenAI/Codex 兼容)',
  },
  {
    name: 'GMN (COM)',
    baseUrl: 'https://gmn.chuangzuoli.com',
    description: 'GMN 服务 (OpenAI/Codex 兼容)',
  },
]

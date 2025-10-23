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
    name: '88Code',
    baseUrl: 'https://www.88code.org/openai/v1',
    description: '88Code API 服务',
  }
]

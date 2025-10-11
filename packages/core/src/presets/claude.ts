/**
 * Claude Code 预设模板(不包含 API Key)
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
    name: 'AnyRouter',
    baseUrl: 'https://anyrouter.top',
    description: 'AnyRouter API 服务',
  },
  {
    name: 'PackyCode',
    baseUrl: 'https://api.packycode.com',
    description: 'PackyCode API 服务',
  },
  {
    name: 'CoordCode',
    baseUrl: 'https://api.coordcode.com/api',
    description: 'CoordCode API 服务',
  },
  {
    name: '88Code',
    baseUrl: 'https://www.88code.org/api',
    description: '88Code API 服务',
  },
  {
    name: 'KKYYXX',
    baseUrl: 'https://api.kkyyxx.xyz',
    description: 'KKYYXX API 服务',
  },
  {
    name: 'BigModel',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    description: '智谱 BigModel API',
  },
  {
    name: 'ModelScope',
    baseUrl: 'https://api-inference.modelscope.cn/v1/chat/completions',
    description: '阿里云 ModelScope API',
  },
]

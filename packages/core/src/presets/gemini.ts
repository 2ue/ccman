import type { InternalPresetTemplate } from '../tool-manager.types.js'

/**
 * Gemini CLI 预置服务商
 *
 * 注意：
 * - Gemini 官方使用环境变量 + settings.json 管理配置
 * - 这里的 baseUrl / apiKey 只是模板，真正写入由 writers/gemini.ts 决定
 */

export const GEMINI_PRESETS: InternalPresetTemplate[] = [
  {
    name: 'Google Gemini (API Key)',
    baseUrl: '',
    description: '使用官方 Gemini API（通过 GEMINI_API_KEY 或 GOOGLE_API_KEY 认证）',
  },
  {
    name: 'GMN',
    baseUrl: 'https://gmn.chuangzuoli.cn/openai',
    description: 'GMN 服务 (Codex/Gemini 兼容)',
  },
]

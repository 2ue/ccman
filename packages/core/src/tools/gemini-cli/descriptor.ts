/**
 * Gemini CLI ToolDescriptor
 */

import type { ToolDescriptor } from '../../types.js'
import { GeminiConfigAdapter } from './config-adapter.js'
import { GeminiServiceAdapter } from './service-adapter.js'
import { GeminiMcpAdapter } from './mcp-adapter.js'
import { GEMINI_PRESETS } from './presets.js'

export const geminiDescriptor: ToolDescriptor = {
  // 基础信息
  id: 'gemini-cli',
  short: 'gm',
  displayName: 'Gemini CLI',
  description: 'Google Gemini AI Assistant',

  // 配置路径
  configPaths: [
    {
      id: 'main',
      path: '~/.gemini/settings.json',
      format: 'json',
      scope: 'user',
    },
    {
      id: 'env',
      path: '~/.gemini/.env',
      format: 'env',
      scope: 'user',
    },
  ],

  // 适配器
  adapters: {
    config: new GeminiConfigAdapter(),
    service: new GeminiServiceAdapter(),
    mcp: new GeminiMcpAdapter(),
  },

  // 模板
  templates: [
    {
      pathId: 'main',
      templatePath: 'gemini/settings.json',
    },
    {
      pathId: 'env',
      templatePath: 'gemini/.env',
    },
  ],

  // 预设
  presets: GEMINI_PRESETS,

  // 能力
  capabilities: ['service', 'mcp', 'config'],
}

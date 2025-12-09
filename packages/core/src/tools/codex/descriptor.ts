/**
 * Codex ToolDescriptor
 */

import type { ToolDescriptor } from '../../types.js'
import { CodexConfigAdapter } from './config-adapter.js'
import { CodexServiceAdapter } from './service-adapter.js'
import { CODEX_PRESETS } from './presets.js'

export const codexDescriptor: ToolDescriptor = {
  // 基础信息
  id: 'codex',
  short: 'cx',
  displayName: 'Codex',
  description: 'OpenAI Codex AI Assistant',

  // 配置路径
  configPaths: [
    {
      id: 'main',
      path: '~/.codex/config.toml',
      format: 'toml',
      scope: 'user',
    },
    {
      id: 'auth',
      path: '~/.codex/auth.json',
      format: 'json',
      scope: 'user',
    },
  ],

  // 适配器
  adapters: {
    config: new CodexConfigAdapter(),
    service: new CodexServiceAdapter(),
  },

  // 模板
  templates: [
    {
      pathId: 'main',
      templatePath: 'codex/config.toml',
    },
  ],

  // 预设
  presets: CODEX_PRESETS,

  // 能力
  capabilities: ['service', 'config'],
}

/**
 * ccman ToolDescriptor - Meta-tool that manages other tools
 */

import type { ToolDescriptor } from '../../types.js'
import { CcmanConfigAdapter } from './config-adapter.js'

export const ccmanDescriptor: ToolDescriptor = {
  // 基础信息
  id: 'ccman',
  short: 'cm',
  displayName: 'ccman',
  description: 'Configuration Manager for AI Tools',

  // 配置路径
  configPaths: [
    {
      id: 'main',
      path: '~/.ccman/config.json',
      format: 'json',
      scope: 'user',
    },
    {
      id: 'presets',
      path: '~/.ccman/presets.json',
      format: 'json',
      scope: 'user',
    },
    {
      id: 'mcp',
      path: '~/.ccman/mcp.json',
      format: 'json',
      scope: 'user',
    },
  ],

  // 适配器
  adapters: {
    config: new CcmanConfigAdapter(),
    // ccman is a meta-tool, doesn't need service adapter
  },

  // 模板
  templates: [],

  // 预设
  presets: [],

  // 能力
  capabilities: ['config'],
}

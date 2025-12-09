/**
 * Claude Code ToolDescriptor
 */

import type { ToolDescriptor } from '../../types.js'
import { ClaudeConfigAdapter } from './config-adapter.js'
import { ClaudeServiceAdapter } from './service-adapter.js'
import { ClaudeMcpAdapter } from './mcp-adapter.js'
import { CLAUDE_PRESETS } from './presets.js'

export const claudeDescriptor: ToolDescriptor = {
  // 基础信息
  id: 'claude-code',
  short: 'cc',
  displayName: 'Claude Code',
  description: 'Anthropic Claude Code AI Assistant',

  // 配置路径
  configPaths: [
    {
      id: 'main',
      path: '~/.claude/settings.json',
      format: 'json',
      scope: 'user',
    },
  ],

  // 适配器
  adapters: {
    config: new ClaudeConfigAdapter(),
    service: new ClaudeServiceAdapter(),
    mcp: new ClaudeMcpAdapter(),
  },

  // 模板
  templates: [
    {
      pathId: 'main',
      templatePath: 'claude/settings.json',
    },
  ],

  // 预设
  presets: CLAUDE_PRESETS,

  // 能力
  capabilities: ['service', 'mcp', 'config'],
}

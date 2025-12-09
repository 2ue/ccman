/**
 * Claude Code 预设
 */

import type { PresetSpec } from '../../types.js'

export const CLAUDE_PRESETS: PresetSpec[] = [
  {
    name: 'anthropic-official',
    baseUrl: 'https://api.anthropic.com',
    description: 'Anthropic 官方 API',
    isBuiltIn: true,
  },
  {
    name: 'cloudflare-ai-gateway',
    baseUrl: 'https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/anthropic',
    description: 'Cloudflare AI Gateway',
    isBuiltIn: true,
  },
]

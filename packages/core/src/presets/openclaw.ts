import type { InternalPresetTemplate } from '../tool-manager.types.js'

/**
 * OpenClaw 预置服务商
 */
export const OPENCLAW_PRESETS: InternalPresetTemplate[] = [
  {
    name: 'GMN',
    baseUrl: 'https://gmn.chuangzuoli.com/v1',
    description: 'GMN 服务 (OpenClaw 兼容)',
  },
]

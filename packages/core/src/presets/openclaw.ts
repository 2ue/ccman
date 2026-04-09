import type { InternalPresetTemplate } from '../tool-manager.types.js'
import { createDualGmnPresets } from './gmn.js'

/**
 * OpenClaw 预置服务商
 */
export const OPENCLAW_PRESETS: InternalPresetTemplate[] = [
  ...createDualGmnPresets((baseUrl) => `${baseUrl}/v1`),
]

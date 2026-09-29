import type { InternalPresetTemplate } from '../tool-manager.types.js'
import { createDualGmnPresets } from './gmn.js'
import { createSightPreset } from './sight.js'

/**
 * OpenClaw 预置服务商
 */
export const OPENCLAW_PRESETS: InternalPresetTemplate[] = [
  ...createDualGmnPresets((baseUrl) => `${baseUrl}/v1`),
  ...createSightPreset((baseUrl) => `${baseUrl}/v1`),
]

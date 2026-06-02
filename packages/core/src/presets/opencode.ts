import type { InternalPresetTemplate } from '../tool-manager.types.js'
import { createDualGmnPresets } from './gmn.js'
import { createSightPreset } from './sight.js'

/**
 * OpenCode 预置服务商
 */
export const OPENCODE_PRESETS: InternalPresetTemplate[] = [
  ...createDualGmnPresets(),
  ...createSightPreset(),
]

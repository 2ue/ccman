import { describe, expect, it } from 'vitest'
import { CC_PRESETS } from './claude.js'
import { CODEX_PRESETS } from './codex.js'
import { GEMINI_PRESETS } from './gemini.js'
import { OPENCODE_PRESETS } from './opencode.js'
import { OPENCLAW_PRESETS } from './openclaw.js'
import { GMN1_ROOT_URL, GMN_ROOT_URL } from './gmn.js'

function getPresetBaseUrl(
  presets: Array<{ name: string; baseUrl: string }>,
  name: string
): string | undefined {
  return presets.find((preset) => preset.name === name)?.baseUrl
}

describe('GMN built-in presets', () => {
  it('should expose GMN and GMN1 for Claude with root URLs', () => {
    expect(getPresetBaseUrl(CC_PRESETS, 'GMN')).toBe(GMN_ROOT_URL)
    expect(getPresetBaseUrl(CC_PRESETS, 'GMN1')).toBe(GMN1_ROOT_URL)
  })

  it('should expose GMN and GMN1 for Codex/Gemini/OpenCode', () => {
    for (const presets of [CODEX_PRESETS, GEMINI_PRESETS, OPENCODE_PRESETS]) {
      expect(getPresetBaseUrl(presets, 'GMN')).toBe(GMN_ROOT_URL)
      expect(getPresetBaseUrl(presets, 'GMN1')).toBe(GMN1_ROOT_URL)
    }
  })

  it('should expose GMN and GMN1 for OpenClaw with /v1 URLs', () => {
    expect(getPresetBaseUrl(OPENCLAW_PRESETS, 'GMN')).toBe(`${GMN_ROOT_URL}/v1`)
    expect(getPresetBaseUrl(OPENCLAW_PRESETS, 'GMN1')).toBe(`${GMN1_ROOT_URL}/v1`)
  })
})

import { describe, expect, it } from 'vitest'
import { CC_PRESETS } from './claude.js'
import { CODEX_PRESETS } from './codex.js'
import { GEMINI_PRESETS } from './gemini.js'
import { OPENCODE_PRESETS } from './opencode.js'
import { OPENCLAW_PRESETS } from './openclaw.js'
import { SIGHT_MORE_ROOT_URL } from './sight.js'

function getPresetBaseUrl(
  presets: Array<{ name: string; baseUrl: string }>,
  name: string
): string | undefined {
  return presets.find((preset) => preset.name === name)?.baseUrl
}

describe('Sight More built-in preset', () => {
  it('should expose Sight More for Claude/Codex/Gemini/OpenCode with root URL', () => {
    for (const presets of [CC_PRESETS, CODEX_PRESETS, GEMINI_PRESETS, OPENCODE_PRESETS]) {
      expect(getPresetBaseUrl(presets, 'Sight More')).toBe(SIGHT_MORE_ROOT_URL)
    }
  })

  it('should expose Sight More for OpenClaw with /v1 URL', () => {
    expect(getPresetBaseUrl(OPENCLAW_PRESETS, 'Sight More')).toBe(`${SIGHT_MORE_ROOT_URL}/v1`)
  })
})

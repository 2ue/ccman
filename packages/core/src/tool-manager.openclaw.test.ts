import { describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { createOpenClawManager } from './tool-manager.js'
import { __setTestPaths, getOpenClawConfigPath, getOpenClawModelsPath } from './paths.js'

describe('OpenClaw ToolManager', () => {
  beforeEach(() => {
    const testDir = path.join(
      os.tmpdir(),
      `ccman-openclaw-manager-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    __setTestPaths({
      ccman: path.join(testDir, '.ccman'),
      codex: path.join(testDir, '.codex'),
      claude: path.join(testDir, '.claude'),
      opencode: path.join(testDir, '.config', 'opencode'),
      openclaw: path.join(testDir, '.openclaw'),
    })

    fs.rmSync(path.join(testDir, '.ccman'), { recursive: true, force: true })
    fs.rmSync(path.join(testDir, '.openclaw'), { recursive: true, force: true })
  })

  it('should manage openclaw providers and write target configs on switch', () => {
    const manager = createOpenClawManager()
    const providerName = `GMN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const provider = manager.add({
      name: providerName,
      baseUrl: 'https://gmn.chuangzuoli.com/v1',
      apiKey: 'sk-openclaw-provider',
    })

    manager.switch(provider.id)
    expect(manager.getCurrent()?.id).toBe(provider.id)
    expect(manager.list().some((p) => p.id === provider.id)).toBe(true)

    const openclawPath = getOpenClawConfigPath()
    const modelsPath = getOpenClawModelsPath()
    expect(fs.existsSync(openclawPath)).toBe(true)
    expect(fs.existsSync(modelsPath)).toBe(true)

    const openclawConfig = JSON.parse(fs.readFileSync(openclawPath, 'utf-8'))
    const modelsConfig = JSON.parse(fs.readFileSync(modelsPath, 'utf-8'))
    expect(openclawConfig.agents.defaults.model.primary).toBe(`${providerName}/gpt-5.3-codex`)
    expect(modelsConfig.providers[providerName].baseUrl).toBe('https://gmn.chuangzuoli.com/v1')
  })
})

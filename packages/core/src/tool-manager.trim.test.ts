import { describe, it, expect, beforeEach } from 'vitest'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import { createCodexManager } from './tool-manager.js'
import { __setTestPaths } from './paths.js'

describe('ToolManager trim inputs', () => {
  beforeEach(() => {
    const testDir = path.join(
      os.tmpdir(),
      `ccman-test-trim-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    __setTestPaths({
      ccman: path.join(testDir, '.ccman'),
      codex: path.join(testDir, '.codex'),
      claude: path.join(testDir, '.claude'),
    })

    fs.rmSync(path.join(testDir, '.ccman'), { recursive: true, force: true })
  })

  it('should trim add/findByName/edit/clone inputs', () => {
    const manager = createCodexManager()
    const seed = `trim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const name1 = `  ${seed}-A  `
    const name2 = `${seed}-B`
    const name3 = `${seed}-C`

    const added = manager.add({
      name: name1,
      desc: '  desc  ',
      baseUrl: '  https://gmn.chuangzuoli.com  ',
      apiKey: '  sk-abc  ',
      model: '  gpt-5.3-codex  ',
    })

    expect(added.name).toBe(seed + '-A')
    expect(added.desc).toBe('desc')
    expect(added.baseUrl).toBe('https://gmn.chuangzuoli.com')
    expect(added.apiKey).toBe('sk-abc')
    expect(added.model).toBe('gpt-5.3-codex')

    const found = manager.findByName(`  ${seed.toUpperCase()}-a  `)
    expect(found?.id).toBe(added.id)

    const edited = manager.edit(added.id, {
      name: `  ${name2}  `,
      desc: '  d2  ',
      baseUrl: '  https://example.com/v1  ',
      apiKey: '  sk-new  ',
      model: '  m1  ',
    })

    expect(edited.name).toBe(name2)
    expect(edited.desc).toBe('d2')
    expect(edited.baseUrl).toBe('https://example.com/v1')
    expect(edited.apiKey).toBe('sk-new')
    expect(edited.model).toBe('m1')

    const cloned = manager.clone(added.id, `  ${name3}  `)
    expect(cloned.name).toBe(name3)
  })

  it('should trim preset inputs', () => {
    const manager = createCodexManager()
    const seed = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const preset1 = `${seed}-A`
    const preset2 = `${seed}-B`

    const p = manager.addPreset({
      name: `  ${preset1}  `,
      baseUrl: '  https://p1.example.com  ',
      description: '  desc  ',
    })

    expect(p.name).toBe(preset1)
    expect(p.baseUrl).toBe('https://p1.example.com')
    expect(p.description).toBe('desc')

    const p2 = manager.editPreset(`  ${preset1}  `, {
      name: `  ${preset2}  `,
      baseUrl: '  https://p2.example.com  ',
      description: '  d2  ',
    })

    expect(p2.name).toBe(preset2)
    expect(p2.baseUrl).toBe('https://p2.example.com')
    expect(p2.description).toBe('d2')

    expect(() => manager.removePreset(`  ${preset2}  `)).not.toThrow()
  })
})

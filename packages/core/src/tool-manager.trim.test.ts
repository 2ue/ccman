import { describe, it, expect, beforeEach } from 'vitest'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import * as TOML from '@iarna/toml'
import { createCodexManager } from './tool-manager.js'
import { __setTestPaths, getCodexAuthPath, getCodexConfigPath } from './paths.js'

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

  it('should use merge mode by default in manager switch and allow explicit overwrite', () => {
    const seed = `mode-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const configPath = getCodexConfigPath()
    const authPath = getCodexAuthPath()
    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    fs.writeFileSync(
      configPath,
      TOML.stringify({
        custom_field: 'keep-me',
        model_providers: {
          legacy: {
            name: 'legacy',
            base_url: 'https://legacy.example.com',
          },
        },
      } as any),
      'utf-8'
    )
    fs.writeFileSync(
      authPath,
      JSON.stringify(
        {
          OPENAI_API_KEY: 'old-key',
          CUSTOM_FIELD: 'keep-me',
        },
        null,
        2
      ),
      'utf-8'
    )

    const manager = createCodexManager()
    const mergeProvider = manager.add({
      name: `${seed}-merge`,
      baseUrl: 'https://gmn.chuangzuoli.com',
      apiKey: 'sk-merge',
    })
    manager.switch(mergeProvider.id)

    const mergedConfig = TOML.parse(fs.readFileSync(configPath, 'utf-8')) as any
    const mergedAuth = JSON.parse(fs.readFileSync(authPath, 'utf-8'))

    expect(mergedConfig.custom_field).toBe('keep-me')
    expect(mergedConfig.model_providers.legacy).toBeDefined()
    expect(mergedConfig.model_providers.gmn.base_url).toBe('https://gmn.chuangzuoli.com')
    expect(mergedAuth.CUSTOM_FIELD).toBe('keep-me')
    expect(mergedAuth.OPENAI_API_KEY).toBe('sk-merge')

    fs.writeFileSync(
      configPath,
      TOML.stringify({
        custom_field: 'remove-me',
      } as any),
      'utf-8'
    )
    fs.writeFileSync(
      authPath,
      JSON.stringify(
        {
          OPENAI_API_KEY: 'old-key',
          CUSTOM_FIELD: 'remove-me',
        },
        null,
        2
      ),
      'utf-8'
    )

    const overwriteProvider = manager.add({
      name: `${seed}-overwrite`,
      baseUrl: 'https://gmncodex.com',
      apiKey: 'sk-overwrite',
    })
    manager.switch(overwriteProvider.id, { mode: 'overwrite' })

    const overwrittenConfig = TOML.parse(fs.readFileSync(configPath, 'utf-8')) as any
    const overwrittenAuth = JSON.parse(fs.readFileSync(authPath, 'utf-8'))

    expect(overwrittenConfig.custom_field).toBeUndefined()
    expect(overwrittenConfig.model_providers.gmn.base_url).toBe('https://gmncodex.com')
    expect(overwrittenAuth.CUSTOM_FIELD).toBeUndefined()
    expect(overwrittenAuth.OPENAI_API_KEY).toBe('sk-overwrite')
  })

  it('should allow editing the active provider without applying an intermediate write', () => {
    const configPath = getCodexConfigPath()
    const authPath = getCodexAuthPath()
    fs.mkdirSync(path.dirname(configPath), { recursive: true })

    const manager = createCodexManager()
    const provider = manager.add({
      name: `active-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      baseUrl: 'https://before.example.com',
      apiKey: 'sk-before',
    })

    manager.switch(provider.id, { mode: 'overwrite' })

    fs.writeFileSync(
      configPath,
      TOML.stringify({
        custom_field: 'should-stay-before-overwrite',
      } as any),
      'utf-8'
    )
    fs.writeFileSync(
      authPath,
      JSON.stringify(
        {
          OPENAI_API_KEY: 'old-key',
          CUSTOM_FIELD: 'should-stay-before-overwrite',
        },
        null,
        2
      ),
      'utf-8'
    )

    manager.edit(
      provider.id,
      {
        baseUrl: 'https://after.example.com',
        apiKey: 'sk-after',
      },
      { applyWrite: false }
    )

    const untouchedConfig = TOML.parse(fs.readFileSync(configPath, 'utf-8')) as any
    const untouchedAuth = JSON.parse(fs.readFileSync(authPath, 'utf-8'))

    expect(untouchedConfig.custom_field).toBe('should-stay-before-overwrite')
    expect(untouchedAuth.CUSTOM_FIELD).toBe('should-stay-before-overwrite')
    expect(untouchedAuth.OPENAI_API_KEY).toBe('old-key')

    manager.switch(provider.id, { mode: 'overwrite' })

    const overwrittenConfig = TOML.parse(fs.readFileSync(configPath, 'utf-8')) as any
    const overwrittenAuth = JSON.parse(fs.readFileSync(authPath, 'utf-8'))

    expect(overwrittenConfig.custom_field).toBeUndefined()
    expect(overwrittenConfig.model_providers[provider.name].base_url).toBe(
      'https://after.example.com'
    )
    expect(overwrittenAuth.CUSTOM_FIELD).toBeUndefined()
    expect(overwrittenAuth.OPENAI_API_KEY).toBe('sk-after')
  })
})

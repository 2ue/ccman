import { describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { writeOpenClawConfig } from './openclaw.js'
import { __setTestPaths, getOpenClawConfigPath, getOpenClawModelsPath } from '../paths.js'
import type { Provider } from '../tool-manager.types.js'

describe('OpenClaw Writer', () => {
  beforeEach(() => {
    const testDir = path.join(
      os.tmpdir(),
      `ccman-openclaw-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )

    __setTestPaths({
      ccman: path.join(testDir, '.ccman'),
      codex: path.join(testDir, '.codex'),
      claude: path.join(testDir, '.claude'),
      opencode: path.join(testDir, '.config', 'opencode'),
      openclaw: path.join(testDir, '.openclaw'),
    })

    fs.rmSync(path.join(testDir, '.openclaw'), { recursive: true, force: true })
  })

  function createProvider(overrides: Partial<Provider> = {}): Provider {
    return {
      id: 'openclaw-provider',
      name: 'GMN',
      baseUrl: 'https://gmn.chuangzuoli.com/v1',
      apiKey: 'sk-openclaw-test',
      createdAt: Date.now(),
      lastModified: Date.now(),
      ...overrides,
    }
  }

  it('should write openclaw.json and models.json with required gmn fields', () => {
    writeOpenClawConfig(createProvider())

    const configPath = getOpenClawConfigPath()
    const modelsPath = getOpenClawModelsPath()

    expect(fs.existsSync(configPath)).toBe(true)
    expect(fs.existsSync(modelsPath)).toBe(true)

    const openclawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    const modelsConfig = JSON.parse(fs.readFileSync(modelsPath, 'utf-8'))

    expect(openclawConfig.agents?.defaults?.model?.primary).toBe('GMN/gpt-5.3-codex')
    expect(typeof openclawConfig.agents?.defaults?.workspace).toBe('string')

    const provider = modelsConfig.providers?.GMN
    expect(provider.baseUrl).toBe('https://gmn.chuangzuoli.com/v1')
    expect(provider.apiKey).toBe('sk-openclaw-test')
    expect(provider.api).toBe('openai-responses')
    expect(provider.authHeader).toBe(true)
    expect(typeof provider.headers?.['User-Agent']).toBe('string')
    expect(provider.models?.[0]?.id).toBe('gpt-5.3-codex')
  })

  it('should merge openclaw fields incrementally instead of full overwrite', () => {
    const configPath = getOpenClawConfigPath()
    const modelsPath = getOpenClawModelsPath()

    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    fs.mkdirSync(path.dirname(modelsPath), { recursive: true })

    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          meta: { keep: true },
          models: {
            mode: 'merge',
            providers: {
              legacy: {
                baseUrl: 'https://legacy.example.com/v1',
                apiKey: 'legacy-key',
              },
            },
          },
          agents: {
            defaults: {
              workspace: '/tmp/custom',
              model: {
                primary: 'legacy/model',
              },
              maxConcurrent: 8,
            },
          },
          customField: 'legacy-value',
        },
        null,
        2
      ),
      'utf-8'
    )

    fs.writeFileSync(
      modelsPath,
      JSON.stringify(
        {
          providers: {
            legacy: {
              baseUrl: 'https://old.example.com',
              apiKey: 'old-key',
            },
          },
          customField: 'legacy-models-value',
        },
        null,
        2
      ),
      'utf-8'
    )

    writeOpenClawConfig(createProvider({ apiKey: 'sk-new-openclaw' }))

    const openclawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    const modelsConfig = JSON.parse(fs.readFileSync(modelsPath, 'utf-8'))

    expect(openclawConfig.customField).toBe('legacy-value')
    expect(openclawConfig.meta?.keep).toBe(true)
    expect(openclawConfig.models?.providers?.legacy?.baseUrl).toBe('https://legacy.example.com/v1')
    expect(openclawConfig.models?.providers?.GMN?.apiKey).toBe('sk-new-openclaw')
    expect(openclawConfig.agents?.defaults?.workspace).toBe('/tmp/custom')
    expect(openclawConfig.agents?.defaults?.maxConcurrent).toBe(8)
    expect(openclawConfig.agents?.defaults?.model?.primary).toBe('GMN/gpt-5.3-codex')

    expect(modelsConfig.customField).toBe('legacy-models-value')
    expect(modelsConfig.providers?.legacy?.baseUrl).toBe('https://old.example.com')
    expect(modelsConfig.providers?.GMN?.apiKey).toBe('sk-new-openclaw')
  })

  it('should fallback to built-in templates when template files are unavailable', () => {
    const currentFile = fileURLToPath(import.meta.url)
    const writerDir = path.dirname(currentFile)
    const templateDir = path.resolve(writerDir, '../../templates/openclaw')
    const openclawTemplatePath = path.join(templateDir, 'openclaw.base.template.json')
    const modelsTemplatePath = path.join(templateDir, 'models.base.template.json')
    const openclawTemplateBackupPath = `${openclawTemplatePath}.bak`
    const modelsTemplateBackupPath = `${modelsTemplatePath}.bak`

    fs.renameSync(openclawTemplatePath, openclawTemplateBackupPath)
    fs.renameSync(modelsTemplatePath, modelsTemplateBackupPath)

    try {
      writeOpenClawConfig(createProvider())

      const configPath = getOpenClawConfigPath()
      const modelsPath = getOpenClawModelsPath()
      const openclawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      const modelsConfig = JSON.parse(fs.readFileSync(modelsPath, 'utf-8'))

      expect(openclawConfig.agents?.defaults?.model?.primary).toBe('GMN/gpt-5.3-codex')
      expect(modelsConfig.providers?.GMN?.api).toBe('openai-responses')
    } finally {
      fs.renameSync(openclawTemplateBackupPath, openclawTemplatePath)
      fs.renameSync(modelsTemplateBackupPath, modelsTemplatePath)
    }
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import { writeGeminiConfig } from './gemini.js'
import { getGeminiSettingsPath, getGeminiEnvPath, __setTestPaths } from '../paths.js'
import type { Provider } from '../tool-manager.types.js'

describe('Gemini Writer', () => {
  beforeEach(() => {
    const testDir = path.join(
      os.tmpdir(),
      `ccman-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    __setTestPaths({
      ccman: path.join(testDir, '.ccman'),
      codex: path.join(testDir, '.codex'),
      claude: path.join(testDir, '.claude'),
    })

    const settingsPath = getGeminiSettingsPath()
    const envPath = getGeminiEnvPath()
    const settingsDir = path.dirname(settingsPath)
    if (fs.existsSync(settingsDir)) {
      fs.rmSync(settingsDir, { recursive: true, force: true })
    }
    const envDir = path.dirname(envPath)
    if (fs.existsSync(envDir)) {
      fs.rmSync(envDir, { recursive: true, force: true })
    }
  })

  it('should create new settings.json and .env for proxy provider', () => {
    const provider: Provider = {
      id: 'gemini-1',
      name: 'LiteLLM Proxy',
      baseUrl: 'http://localhost:4000',
      apiKey: 'sk-test-123',
      createdAt: Date.now(),
      lastModified: Date.now(),
    }

    writeGeminiConfig(provider)

    const settingsPath = getGeminiSettingsPath()
    expect(fs.existsSync(settingsPath)).toBe(true)

    const rawSettings = fs.readFileSync(settingsPath, 'utf-8')
    const settings = JSON.parse(rawSettings)

    // 默认只在有 defaultModel 时写 model.name
    expect(settings.model).toBeUndefined()
    // 默认开启 IDE 集成 & 设置认证方式
    expect(settings.ide?.enabled).toBe(true)
    expect(settings.security?.auth?.selectedType).toBe('gemini-api-key')

    const envPath = getGeminiEnvPath()
    expect(fs.existsSync(envPath)).toBe(true)
    const envContent = fs.readFileSync(envPath, 'utf-8')
    expect(envContent).toContain('GOOGLE_GEMINI_BASE_URL=http://localhost:4000')
    expect(envContent).toContain('GEMINI_API_KEY=sk-test-123')
  })

  it('should respect defaultModel and env in provider.model', () => {
    const meta = {
      authType: 'oauth',
      defaultModel: 'gemini-2.5-flash',
      env: {
        GEMINI_MODEL: 'gemini-2.5-flash',
      },
    }

    const provider: Provider = {
      id: 'gemini-2',
      name: 'Google OAuth',
      baseUrl: '',
      apiKey: '',
      model: JSON.stringify(meta),
      createdAt: Date.now(),
      lastModified: Date.now(),
    }

    writeGeminiConfig(provider)

    const envPath = getGeminiEnvPath()
    const envContent = fs.readFileSync(envPath, 'utf-8')
    // 合并 meta.env 中的 GEMINI_MODEL
    expect(envContent).toContain('GEMINI_MODEL=gemini-2.5-flash')
  })

  it('should fallback GEMINI_MODEL from defaultModel when not provided in env', () => {
    const meta = {
      defaultModel: 'gemini-2.5-pro',
    }

    const provider: Provider = {
      id: 'gemini-2b',
      name: 'Google API Key',
      baseUrl: '',
      apiKey: '',
      model: JSON.stringify(meta),
      createdAt: Date.now(),
      lastModified: Date.now(),
    }

    writeGeminiConfig(provider)

    const envPath = getGeminiEnvPath()
    const envContent = fs.readFileSync(envPath, 'utf-8')
    // 默认从 defaultModel 填充 GEMINI_MODEL
    expect(envContent).toContain('GEMINI_MODEL=gemini-2.5-pro')
  })

  it('should preserve existing unrelated fields when updating', () => {
    const settingsPath = getGeminiSettingsPath()
    const dir = path.dirname(settingsPath)
    fs.mkdirSync(dir, { recursive: true })

    const existing = {
      someField: 'keep-me',
    }
    fs.writeFileSync(settingsPath, JSON.stringify(existing, null, 2), 'utf-8')

    const provider: Provider = {
      id: 'gemini-3',
      name: 'Proxy',
      baseUrl: 'http://localhost:5000',
      apiKey: 'sk-xyz',
      createdAt: Date.now(),
      lastModified: Date.now(),
    }

    writeGeminiConfig(provider)

    const rawSettings = fs.readFileSync(settingsPath, 'utf-8')
    const settings = JSON.parse(rawSettings)
    expect(settings.someField).toBe('keep-me')

    const envPath = getGeminiEnvPath()
    const envContent = fs.readFileSync(envPath, 'utf-8')
    expect(envContent).toContain('GOOGLE_GEMINI_BASE_URL=http://localhost:5000')
    expect(envContent).toContain('GEMINI_API_KEY=sk-xyz')
  })
})

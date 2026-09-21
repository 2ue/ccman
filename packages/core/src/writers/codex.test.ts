import { describe, it, expect, beforeEach } from 'vitest'
import { writeCodexConfig } from './codex'
import { getCodexConfigPath, getCodexAuthPath, __setTestPaths } from '../paths'
import { setCodexPreserveProviderName } from '../codex-settings'
import { fileExists } from '../utils/file'
import type { Provider } from '../types'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import * as TOML from '@iarna/toml'

describe('Codex Writer', () => {
  beforeEach(() => {
    // 设置测试环境路径（使用随机数避免并发冲突）
    const testDir = path.join(
      os.tmpdir(),
      `ccman-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    __setTestPaths({
      ccman: path.join(testDir, '.ccman'),
      codex: path.join(testDir, '.codex'),
      claude: path.join(testDir, '.claude'),
    })

    // 清理测试文件
    const codexPath = getCodexConfigPath()
    if (fileExists(codexPath)) {
      fs.unlinkSync(codexPath)
    }
    const authPath = getCodexAuthPath()
    if (fileExists(authPath)) {
      fs.unlinkSync(authPath)
    }
  })

  describe('writeCodexConfig', () => {
    it('should create new config and auth files', () => {
      const provider: Provider = {
        id: 'test-id',
        name: 'TestProvider',
        type: 'codex',
        baseUrl: 'https://test.example.com/v1',
        apiKey: 'test-api-key-123',
        createdAt: Date.now(),
      }

      writeCodexConfig(provider)

      // 验证 config.toml
      const configPath = getCodexConfigPath()
      expect(fileExists(configPath)).toBe(true)
      const configContent = fs.readFileSync(configPath, 'utf-8')
      const config: any = TOML.parse(configContent)

      expect(config.model_provider).toBe(provider.name)
      expect(config.profile).toBeUndefined()
      expect(config.profiles).toBeUndefined()
      expect(config.model_providers[provider.name]).toBeDefined()
      expect(config.model_providers[provider.name].base_url).toBe(provider.baseUrl)

      // 验证 auth.json
      const authPath = getCodexAuthPath()
      expect(fileExists(authPath)).toBe(true)
      const authContent = fs.readFileSync(authPath, 'utf-8')
      const auth = JSON.parse(authContent)
      expect(auth.OPENAI_API_KEY).toBe(provider.apiKey)
    })

    it('should use gmn as provider key for GMN baseUrl', () => {
      const provider: Provider = {
        id: 'test-id',
        name: 'GMN',
        type: 'codex',
        baseUrl: 'https://ai.gmncode.com',
        apiKey: 'test-api-key-123',
        createdAt: Date.now(),
      }

      writeCodexConfig(provider)

      const configContent = fs.readFileSync(getCodexConfigPath(), 'utf-8')
      const config: any = TOML.parse(configContent)

      expect(config.model_provider).toBe('gmn')
      expect(config.model).toBe('gpt-5.5')
      expect(config.model_providers.gmn).toBeDefined()
      expect(config.model_providers.gmn.base_url).toBe(provider.baseUrl)
      expect(config.model_providers.GMN).toBeUndefined()
    })

    it('should use gmn as provider key for alternate GMN domains', () => {
      const provider: Provider = {
        id: 'test-id',
        name: '自定义 GMN',
        type: 'codex',
        baseUrl: 'https://gmncode.com',
        apiKey: 'test-api-key-123',
        createdAt: Date.now(),
      }

      writeCodexConfig(provider)

      const configContent = fs.readFileSync(getCodexConfigPath(), 'utf-8')
      const config: any = TOML.parse(configContent)

      expect(config.model_provider).toBe('gmn')
      expect(config.model_providers.gmn.base_url).toBe(provider.baseUrl)
      expect(config.model_providers['自定义 GMN']).toBeUndefined()
    })

    it('should not classify unrelated URLs that merely contain a GMN domain in the path', () => {
      const provider: Provider = {
        id: 'test-id-unrelated-gmn',
        name: 'CustomProvider',
        type: 'codex',
        baseUrl: 'https://not-gmncode.com/gmncode.com/v1',
        apiKey: 'test-api-key-123',
        createdAt: Date.now(),
      }

      writeCodexConfig(provider)

      const configContent = fs.readFileSync(getCodexConfigPath(), 'utf-8')
      const config: any = TOML.parse(configContent)

      expect(config.model_provider).toBe('CustomProvider')
      expect(config.model_providers.CustomProvider.base_url).toBe(provider.baseUrl)
    })

    it('should preserve the existing top-level provider name by default', () => {
      const configPath = getCodexConfigPath()
      const authPath = getCodexAuthPath()
      fs.mkdirSync(path.dirname(configPath), { recursive: true })
      fs.writeFileSync(
        configPath,
        TOML.stringify({
          model_provider: 'StableSlot',
          model_providers: {
            StableSlot: {
              name: 'StableSlot',
              base_url: 'https://old.example.com',
              http_headers: { 'X-Keep': 'preserved' },
              env_key: 'STALE_API_KEY',
            },
            OtherProvider: {
              name: 'OtherProvider',
              base_url: 'https://other.example.com',
            },
          },
        } as any),
        'utf-8'
      )
      fs.writeFileSync(authPath, JSON.stringify({ OPENAI_API_KEY: 'old-key' }), 'utf-8')

      const provider: Provider = {
        id: 'preserved-slot',
        name: 'NewProvider',
        type: 'codex',
        baseUrl: 'https://new.example.com',
        apiKey: 'new-key',
        createdAt: Date.now(),
      }

      writeCodexConfig(provider)

      const config: any = TOML.parse(fs.readFileSync(configPath, 'utf-8'))
      const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'))
      expect(config.model_provider).toBe('StableSlot')
      expect(config.model_providers.StableSlot.base_url).toBe(provider.baseUrl)
      expect(config.model_providers.StableSlot.http_headers['X-Keep']).toBe('preserved')
      expect(config.model_providers.StableSlot.env_key).toBeUndefined()
      expect(config.model_providers.NewProvider).toBeUndefined()
      expect(config.model_providers.OtherProvider.base_url).toBe('https://other.example.com')
      expect(auth.OPENAI_API_KEY).toBe(provider.apiKey)
    })

    it('should initialize the fixed provider slot when the provider block is missing', () => {
      const configPath = getCodexConfigPath()
      fs.mkdirSync(path.dirname(configPath), { recursive: true })
      fs.writeFileSync(
        configPath,
        TOML.stringify({ model_provider: 'ExistingName', custom_field: 'keep' } as any),
        'utf-8'
      )

      const provider: Provider = {
        id: 'missing-block',
        name: 'NewProvider',
        type: 'codex',
        baseUrl: 'https://new.example.com',
        apiKey: 'new-key',
        createdAt: Date.now(),
      }

      writeCodexConfig(provider)

      const config: any = TOML.parse(fs.readFileSync(configPath, 'utf-8'))
      expect(config.model_provider).toBe('ExistingName')
      expect(config.model_providers.ExistingName.base_url).toBe(provider.baseUrl)
      expect(config.model_providers.NewProvider).toBeUndefined()
      expect(config.custom_field).toBe('keep')
    })

    it('should allow changing provider names when preservation is disabled', () => {
      const configPath = getCodexConfigPath()
      fs.mkdirSync(path.dirname(configPath), { recursive: true })
      fs.writeFileSync(
        configPath,
        TOML.stringify({
          model_provider: 'StableSlot',
          model_providers: {
            StableSlot: {
              name: 'StableSlot',
              base_url: 'https://old.example.com',
            },
          },
        } as any),
        'utf-8'
      )
      setCodexPreserveProviderName(false)

      const provider: Provider = {
        id: 'unprotected-slot',
        name: 'NewProvider',
        type: 'codex',
        baseUrl: 'https://new.example.com',
        apiKey: 'new-key',
        createdAt: Date.now(),
      }

      writeCodexConfig(provider)

      const config: any = TOML.parse(fs.readFileSync(configPath, 'utf-8'))
      expect(config.model_provider).toBe('NewProvider')
      expect(config.model_providers.StableSlot.base_url).toBe('https://old.example.com')
      expect(config.model_providers.NewProvider.base_url).toBe(provider.baseUrl)
    })

    it('should keep treating CDN GMN domains as gmn provider key', () => {
      const provider: Provider = {
        id: 'test-id-cdn',
        name: '自定义 GMN CDN',
        type: 'codex',
        baseUrl: 'https://cdn.gmncode.com',
        apiKey: 'test-api-key-123',
        createdAt: Date.now(),
      }

      writeCodexConfig(provider)

      const configContent = fs.readFileSync(getCodexConfigPath(), 'utf-8')
      const config: any = TOML.parse(configContent)

      expect(config.model_provider).toBe('gmn')
      expect(config.model_providers.gmn.base_url).toBe(provider.baseUrl)
      expect(config.model_providers['自定义 GMN CDN']).toBeUndefined()
    })

    it('should remove deprecated web_search_request while preserving unrelated fields in merge mode', () => {
      const configPath = getCodexConfigPath()
      fs.mkdirSync(path.dirname(configPath), { recursive: true })

      const existingConfig = {
        model_provider: 'GMN',
        custom_field: 'should-be-removed',
        profile: 'auto-max',
        web_search_request: true,
        profiles: {
          'auto-max': {
            approval_policy: 'never',
            sandbox_mode: 'workspace-write',
          },
          review: {
            approval_policy: 'on-request',
            sandbox_mode: 'workspace-write',
          },
        },
        model_providers: {
          GMN: {
            name: 'GMN',
            base_url: 'https://old.example.com',
            wire_api: 'responses',
            requires_openai_auth: true,
          },
        },
        features: {
          web_search_request: true,
          apply_patch_freeform: true,
        },
      }

      fs.writeFileSync(configPath, TOML.stringify(existingConfig as any), 'utf-8')

      const provider: Provider = {
        id: 'test-id',
        name: 'GMN',
        type: 'codex',
        baseUrl: 'https://ai.gmncode.com',
        apiKey: 'test-api-key-123',
        createdAt: Date.now(),
      }
      writeCodexConfig(provider)

      const configContent = fs.readFileSync(getCodexConfigPath(), 'utf-8')
      const config: any = TOML.parse(configContent)

      expect(config.features?.web_search_request).toBeUndefined()
      expect(config.web_search_request).toBeUndefined()
      expect(config.profile).toBeUndefined()
      expect(config.profiles).toBeUndefined()
      expect(config.custom_field).toBe('should-be-removed')
      expect(fs.existsSync(`${configPath}.bak`)).toBe(false)
    })

    it('should merge config.toml and auth.json by default', () => {
      const configPath = getCodexConfigPath()
      const authPath = getCodexAuthPath()

      // 创建包含额外字段的配置
      const existingConfig = {
        model_provider: 'OldProvider',
        model: 'some-model',
        custom_field: 'should-be-preserved',
        model_providers: {
          OldProvider: {
            name: 'OldProvider',
            base_url: 'https://old.example.com',
          },
        },
      }

      const existingAuth = {
        OPENAI_API_KEY: 'old-key',
        CUSTOM_FIELD: 'should-be-preserved',
      }

      fs.mkdirSync(path.dirname(configPath), { recursive: true })
      fs.writeFileSync(configPath, TOML.stringify(existingConfig as any), 'utf-8')
      fs.writeFileSync(authPath, JSON.stringify(existingAuth, null, 2), 'utf-8')

      // 更新配置
      const provider: Provider = {
        id: 'new-id',
        name: 'NewProvider',
        type: 'codex',
        baseUrl: 'https://new.example.com',
        apiKey: 'new-key',
        createdAt: Date.now(),
      }
      writeCodexConfig(provider)

      // 验证 config.toml
      const configContent = fs.readFileSync(configPath, 'utf-8')
      const config: any = TOML.parse(configContent)

      expect(config.model_provider).toBe('OldProvider')
      expect(config.model_providers.OldProvider.base_url).toBe('https://new.example.com')
      expect(config.custom_field).toBe('should-be-preserved')

      // 验证 auth.json
      const authContent = fs.readFileSync(authPath, 'utf-8')
      const auth = JSON.parse(authContent)
      expect(auth.OPENAI_API_KEY).toBe('new-key')
      expect(auth.CUSTOM_FIELD).toBe('should-be-preserved')
      expect(fs.existsSync(`${configPath}.bak`)).toBe(false)
      expect(fs.existsSync(`${authPath}.bak`)).toBe(false)
    })

    it('should fail closed when config.toml cannot be parsed', () => {
      const configPath = getCodexConfigPath()
      const authPath = getCodexAuthPath()
      const invalidConfig = 'model = "unterminated\n'
      const existingAuth = '{"OPENAI_API_KEY":"old-key","CUSTOM_FIELD":"keep-me"}'
      fs.mkdirSync(path.dirname(configPath), { recursive: true })
      fs.writeFileSync(configPath, invalidConfig, 'utf-8')
      fs.writeFileSync(authPath, existingAuth, 'utf-8')

      const provider: Provider = {
        id: 'invalid-config',
        name: 'NewProvider',
        type: 'codex',
        baseUrl: 'https://new.example.com',
        apiKey: 'new-key',
        createdAt: Date.now(),
      }

      expect(() => writeCodexConfig(provider)).toThrow('已中止切换以避免覆盖')
      expect(fs.readFileSync(configPath, 'utf-8')).toBe(invalidConfig)
      expect(fs.readFileSync(authPath, 'utf-8')).toBe(existingAuth)
    })

    it('should fail closed before writing when auth.json cannot be parsed', () => {
      const configPath = getCodexConfigPath()
      const authPath = getCodexAuthPath()
      const existingConfig = TOML.stringify({ custom_field: 'keep-me' } as any)
      const invalidAuth = '{"OPENAI_API_KEY":'
      fs.mkdirSync(path.dirname(configPath), { recursive: true })
      fs.writeFileSync(configPath, existingConfig, 'utf-8')
      fs.writeFileSync(authPath, invalidAuth, 'utf-8')

      const provider: Provider = {
        id: 'invalid-auth',
        name: 'NewProvider',
        type: 'codex',
        baseUrl: 'https://new.example.com',
        apiKey: 'new-key',
        createdAt: Date.now(),
      }

      expect(() => writeCodexConfig(provider)).toThrow('auth.json')
      expect(fs.readFileSync(configPath, 'utf-8')).toBe(existingConfig)
      expect(fs.readFileSync(authPath, 'utf-8')).toBe(invalidAuth)
    })

    it('should overwrite config.toml and auth.json in overwrite mode', () => {
      const configPath = getCodexConfigPath()
      const authPath = getCodexAuthPath()

      const existingConfig = {
        model_provider: 'OldProvider',
        model: 'some-model',
        custom_field: 'should-be-removed',
        model_providers: {
          OldProvider: {
            name: 'OldProvider',
            base_url: 'https://old.example.com',
          },
        },
      }

      const existingAuth = {
        OPENAI_API_KEY: 'old-key',
        CUSTOM_FIELD: 'should-be-removed',
      }

      fs.mkdirSync(path.dirname(configPath), { recursive: true })
      fs.writeFileSync(configPath, TOML.stringify(existingConfig as any), 'utf-8')
      fs.writeFileSync(authPath, JSON.stringify(existingAuth, null, 2), 'utf-8')

      const provider: Provider = {
        id: 'new-id',
        name: 'NewProvider',
        type: 'codex',
        baseUrl: 'https://new.example.com',
        apiKey: 'new-key',
        createdAt: Date.now(),
      }
      writeCodexConfig(provider, { mode: 'overwrite' })

      const configContent = fs.readFileSync(configPath, 'utf-8')
      const config: any = TOML.parse(configContent)

      expect(config.model_provider).toBe('NewProvider')
      expect(config.model_providers.NewProvider.base_url).toBe('https://new.example.com')
      expect(config.custom_field).toBeUndefined()
      expect(config.model_providers.OldProvider).toBeUndefined()

      const authContent = fs.readFileSync(authPath, 'utf-8')
      const auth = JSON.parse(authContent)
      expect(auth.OPENAI_API_KEY).toBe('new-key')
      expect(auth.CUSTOM_FIELD).toBeUndefined()
    })

    it('should handle baseUrl without trailing slash', () => {
      const provider: Provider = {
        id: 'test',
        name: 'Test',
        type: 'codex',
        baseUrl: 'https://example.com',
        apiKey: 'test-key',
        createdAt: Date.now(),
      }
      writeCodexConfig(provider)

      const content = fs.readFileSync(getCodexConfigPath(), 'utf-8')
      const config: any = TOML.parse(content)

      expect(config.model_providers.Test.base_url).toBe('https://example.com')
    })

    it('should handle baseUrl with trailing slash', () => {
      const provider: Provider = {
        id: 'test',
        name: 'Test',
        type: 'codex',
        baseUrl: 'https://example.com/v1/',
        apiKey: 'test-key',
        createdAt: Date.now(),
      }
      writeCodexConfig(provider)

      const content = fs.readFileSync(getCodexConfigPath(), 'utf-8')
      const config: any = TOML.parse(content)

      expect(config.model_providers.Test.base_url).toBe('https://example.com/v1/')
    })

    it('should create parent directory if not exists', () => {
      const codexPath = getCodexConfigPath()
      const parentDir = path.dirname(codexPath)

      // 确保父目录不存在
      if (fs.existsSync(parentDir)) {
        fs.rmSync(parentDir, { recursive: true })
      }

      const provider: Provider = {
        id: 'test',
        name: 'Test',
        type: 'codex',
        baseUrl: 'https://example.com',
        apiKey: 'test-key',
        createdAt: Date.now(),
      }
      writeCodexConfig(provider)

      expect(fs.existsSync(parentDir)).toBe(true)
      expect(fileExists(codexPath)).toBe(true)
      expect(fileExists(getCodexAuthPath())).toBe(true)
    })
  })
})

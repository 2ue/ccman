import { describe, it, expect, beforeEach } from 'vitest'
import { writeCodexConfig } from './codex'
import { getCodexConfigPath, getCodexAuthPath, __setTestPaths } from '../paths'
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
        baseUrl: 'https://gmn.chuangzuoli.com',
        apiKey: 'test-api-key-123',
        createdAt: Date.now(),
      }

      writeCodexConfig(provider)

      const configContent = fs.readFileSync(getCodexConfigPath(), 'utf-8')
      const config: any = TOML.parse(configContent)

      expect(config.model_provider).toBe('gmn')
      expect(config.model).toBe('gpt-5.2-codex')
      expect(config.model_providers.gmn).toBeDefined()
      expect(config.model_providers.gmn.base_url).toBe(provider.baseUrl)
      expect(config.model_providers.GMN).toBeUndefined()
    })

    it('should remove deprecated web_search_request and legacy ccman feature keys', () => {
      const configPath = getCodexConfigPath()
      fs.mkdirSync(path.dirname(configPath), { recursive: true })

      const existingConfig = {
        model_provider: 'GMN',
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
          plan_tool: true,
          view_image_tool: true,
          rmcp_client: true,
          streamable_shell: true,
          apply_patch_freeform: true,
        },
      }

      fs.writeFileSync(configPath, TOML.stringify(existingConfig as any), 'utf-8')

      const provider: Provider = {
        id: 'test-id',
        name: 'GMN',
        type: 'codex',
        baseUrl: 'https://gmn.chuangzuoli.com',
        apiKey: 'test-api-key-123',
        createdAt: Date.now(),
      }
      writeCodexConfig(provider)

      const configContent = fs.readFileSync(getCodexConfigPath(), 'utf-8')
      const config: any = TOML.parse(configContent)

      expect(config.features?.web_search_request).toBeUndefined()
      expect(config.features?.plan_tool).toBeUndefined()
      expect(config.features?.view_image_tool).toBeUndefined()
      expect(config.features?.rmcp_client).toBeUndefined()
      expect(config.features?.streamable_shell).toBeUndefined()
      expect(config.features?.apply_patch_freeform).toBe(true)
    })

    it('should preserve other fields when updating', () => {
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

      expect(config.model_provider).toBe('NewProvider')
      expect(config.model_providers.NewProvider.base_url).toBe('https://new.example.com')
      expect(config.model).toBe('some-model')
      expect(config.custom_field).toBe('should-be-preserved')

      // 验证 auth.json
      const authContent = fs.readFileSync(authPath, 'utf-8')
      const auth = JSON.parse(authContent)
      expect(auth.OPENAI_API_KEY).toBe('new-key')
      expect(auth.CUSTOM_FIELD).toBeUndefined()

      // 覆盖前应生成备份，并保留原始内容
      const backupPath = `${authPath}.bak`
      expect(fs.existsSync(backupPath)).toBe(true)
      const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
      expect(backup.OPENAI_API_KEY).toBe('old-key')
      expect(backup.CUSTOM_FIELD).toBe('should-be-preserved')
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

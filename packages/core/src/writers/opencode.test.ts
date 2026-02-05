import { describe, it, expect, beforeEach } from 'vitest'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import { writeOpenCodeConfig } from './opencode'
import { getOpenCodeConfigPath, __setTestPaths } from '../paths'
import { fileExists } from '../utils/file'

describe('OpenCode Writer', () => {
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
      opencode: path.join(testDir, '.config', 'opencode'),
    })

    // 清理测试文件
    const configPath = getOpenCodeConfigPath()
    if (fileExists(configPath)) {
      fs.unlinkSync(configPath)
    }
  })

  describe('writeOpenCodeConfig', () => {
    it('should create new opencode.json with openai provider and model', () => {
      const now = Date.now()
      const provider = {
        id: 'test-id',
        name: 'GMN',
        baseUrl: 'https://gmn.chuangzuoli.com',
        apiKey: 'test-api-key-123',
        createdAt: now,
        lastModified: now,
      }

      writeOpenCodeConfig(provider)

      const configPath = getOpenCodeConfigPath()
      expect(fileExists(configPath)).toBe(true)

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

      expect(config.$schema).toBe('https://opencode.ai/config.json')
      expect(config.model).toBe('openai/gpt-5.2-codex')

      expect(config.provider?.openai?.options?.baseURL).toBe(provider.baseUrl)
      expect(config.provider?.openai?.options?.apiKey).toBe(provider.apiKey)

      expect(config.agent?.build?.options?.store).toBe(false)
      expect(config.agent?.plan?.options?.store).toBe(false)

      expect(config.provider?.openai?.models?.['gpt-5.2-codex']?.options?.store).toBe(false)
      const variantKeys = Object.keys(
        config.provider?.openai?.models?.['gpt-5.2-codex']?.variants || {}
      ).sort()
      expect(variantKeys).toEqual(['high', 'low', 'medium', 'xhigh'].sort())
    })

    it('should preserve existing fields and force-update baseURL/apiKey + store flags', () => {
      const configPath = getOpenCodeConfigPath()
      fs.mkdirSync(path.dirname(configPath), { recursive: true })

      fs.writeFileSync(
        configPath,
        JSON.stringify(
          {
            $schema: 'https://opencode.ai/config.json',
            theme: 'my-theme',
            model: 'openai/gpt-5.2-codex',
            agent: {
              build: { options: { store: true, other: 'keep' } },
              plan: { options: { store: true } },
              customAgentField: { enabled: true },
            },
            provider: {
              openai: {
                options: {
                  baseURL: 'https://old.example.com/v1',
                  apiKey: 'old-key',
                  timeout: 12345,
                },
                models: {
                  'gpt-5.2-codex': {
                    options: { store: true },
                    variants: { low: { disabled: true } },
                    extra: 'keep',
                  },
                },
              },
              other: { options: { apiKey: 'should-not-change' } },
            },
          },
          null,
          2
        ),
        'utf-8'
      )

      const now = Date.now()
      const provider = {
        id: 'new-id',
        name: 'New Provider',
        baseUrl: 'https://new.example.com/v1',
        apiKey: 'new-key',
        createdAt: now,
        lastModified: now,
      }

      writeOpenCodeConfig(provider)

      const nextConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

      // preserved
      expect(nextConfig.theme).toBe('my-theme')
      expect(nextConfig.provider.other.options.apiKey).toBe('should-not-change')
      expect(nextConfig.provider.openai.options.timeout).toBe(12345)
      expect(nextConfig.provider.openai.models['gpt-5.2-codex'].variants.low.disabled).toBe(true)
      expect(nextConfig.provider.openai.models['gpt-5.2-codex'].extra).toBe('keep')
      expect(nextConfig.agent.customAgentField.enabled).toBe(true)

      // forced updates
      expect(nextConfig.provider.openai.options.baseURL).toBe(provider.baseUrl)
      expect(nextConfig.provider.openai.options.apiKey).toBe(provider.apiKey)
      expect(nextConfig.agent.build.options.store).toBe(false)
      expect(nextConfig.agent.plan.options.store).toBe(false)
      expect(nextConfig.provider.openai.models['gpt-5.2-codex'].options.store).toBe(false)
    })
  })
})

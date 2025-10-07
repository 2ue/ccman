import { describe, it, expect, beforeEach } from 'vitest'
import { writeClaudeCodeConfig } from './claudecode'
import { getClaudeConfigPath, __setTestPaths } from '../paths'
import { fileExists } from '../utils/file'
import type { Provider } from '../types'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

describe('Claude Writer', () => {
  beforeEach(() => {
    // 设置测试环境路径（使用随机数避免并发冲突）
    const testDir = path.join(os.tmpdir(), `ccman-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    __setTestPaths({
      ccman: path.join(testDir, '.ccman'),
      codex: path.join(testDir, '.codex'),
      claude: path.join(testDir, '.claude'),
    })

    // 清理测试文件
    const claudePath = getClaudeConfigPath()
    if (fileExists(claudePath)) {
      fs.unlinkSync(claudePath)
    }
  })

  describe('writeClaudeCodeConfig', () => {
    it('should create new config file', () => {
      const provider: Provider = {
        id: 'test-id',
        name: 'Test',
        type: 'claude',
        baseUrl: 'https://test.anthropic.com',
        apiKey: 'sk-ant-test-key-123',
        createdAt: Date.now(),
      }

      writeClaudeCodeConfig(provider)

      const claudePath = getClaudeConfigPath()
      expect(fileExists(claudePath)).toBe(true)

      const content = fs.readFileSync(claudePath, 'utf-8')
      const config = JSON.parse(content)

      expect(config.env?.ANTHROPIC_AUTH_TOKEN).toBe(provider.apiKey)
      expect(config.env?.ANTHROPIC_BASE_URL).toBe(provider.baseUrl)
    })

    it('should preserve other fields when updating', () => {
      const claudePath = getClaudeConfigPath()

      // 创建包含额外字段的配置
      const existingConfig = {
        env: {
          ANTHROPIC_AUTH_TOKEN: 'old-key',
          ANTHROPIC_BASE_URL: 'https://old.anthropic.com',
          CUSTOM_ENV_VAR: 'should-be-preserved',
        },
        permissions: {
          allow: ['*'],
        },
        customField: 'should-be-preserved',
      }

      fs.mkdirSync(path.dirname(claudePath), { recursive: true })
      fs.writeFileSync(claudePath, JSON.stringify(existingConfig, null, 2), 'utf-8')

      // 更新配置
      const provider: Provider = {
        id: 'test-id',
        name: 'Test',
        type: 'claude',
        baseUrl: 'https://new.anthropic.com',
        apiKey: 'new-key',
        createdAt: Date.now(),
      }
      writeClaudeCodeConfig(provider)

      // 验证
      const content = fs.readFileSync(claudePath, 'utf-8')
      const config = JSON.parse(content)

      expect(config.env.ANTHROPIC_AUTH_TOKEN).toBe('new-key')
      expect(config.env.ANTHROPIC_BASE_URL).toBe('https://new.anthropic.com')
      expect(config.env.CUSTOM_ENV_VAR).toBe('should-be-preserved')
      expect(config.permissions).toEqual({ allow: ['*'], deny: [] })
      expect(config.customField).toBe('should-be-preserved')
    })

    it('should handle baseUrl without trailing slash', () => {
      const provider: Provider = {
        id: 'test',
        name: 'Test',
        type: 'claude',
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'test-key',
        createdAt: Date.now(),
      }
      writeClaudeCodeConfig(provider)

      const content = fs.readFileSync(getClaudeConfigPath(), 'utf-8')
      const config = JSON.parse(content)

      expect(config.env.ANTHROPIC_BASE_URL).toBe('https://api.anthropic.com')
    })

    it('should handle baseUrl with trailing slash', () => {
      const provider: Provider = {
        id: 'test',
        name: 'Test',
        type: 'claude',
        baseUrl: 'https://api.anthropic.com/',
        apiKey: 'test-key',
        createdAt: Date.now(),
      }
      writeClaudeCodeConfig(provider)

      const content = fs.readFileSync(getClaudeConfigPath(), 'utf-8')
      const config = JSON.parse(content)

      expect(config.env.ANTHROPIC_BASE_URL).toBe('https://api.anthropic.com/')
    })

    it('should create parent directory if not exists', () => {
      const claudePath = getClaudeConfigPath()
      const parentDir = path.dirname(claudePath)

      // 确保父目录不存在
      if (fs.existsSync(parentDir)) {
        fs.rmSync(parentDir, { recursive: true })
      }

      const provider: Provider = {
        id: 'test',
        name: 'Test',
        type: 'claude',
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'test-key',
        createdAt: Date.now(),
      }
      writeClaudeCodeConfig(provider)

      expect(fs.existsSync(parentDir)).toBe(true)
      expect(fileExists(claudePath)).toBe(true)
    })

    it('should format JSON with 2-space indentation', () => {
      const provider: Provider = {
        id: 'test',
        name: 'Test',
        type: 'claude',
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'test-key',
        createdAt: Date.now(),
      }
      writeClaudeCodeConfig(provider)

      const content = fs.readFileSync(getClaudeConfigPath(), 'utf-8')

      // 验证缩进格式
      expect(content).toContain('  "env"')
      expect(content).toContain('    "ANTHROPIC_AUTH_TOKEN"')
    })
  })
})

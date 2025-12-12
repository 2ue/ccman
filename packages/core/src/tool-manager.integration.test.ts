/**
 * tool-manager 集成测试
 *
 * 验证 tool-manager 委托给 ProviderService 后功能是否正常
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
// 导入 tools/index.js 以触发工具注册
import './tools/index.js'
import { createClaudeManager } from './tool-manager.js'
import { ProviderService } from './services/provider-service.js'
import { setRootDir, resetRootDir } from './adapters/path-resolver.js'

describe('tool-manager integration', () => {
  let testDir: string

  beforeEach(() => {
    // 创建测试目录
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccman-test-'))
    setRootDir(testDir)

    // 确保 .ccman 目录存在
    const ccmanDir = path.join(testDir, '.ccman')
    fs.mkdirSync(ccmanDir, { recursive: true })
  })

  afterEach(() => {
    // 清理测试目录
    resetRootDir()
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true })
    }
  })

  describe('createClaudeManager delegation', () => {
    it('should add provider via manager and see it via ProviderService', () => {
      const claudeManager = createClaudeManager()

      // 通过 manager 添加
      const provider = claudeManager.add({
        name: 'test-provider',
        baseUrl: 'https://api.test.com',
        apiKey: 'sk-test',
      })

      expect(provider.name).toBe('test-provider')
      expect(provider.id).toMatch(/^claude-code-\d+-[a-z0-9]+$/)

      // 通过 ProviderService 验证
      const fromService = ProviderService.list('claude-code')
      expect(fromService.length).toBe(1)
      expect(fromService[0].name).toBe('test-provider')
    })

    it('should add provider via ProviderService and see it via manager', () => {
      // 通过 ProviderService 添加
      const provider = ProviderService.add('claude-code', {
        name: 'service-provider',
        baseUrl: 'https://api.service.com',
        apiKey: 'sk-service',
      })

      expect(provider.name).toBe('service-provider')

      // 通过 manager 验证
      const claudeManager = createClaudeManager()
      const fromManager = claudeManager.list()
      expect(fromManager.length).toBe(1)
      expect(fromManager[0].name).toBe('service-provider')
    })

    it('should have consistent data between manager and service', () => {
      const claudeManager = createClaudeManager()

      // 添加多个 providers
      claudeManager.add({ name: 'provider1', baseUrl: 'https://1.com', apiKey: 'sk-1' })
      ProviderService.add('claude-code', {
        name: 'provider2',
        baseUrl: 'https://2.com',
        apiKey: 'sk-2',
      })
      claudeManager.add({ name: 'provider3', baseUrl: 'https://3.com', apiKey: 'sk-3' })

      // 验证数据一致
      const fromManager = claudeManager
        .list()
        .map((p) => p.name)
        .sort()
      const fromService = ProviderService.list('claude-code')
        .map((p) => p.name)
        .sort()

      expect(fromManager).toEqual(fromService)
      expect(fromManager).toEqual(['provider1', 'provider2', 'provider3'])
    })

    it('should use claude-code.json as storage file', () => {
      const claudeManager = createClaudeManager()

      claudeManager.add({
        name: 'storage-test',
        baseUrl: 'https://api.storage.com',
        apiKey: 'sk-storage',
      })

      // 验证存储文件是 claude-code.json
      const claudeCodePath = path.join(testDir, '.ccman', 'claude-code.json')
      const claudePath = path.join(testDir, '.ccman', 'claude.json')

      expect(fs.existsSync(claudeCodePath)).toBe(true)
      expect(fs.existsSync(claudePath)).toBe(false)

      // 验证内容
      const content = JSON.parse(fs.readFileSync(claudeCodePath, 'utf-8'))
      expect(content.providers.length).toBe(1)
      expect(content.providers[0].name).toBe('storage-test')
    })
  })
})

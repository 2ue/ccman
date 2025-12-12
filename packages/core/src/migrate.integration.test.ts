/**
 * migrate 集成测试
 *
 * 验证 v3.2 → v3.3 数据迁移功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { migrateV32ToV33, runAllMigrations } from './migrate.js'
import { setRootDir, resetRootDir } from './adapters/path-resolver.js'

describe('migrate v3.2 → v3.3', () => {
  let testDir: string

  beforeEach(() => {
    // 创建测试目录
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccman-migrate-test-'))
    setRootDir(testDir)

    // 确保 .ccman 目录存在
    const ccmanDir = path.join(testDir, '.ccman')
    fs.mkdirSync(ccmanDir, { recursive: true })
  })

  afterEach(() => {
    // 清理测试目录
    resetRootDir()
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('migrateV32ToV33', () => {
    it('should rename claude.json to claude-code.json', () => {
      const ccmanDir = path.join(testDir, '.ccman')
      const oldPath = path.join(ccmanDir, 'claude.json')
      const newPath = path.join(ccmanDir, 'claude-code.json')

      // 创建旧配置文件
      const config = {
        providers: [
          {
            id: 'test-1',
            name: 'Test Provider',
            baseUrl: 'https://api.test.com',
            apiKey: 'sk-test',
          },
        ],
        presets: [],
      }
      fs.writeFileSync(oldPath, JSON.stringify(config, null, 2))

      // 执行迁移
      const result = migrateV32ToV33()

      expect(result.success).toBe(true)
      expect(result.details?.migratedFiles).toContain('claude.json → claude-code.json')
      expect(fs.existsSync(newPath)).toBe(true)
      expect(fs.existsSync(oldPath)).toBe(false)

      // 验证内容
      const newContent = JSON.parse(fs.readFileSync(newPath, 'utf-8'))
      expect(newContent.providers[0].name).toBe('Test Provider')
    })

    it('should rename gemini.json to gemini-cli.json', () => {
      const ccmanDir = path.join(testDir, '.ccman')
      const oldPath = path.join(ccmanDir, 'gemini.json')
      const newPath = path.join(ccmanDir, 'gemini-cli.json')

      // 创建旧配置文件
      const config = {
        providers: [
          {
            id: 'gemini-1',
            name: 'Gemini Provider',
            baseUrl: 'https://api.gemini.com',
            apiKey: 'sk-gemini',
          },
        ],
        presets: [],
      }
      fs.writeFileSync(oldPath, JSON.stringify(config, null, 2))

      // 执行迁移
      const result = migrateV32ToV33()

      expect(result.success).toBe(true)
      expect(result.details?.migratedFiles).toContain('gemini.json → gemini-cli.json')
      expect(fs.existsSync(newPath)).toBe(true)
      expect(fs.existsSync(oldPath)).toBe(false)
    })

    it('should merge when new file already exists', () => {
      const ccmanDir = path.join(testDir, '.ccman')
      const oldPath = path.join(ccmanDir, 'claude.json')
      const newPath = path.join(ccmanDir, 'claude-code.json')

      // 创建旧配置文件
      const oldConfig = {
        providers: [
          { id: 'old-1', name: 'Old Provider', baseUrl: 'https://old.com', apiKey: 'sk-old' },
        ],
        presets: [],
      }
      fs.writeFileSync(oldPath, JSON.stringify(oldConfig, null, 2))

      // 创建新配置文件（已存在）
      const newConfig = {
        providers: [
          { id: 'new-1', name: 'New Provider', baseUrl: 'https://new.com', apiKey: 'sk-new' },
        ],
        presets: [],
      }
      fs.writeFileSync(newPath, JSON.stringify(newConfig, null, 2))

      // 执行迁移
      const result = migrateV32ToV33()

      expect(result.success).toBe(true)
      expect(result.details?.mergedFiles).toContain('claude.json → claude-code.json')
      expect(fs.existsSync(oldPath)).toBe(false) // 旧文件被备份删除

      // 验证合并结果
      const mergedContent = JSON.parse(fs.readFileSync(newPath, 'utf-8'))
      expect(mergedContent.providers.length).toBe(2)
      expect(mergedContent.providers.map((p: { name: string }) => p.name)).toContain('New Provider')
      expect(mergedContent.providers.map((p: { name: string }) => p.name)).toContain('Old Provider')
    })

    it('should skip when old file does not exist', () => {
      // 不创建任何文件

      // 执行迁移
      const result = migrateV32ToV33()

      expect(result.success).toBe(true)
      expect(result.message).toContain('无需迁移')
      expect(result.details?.skippedFiles).toContain('claude.json')
      expect(result.details?.skippedFiles).toContain('gemini.json')
    })

    it('should create backup files', () => {
      const ccmanDir = path.join(testDir, '.ccman')
      const oldPath = path.join(ccmanDir, 'claude.json')

      // 创建旧配置文件
      const config = {
        providers: [
          {
            id: 'backup-test',
            name: 'Backup Test',
            baseUrl: 'https://test.com',
            apiKey: 'sk-test',
          },
        ],
      }
      fs.writeFileSync(oldPath, JSON.stringify(config, null, 2))

      // 执行迁移
      const result = migrateV32ToV33()

      expect(result.success).toBe(true)
      expect(result.details?.backups?.length).toBeGreaterThan(0)

      // 验证备份文件存在
      const backupPath = result.details?.backups?.[0]
      expect(backupPath).toBeDefined()
      expect(fs.existsSync(backupPath!)).toBe(true)
    })
  })

  describe('runAllMigrations', () => {
    it('should run all migrations successfully', () => {
      const result = runAllMigrations()

      expect(result.success).toBe(true)
      expect(result.messages.length).toBe(3)
      expect(result.messages.some((m) => m.includes('[v3.2→v3.3]'))).toBe(true)
    })
  })
})

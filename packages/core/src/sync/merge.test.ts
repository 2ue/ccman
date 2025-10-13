import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { backupConfig } from './merge'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

describe('backupConfig', () => {
  let testDir: string
  let testConfigPath: string

  beforeEach(() => {
    // 创建临时测试目录
    testDir = path.join(os.tmpdir(), `ccman-backup-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    fs.mkdirSync(testDir, { recursive: true })

    // 创建测试配置文件
    testConfigPath = path.join(testDir, 'test-config.json')
    fs.writeFileSync(testConfigPath, JSON.stringify({ test: 'data' }, null, 2))
  })

  afterEach(() => {
    // 清理测试目录
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('应该创建备份文件', () => {
    const backupPath = backupConfig(testConfigPath)

    expect(fs.existsSync(backupPath)).toBe(true)
    expect(backupPath).toMatch(/test-config\.json\.backup\.\d+/)

    // 验证备份内容与原文件一致
    const originalContent = fs.readFileSync(testConfigPath, 'utf-8')
    const backupContent = fs.readFileSync(backupPath, 'utf-8')
    expect(backupContent).toBe(originalContent)
  })

  it('应该只保留最近 3 个备份（默认）', async () => {
    // 创建 5 个备份
    const backupPaths: string[] = []
    for (let i = 0; i < 5; i++) {
      // 延迟以确保时间戳不同
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 10))
      const backupPath = backupConfig(testConfigPath)
      backupPaths.push(backupPath)
    }

    // 检查目录中的备份文件数量
    const files = fs.readdirSync(testDir)
    const backupFiles = files.filter(f => f.startsWith('test-config.json.backup.'))

    expect(backupFiles.length).toBe(3)

    // 验证最旧的两个备份已被删除
    expect(fs.existsSync(backupPaths[0])).toBe(false) // 最旧
    expect(fs.existsSync(backupPaths[1])).toBe(false) // 第二旧

    // 验证最新的三个备份仍然存在
    expect(fs.existsSync(backupPaths[2])).toBe(true)
    expect(fs.existsSync(backupPaths[3])).toBe(true)
    expect(fs.existsSync(backupPaths[4])).toBe(true) // 最新
  })

  it('应该支持自定义保留数量', async () => {
    const keepCount = 2

    // 创建 4 个备份
    const backupPaths: string[] = []
    for (let i = 0; i < 4; i++) {
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 10))
      const backupPath = backupConfig(testConfigPath, keepCount)
      backupPaths.push(backupPath)
    }

    // 检查目录中的备份文件数量
    const files = fs.readdirSync(testDir)
    const backupFiles = files.filter(f => f.startsWith('test-config.json.backup.'))

    expect(backupFiles.length).toBe(keepCount)

    // 验证只保留最新的 2 个
    expect(fs.existsSync(backupPaths[0])).toBe(false)
    expect(fs.existsSync(backupPaths[1])).toBe(false)
    expect(fs.existsSync(backupPaths[2])).toBe(true)
    expect(fs.existsSync(backupPaths[3])).toBe(true)
  })

  it('应该处理保留数量为 1 的情况', async () => {
    const keepCount = 1

    // 创建 3 个备份
    const backupPaths: string[] = []
    for (let i = 0; i < 3; i++) {
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 10))
      const backupPath = backupConfig(testConfigPath, keepCount)
      backupPaths.push(backupPath)
    }

    // 检查目录中的备份文件数量
    const files = fs.readdirSync(testDir)
    const backupFiles = files.filter(f => f.startsWith('test-config.json.backup.'))

    expect(backupFiles.length).toBe(1)

    // 只有最新的备份存在
    expect(fs.existsSync(backupPaths[0])).toBe(false)
    expect(fs.existsSync(backupPaths[1])).toBe(false)
    expect(fs.existsSync(backupPaths[2])).toBe(true)
  })

  it('应该处理保留数量大于实际备份数的情况', async () => {
    const keepCount = 10

    // 只创建 3 个备份
    const backupPaths: string[] = []
    for (let i = 0; i < 3; i++) {
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 10))
      const backupPath = backupConfig(testConfigPath, keepCount)
      backupPaths.push(backupPath)
    }

    // 检查目录中的备份文件数量
    const files = fs.readdirSync(testDir)
    const backupFiles = files.filter(f => f.startsWith('test-config.json.backup.'))

    // 应该保留所有 3 个备份
    expect(backupFiles.length).toBe(3)
    expect(fs.existsSync(backupPaths[0])).toBe(true)
    expect(fs.existsSync(backupPaths[1])).toBe(true)
    expect(fs.existsSync(backupPaths[2])).toBe(true)
  })

  it('应该在配置文件不存在时抛出错误', () => {
    const nonExistentPath = path.join(testDir, 'non-existent.json')

    expect(() => backupConfig(nonExistentPath)).toThrow('配置文件不存在')
  })

  it('应该忽略格式不正确的备份文件', async () => {
    // 创建一些格式不正确的文件
    fs.writeFileSync(path.join(testDir, 'test-config.json.backup.invalid'), 'invalid')
    fs.writeFileSync(path.join(testDir, 'test-config.json.backup.'), 'empty')
    fs.writeFileSync(path.join(testDir, 'test-config.json.backup.abc'), 'abc')

    // 创建 2 个有效备份
    backupConfig(testConfigPath, 3)
    await new Promise(resolve => setTimeout(resolve, 10))
    backupConfig(testConfigPath, 3)

    // 检查目录中的所有备份相关文件
    const files = fs.readdirSync(testDir)
    const allBackupFiles = files.filter(f => f.includes('.backup'))
    const validBackupFiles = files.filter(f => /test-config\.json\.backup\.\d+$/.test(f))

    // 应该有 3 个无效文件 + 2 个有效文件
    expect(allBackupFiles.length).toBe(5)
    expect(validBackupFiles.length).toBe(2)

    // 无效文件不应被删除
    expect(fs.existsSync(path.join(testDir, 'test-config.json.backup.invalid'))).toBe(true)
    expect(fs.existsSync(path.join(testDir, 'test-config.json.backup.'))).toBe(true)
    expect(fs.existsSync(path.join(testDir, 'test-config.json.backup.abc'))).toBe(true)
  })

  it('应该为不同配置文件维护独立的备份', async () => {
    // 创建另一个配置文件
    const anotherConfigPath = path.join(testDir, 'another-config.json')
    fs.writeFileSync(anotherConfigPath, JSON.stringify({ another: 'data' }, null, 2))

    // 为第一个配置创建 2 个备份
    backupConfig(testConfigPath, 3)
    await new Promise(resolve => setTimeout(resolve, 10))
    backupConfig(testConfigPath, 3)

    // 为第二个配置创建 2 个备份
    await new Promise(resolve => setTimeout(resolve, 10))
    backupConfig(anotherConfigPath, 3)
    await new Promise(resolve => setTimeout(resolve, 10))
    backupConfig(anotherConfigPath, 3)

    // 检查两个配置的备份数量
    const files = fs.readdirSync(testDir)
    const testBackups = files.filter(f => f.startsWith('test-config.json.backup.'))
    const anotherBackups = files.filter(f => f.startsWith('another-config.json.backup.'))

    expect(testBackups.length).toBe(2)
    expect(anotherBackups.length).toBe(2)
  })

  it('应该按时间戳正确排序备份文件', () => {
    // 手动创建一些备份文件，使用特定的时间戳
    const timestamps = [1000000000000, 1000000001000, 1000000002000, 1000000003000, 1000000004000]

    for (const ts of timestamps) {
      const backupPath = `${testConfigPath}.backup.${ts}`
      fs.copyFileSync(testConfigPath, backupPath)
    }

    // 现在创建一个新备份，应该删除最旧的 3 个
    backupConfig(testConfigPath, 3)

    // 检查剩余的备份
    const files = fs.readdirSync(testDir)
    const backupFiles = files.filter(f => f.startsWith('test-config.json.backup.'))

    expect(backupFiles.length).toBe(3)

    // 最旧的三个应该被删除
    expect(fs.existsSync(`${testConfigPath}.backup.1000000000000`)).toBe(false)
    expect(fs.existsSync(`${testConfigPath}.backup.1000000001000`)).toBe(false)
    expect(fs.existsSync(`${testConfigPath}.backup.1000000002000`)).toBe(false)

    // 最新的三个应该保留（包括刚创建的）
    expect(fs.existsSync(`${testConfigPath}.backup.1000000003000`)).toBe(true)
    expect(fs.existsSync(`${testConfigPath}.backup.1000000004000`)).toBe(true)

    // 新创建的备份应该存在
    const newBackupFiles = backupFiles.filter(f => {
      const ts = parseInt(f.substring('test-config.json.backup.'.length), 10)
      return ts > 1000000004000
    })
    expect(newBackupFiles.length).toBe(1)
  })
})

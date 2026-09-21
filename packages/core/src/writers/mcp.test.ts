import { describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { createMCPManager } from '../tool-manager.js'
import { __setTestPaths, getClaudeConfigPath } from '../paths.js'
import { loadMCPConfig } from './mcp.js'

describe('MCP writer', () => {
  beforeEach(() => {
    const testDir = path.join(
      os.tmpdir(),
      `ccman-mcp-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    __setTestPaths({
      ccman: path.join(testDir, '.ccman'),
      claude: path.join(testDir, '.claude'),
      gemini: path.join(testDir, '.gemini'),
    })
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  it('removes the old application key when a managed server is renamed', () => {
    const manager = createMCPManager()
    const server = manager.add({
      name: 'old-server-name',
      baseUrl: 'npx',
      apiKey: '-y @example/mcp-server',
    })

    let claudeConfig = JSON.parse(fs.readFileSync(getClaudeConfigPath(), 'utf-8'))
    expect(claudeConfig.mcpServers['old-server-name']).toBeDefined()

    manager.edit(server.id, { name: 'new-server-name' })

    claudeConfig = JSON.parse(fs.readFileSync(getClaudeConfigPath(), 'utf-8'))
    expect(claudeConfig.mcpServers['old-server-name']).toBeUndefined()
    expect(claudeConfig.mcpServers['new-server-name']).toMatchObject({
      command: 'npx',
      args: ['-y', '@example/mcp-server'],
    })
    expect(loadMCPConfig().managedServerNames.claude).toEqual(['new-server-name'])
  })

  it('removes an application key when a managed server is deleted', () => {
    const manager = createMCPManager()
    const server = manager.add({
      name: 'server-to-delete',
      baseUrl: 'npx',
      apiKey: '-y @example/mcp-server',
    })

    expect(
      JSON.parse(fs.readFileSync(getClaudeConfigPath(), 'utf-8')).mcpServers['server-to-delete']
    ).toBeDefined()

    manager.remove(server.id)

    const claudeConfig = JSON.parse(fs.readFileSync(getClaudeConfigPath(), 'utf-8'))
    expect(claudeConfig.mcpServers['server-to-delete']).toBeUndefined()
    expect(loadMCPConfig().managedServerNames.claude).toEqual([])
  })
})

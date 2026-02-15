import { describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { __setTestPaths, getCcmanDir } from './paths.js'
import { validateExport, exportConfig, validateImportDir, importConfig } from './export.js'

describe('export/import', () => {
  beforeEach(() => {
    const testDir = path.join(
      os.tmpdir(),
      `ccman-export-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )

    __setTestPaths({
      ccman: path.join(testDir, '.ccman'),
      codex: path.join(testDir, '.codex'),
      claude: path.join(testDir, '.claude'),
      opencode: path.join(testDir, '.config', 'opencode'),
      openclaw: path.join(testDir, '.openclaw'),
    })

    fs.rmSync(path.join(testDir, '.ccman'), { recursive: true, force: true })
  })

  it('should allow export when only openclaw.json exists', () => {
    const ccmanDir = getCcmanDir()
    fs.mkdirSync(ccmanDir, { recursive: true })
    fs.writeFileSync(
      path.join(ccmanDir, 'openclaw.json'),
      JSON.stringify({ providers: [], presets: [] }, null, 2),
      'utf-8'
    )

    const validation = validateExport()
    expect(validation.valid).toBe(true)
    expect(validation.foundFiles).toEqual(['openclaw.json'])

    const targetDir = path.join(os.tmpdir(), `ccman-export-target-${Date.now()}`)
    const result = exportConfig(targetDir)
    expect(result.success).toBe(true)
    expect(result.exportedFiles).toEqual(['openclaw.json'])
    expect(fs.existsSync(path.join(targetDir, 'openclaw.json'))).toBe(true)
  })

  it('should allow import when source only contains openclaw.json', () => {
    const sourceDir = path.join(os.tmpdir(), `ccman-import-source-${Date.now()}`)
    fs.mkdirSync(sourceDir, { recursive: true })
    fs.writeFileSync(
      path.join(sourceDir, 'openclaw.json'),
      JSON.stringify({ currentProviderId: 'x', providers: [{ id: 'x' }], presets: [] }, null, 2),
      'utf-8'
    )

    const ccmanDir = getCcmanDir()
    fs.mkdirSync(ccmanDir, { recursive: true })
    fs.writeFileSync(
      path.join(ccmanDir, 'openclaw.json'),
      JSON.stringify({ currentProviderId: 'legacy', providers: [] }, null, 2),
      'utf-8'
    )

    const validation = validateImportDir(sourceDir)
    expect(validation.valid).toBe(true)
    expect(validation.foundFiles).toEqual(['openclaw.json'])

    const result = importConfig(sourceDir)
    expect(result.success).toBe(true)
    expect(result.importedFiles).toEqual(['openclaw.json'])
    expect(result.backupPaths.length).toBe(1)

    const imported = JSON.parse(fs.readFileSync(path.join(ccmanDir, 'openclaw.json'), 'utf-8'))
    expect(imported.currentProviderId).toBe('x')
  })
})

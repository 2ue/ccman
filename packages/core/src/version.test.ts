import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { resolveVersionFromRuntimeDir } from './version'

function writePackageJson(filePath: string, version: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify({ version }), 'utf-8')
}

describe('version resolution', () => {
  it('resolves ../package.json for CLI-style dist layout', () => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccman-version-cli-'))
    const runtimeDir = path.join(testDir, 'lib', 'node_modules', 'ccman', 'dist')
    writePackageJson(path.join(testDir, 'lib', 'node_modules', 'ccman', 'package.json'), '3.3.22')

    expect(resolveVersionFromRuntimeDir(runtimeDir)).toBe('3.3.22')
  })

  it('falls back to ../../package.json for bundled desktop layout', () => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccman-version-desktop-'))
    const runtimeDir = path.join(testDir, 'dist', 'main')
    writePackageJson(path.join(testDir, 'package.json'), '3.3.22')

    expect(resolveVersionFromRuntimeDir(runtimeDir)).toBe('3.3.22')
  })
})

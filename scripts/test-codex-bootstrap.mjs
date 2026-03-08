#!/usr/bin/env node

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  planCodexBootstrap,
  resolveProviderProfile,
  satisfiesVersionRange,
} from './codex-bootstrap-lib.mjs'

const INSTALLER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'install-codex.mjs')
const SHELL_INSTALLER = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'install-codex.sh'
)

function createSnapshot(overrides = {}) {
  return {
    platform: 'darwin',
    arch: 'arm64',
    shell: '/bin/zsh',
    node: { installed: true, version: '20.19.0' },
    npm: { installed: true, version: '10.8.2' },
    codex: { installed: false, version: null },
    tools: {
      pnpm: true,
      curl: true,
      volta: false,
      fnm: false,
      nvm: false,
      mise: false,
      asdf: false,
      winget: false,
      choco: false,
      scoop: false,
    },
    metadata: {
      nvmPath: null,
    },
    ...overrides,
  }
}

function testVersionMatching() {
  assert.equal(satisfiesVersionRange('20.19.0', '>=16'), true)
  assert.equal(satisfiesVersionRange('18.17.1', '>=18 <22'), true)
  assert.equal(satisfiesVersionRange('16.20.2', '^16.14.0'), true)
  assert.equal(satisfiesVersionRange('17.0.0', '^16.14.0'), false)
}

function testPlannerVariants() {
  const providerProfile = resolveProviderProfile('gmn', '', '')

  const compatiblePlan = planCodexBootstrap({
    snapshot: createSnapshot(),
    requiredNodeRange: '>=16',
    providerProfile,
  })
  assert.equal(compatiblePlan.runtime.kind, 'reuse-node')

  const voltaPlan = planCodexBootstrap({
    snapshot: createSnapshot({
      node: { installed: true, version: '14.21.3' },
      tools: {
        pnpm: true,
        curl: true,
        volta: true,
        fnm: false,
        nvm: false,
        mise: false,
        asdf: false,
        winget: false,
        choco: false,
        scoop: false,
      },
    }),
    requiredNodeRange: '>=16',
    providerProfile,
  })
  assert.equal(voltaPlan.runtime.kind, 'use-manager')
  assert.equal(voltaPlan.runtime.manager, 'volta')

  const bootstrapPlan = planCodexBootstrap({
    snapshot: createSnapshot({
      node: { installed: false, version: null },
      tools: {
        pnpm: true,
        curl: true,
        volta: false,
        fnm: false,
        nvm: false,
        mise: false,
        asdf: false,
        winget: false,
        choco: false,
        scoop: false,
      },
    }),
    requiredNodeRange: '>=16',
    providerProfile,
  })
  assert.equal(bootstrapPlan.runtime.kind, 'bootstrap-volta')
}

function testDryRunFromSnapshot() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccman-codex-bootstrap-'))
  const snapshotPath = path.join(tempDir, 'snapshot.json')
  fs.writeFileSync(
    snapshotPath,
    JSON.stringify(
      createSnapshot({
        platform: 'win32',
        arch: 'x64',
        shell: 'powershell.exe',
        node: { installed: false, version: null },
        npm: { installed: false, version: null },
        codex: { installed: false, version: null },
        tools: {
          pnpm: false,
          curl: false,
          volta: false,
          fnm: false,
          nvm: false,
          mise: false,
          asdf: false,
          winget: true,
          choco: false,
          scoop: false,
        },
      }),
      null,
      2
    )
  )

  const result = spawnSync(
    process.execPath,
    [INSTALLER, '--dry-run', '--from-snapshot', snapshotPath],
    {
      encoding: 'utf-8',
    }
  )

  assert.equal(result.status, 0)
  assert.match(result.stdout, /Codex 安装计划/)
  assert.match(result.stdout, /引导 Volta/)
}

function testStandaloneShellDryRun() {
  const result = spawnSync('bash', [SHELL_INSTALLER, '--dry-run', '--provider', 'gmn1'], {
    encoding: 'utf-8',
  })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /步骤 1\/5 · 检测本机环境/)
  assert.match(result.stdout, /步骤 2\/5 · 生成安装计划/)
  assert.match(result.stdout, /Codex 安装计划/)
  assert.match(result.stdout, /https:\/\/gmncode\.cn/)
  assert.match(result.stdout, /\[DRY RUN\]/)
}

testVersionMatching()
testPlannerVariants()
testDryRunFromSnapshot()
testStandaloneShellDryRun()

console.log('✅ codex bootstrap simulation checks passed')

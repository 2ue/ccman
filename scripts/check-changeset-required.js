#!/usr/bin/env node

/**
 * Enforce changeset files for release-relevant pull request changes.
 *
 * Rules:
 * - If only docs/workflow/meta files changed, pass without changeset.
 * - If release-relevant files changed, require at least one .changeset/*.md file.
 */

const { execSync } = require('child_process')

function run(command) {
  return execSync(command, { encoding: 'utf8' }).trim()
}

function normalize(filePath) {
  return filePath.replace(/\\/g, '/')
}

function isChangesetFile(filePath) {
  return /^\.changeset\/[^/]+\.md$/i.test(filePath) && !/\.changeset\/README\.md$/i.test(filePath)
}

function isReleaseRelevant(filePath) {
  const file = normalize(filePath)

  if (isChangesetFile(file)) return false
  if (file.startsWith('.changeset/')) return false
  if (file.startsWith('docs/')) return false
  if (file.startsWith('.github/')) return false
  if (file === 'README.md') return false
  if (file === 'CHANGELOG.md') return false
  if (file.endsWith('.md')) return false

  return (
    file.startsWith('packages/') ||
    file.startsWith('scripts/') ||
    file === 'package.json' ||
    file === 'pnpm-lock.yaml' ||
    file === 'pnpm-workspace.yaml' ||
    file === '.changelogrc.js' ||
    file.startsWith('tsconfig')
  )
}

function main() {
  const baseRef = process.env.GITHUB_BASE_REF || 'main'
  const diffRange = process.env.CHANGESET_DIFF_RANGE || `origin/${baseRef}...HEAD`

  let diffOutput = ''
  try {
    diffOutput = run(`git diff --name-only ${diffRange}`)
  } catch (error) {
    console.error(`❌ 读取 diff 失败: ${diffRange}`)
    console.error(error.message)
    process.exit(1)
  }

  const changedFiles = diffOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalize)

  if (changedFiles.length === 0) {
    console.log('✅ 未检测到文件改动，跳过 changeset 检查')
    return
  }

  const hasReleaseRelevantChange = changedFiles.some(isReleaseRelevant)
  if (!hasReleaseRelevantChange) {
    console.log('✅ 本次改动不涉及发布相关文件，无需 changeset')
    return
  }

  const hasChangeset = changedFiles.some(isChangesetFile)
  if (hasChangeset) {
    console.log('✅ 检测到 changeset 文件，检查通过')
    return
  }

  console.error('❌ 检测到发布相关改动，但未包含 .changeset/*.md 文件')
  console.error('   请执行: pnpm changeset')
  console.error('   然后提交生成的 .changeset/*.md 文件')
  process.exit(1)
}

main()

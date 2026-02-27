#!/usr/bin/env node

/**
 * Incrementally update CHANGELOG.md while preserving historical content.
 *
 * Strategy:
 * - Keep existing CHANGELOG.md as-is.
 * - Generate complete changelog in memory via conventional-changelog (-r 0).
 * - If current version heading already exists, skip (idempotent).
 * - Insert new section before existing version sections, preserving preamble.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = process.cwd()
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md')
const PKG_PATH = path.join(ROOT, 'package.json')

function run(command) {
  return execSync(command, { encoding: 'utf8' })
}

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'))
  if (!pkg.version) {
    throw new Error('package.json 缺少 version 字段')
  }
  return String(pkg.version).trim()
}

function getCurrentVersionSection(version) {
  const full = run(
    'pnpm exec conventional-changelog -p conventionalcommits -r 0 --config .changelogrc.js'
  )

  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`## \\[${escapedVersion}\\][\\s\\S]*?(?=## \\[|$)`)
  const match = full.match(pattern)
  return match ? match[0].trim() : ''
}

function splitPreambleAndVersions(content) {
  const firstVersionIndex = content.search(/^## \[/m)
  if (firstVersionIndex < 0) {
    return { preamble: content.trimEnd(), versions: '' }
  }

  const preamble = content.slice(0, firstVersionIndex).trimEnd()
  const versions = content.slice(firstVersionIndex).trimStart()
  return { preamble, versions }
}

function main() {
  const version = getCurrentVersion()
  const heading = `## [${version}]`

  const existing = fs.existsSync(CHANGELOG_PATH)
    ? fs.readFileSync(CHANGELOG_PATH, 'utf8')
    : ''

  if (existing.includes(heading)) {
    console.log(`CHANGELOG.md 已包含 ${heading}，跳过更新`)
    return
  }

  const latestSection = getCurrentVersionSection(version)
  if (!latestSection) {
    console.log(`未找到版本 ${version} 的 changelog 段落，跳过更新`)
    return
  }

  const { preamble, versions } = splitPreambleAndVersions(existing)
  const hasPreamble = preamble.length > 0
  const hasVersions = versions.length > 0

  let nextContent = `${latestSection}\n`
  if (hasPreamble && hasVersions) {
    nextContent = `${preamble}\n\n${latestSection}\n\n${versions}`
  } else if (hasPreamble && !hasVersions) {
    nextContent = `${preamble}\n\n${latestSection}\n`
  } else if (!hasPreamble && hasVersions) {
    nextContent = `${latestSection}\n\n${versions}`
  }

  fs.writeFileSync(CHANGELOG_PATH, nextContent, 'utf8')
  console.log(`CHANGELOG.md 已增量更新: ${heading}`)
}

main()

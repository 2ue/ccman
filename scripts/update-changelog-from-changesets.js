#!/usr/bin/env node

/**
 * Update root CHANGELOG.md using pending .changeset/*.md files.
 *
 * Behavior:
 * - Prefer Changesets summaries for the current version.
 * - Preserve existing historical content in CHANGELOG.md.
 * - Optionally consume (archive) processed changeset files with --consume.
 * - Fallback to conventional changelog generator when no pending changesets.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = process.cwd()
const PKG_PATH = path.join(ROOT, 'package.json')
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md')
const CHANGESET_DIR = path.join(ROOT, '.changeset')
const REPO_COMPARE_BASE = 'https://github.com/2ue/ccman/compare'

const args = new Set(process.argv.slice(2))
const shouldConsume = args.has('--consume')
const shouldFallback = !args.has('--no-fallback')

const TYPE_RANK = { patch: 1, minor: 2, major: 3 }

function run(command) {
  return execSync(command, { encoding: 'utf8' }).trim()
}

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'))
  if (!pkg.version) {
    throw new Error('package.json 缺少 version 字段')
  }
  return String(pkg.version).trim()
}

function getDate() {
  return new Date().toISOString().slice(0, 10)
}

function getPreviousTag(version) {
  const currentTag = `v${version}`

  try {
    run(`git rev-parse --verify --quiet ${currentTag}`)
    const prev = run(`git describe --tags --abbrev=0 --match "v*" ${currentTag}^`)
    return prev && prev !== currentTag ? prev : ''
  } catch {
    try {
      const latest = run('git describe --tags --abbrev=0 --match "v*"')
      return latest && latest !== currentTag ? latest : ''
    } catch {
      return ''
    }
  }
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

function isChangesetMarkdown(fileName) {
  return fileName.endsWith('.md') && fileName.toLowerCase() !== 'readme.md'
}

function parseChangeset(content, fileName) {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/)
  if (!match) {
    throw new Error(`changeset 文件格式无效: ${fileName}`)
  }

  const frontmatter = match[1]
  const summary = match[2].trim()
  const releases = []

  for (const rawLine of frontmatter.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const releaseMatch = line.match(/^["']?(.+?)["']?\s*:\s*(major|minor|patch)\s*$/)
    if (!releaseMatch) {
      continue
    }

    releases.push({
      name: releaseMatch[1],
      type: releaseMatch[2],
    })
  }

  return { summary, releases }
}

function getPendingChangesets() {
  if (!fs.existsSync(CHANGESET_DIR)) {
    return []
  }

  const files = fs.readdirSync(CHANGESET_DIR).filter(isChangesetMarkdown)

  return files.map((fileName) => {
    const fullPath = path.join(CHANGESET_DIR, fileName)
    const content = fs.readFileSync(fullPath, 'utf8')
    const parsed = parseChangeset(content, fileName)

    return {
      fileName,
      fullPath,
      summary: parsed.summary,
      releases: parsed.releases,
    }
  })
}

function normalizeSummary(summary, fileName) {
  const raw = String(summary || '').trim()
  if (!raw) {
    return `未提供描述（${fileName}）`
  }
  return raw.replace(/\s+/g, ' ')
}

function buildVersionHeading(version, date) {
  const previousTag = getPreviousTag(version)
  if (previousTag) {
    return `## [${version}](${REPO_COMPARE_BASE}/${previousTag}...v${version}) (${date})`
  }
  return `## [${version}] (${date})`
}

function buildVersionSection(version, changesets) {
  const heading = buildVersionHeading(version, getDate())

  const summaryLines = changesets.map((item) => {
    return `* ${normalizeSummary(item.summary, item.fileName)}`
  })

  const packageTypes = new Map()
  for (const item of changesets) {
    for (const release of item.releases) {
      const prev = packageTypes.get(release.name)
      if (!prev || TYPE_RANK[release.type] > TYPE_RANK[prev]) {
        packageTypes.set(release.name, release.type)
      }
    }
  }

  const lines = [heading, '', '### 📝 变更', '']
  lines.push(...summaryLines, '')

  if (packageTypes.size > 0) {
    lines.push('### 📦 影响包', '')
    const pkgLines = [...packageTypes.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, type]) => `* \`${name}\`: ${type}`)
    lines.push(...pkgLines, '')
  }

  return lines.join('\n').trim()
}

function writeChangelog(versionSection, version) {
  const heading = `## [${version}]`
  const existing = fs.existsSync(CHANGELOG_PATH)
    ? fs.readFileSync(CHANGELOG_PATH, 'utf8')
    : ''

  if (existing.includes(heading)) {
    console.log(`CHANGELOG.md 已包含 ${heading}，跳过更新`)
    return false
  }

  const { preamble, versions } = splitPreambleAndVersions(existing)
  const hasPreamble = preamble.length > 0
  const hasVersions = versions.length > 0

  let nextContent = `${versionSection}\n`
  if (hasPreamble && hasVersions) {
    nextContent = `${preamble}\n\n${versionSection}\n\n${versions}`
  } else if (hasPreamble && !hasVersions) {
    nextContent = `${preamble}\n\n${versionSection}\n`
  } else if (!hasPreamble && hasVersions) {
    nextContent = `${versionSection}\n\n${versions}`
  }

  fs.writeFileSync(CHANGELOG_PATH, nextContent, 'utf8')
  console.log(`CHANGELOG.md 已从 changesets 增量更新: ${heading}`)
  return true
}

function archiveConsumedChangesets(version, changesets) {
  if (!shouldConsume || changesets.length === 0) {
    return ''
  }

  const archiveDir = path.join(CHANGESET_DIR, 'archive', `v${version}`)
  fs.mkdirSync(archiveDir, { recursive: true })

  for (const item of changesets) {
    const target = path.join(archiveDir, item.fileName)
    fs.renameSync(item.fullPath, target)
  }

  const relativeArchiveDir = path.relative(ROOT, archiveDir) || '.'
  console.log(`已归档 changesets: ${relativeArchiveDir}`)
  return relativeArchiveDir
}

function fallbackToConventionalIfNeeded() {
  if (!shouldFallback) {
    return
  }

  console.log('未检测到待处理的 changeset，回退到 conventional 增量生成')
  run('node scripts/update-changelog-incremental.js')
}

function main() {
  const version = getCurrentVersion()
  const pending = getPendingChangesets()

  if (pending.length === 0) {
    fallbackToConventionalIfNeeded()
    return
  }

  const section = buildVersionSection(version, pending)
  const written = writeChangelog(section, version)

  if (!written) {
    return
  }

  archiveConsumedChangesets(version, pending)
}

main()

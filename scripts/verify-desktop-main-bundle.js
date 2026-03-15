#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const desktopDir = path.join(__dirname, '..', 'packages', 'desktop')
const mainDir = path.join(desktopDir, 'dist', 'main')

if (!fs.existsSync(mainDir)) {
  console.error(`❌ Desktop main bundle directory not found: ${mainDir}`)
  process.exit(1)
}

const bundleFiles = fs
  .readdirSync(mainDir)
  .filter((file) => /^index-.*\.js$/.test(file))
  .map((file) => ({
    file,
    fullPath: path.join(mainDir, file),
    mtimeMs: fs.statSync(path.join(mainDir, file)).mtimeMs,
  }))
  .sort((a, b) => b.mtimeMs - a.mtimeMs)

if (bundleFiles.length === 0) {
  console.error(`❌ No hashed main bundle found in: ${mainDir}`)
  process.exit(1)
}

const bundlePath = bundleFiles[0].fullPath
const content = fs.readFileSync(bundlePath, 'utf-8')

const forbiddenPatterns = [
  {
    pattern: /readFileSync\s*\(\s*new URL\(\s*['"`]data:application\/json/i,
    message: 'main bundle passes a data: URL into fs.readFileSync',
  },
  {
    pattern: /readFileSync\s*\(\s*new URL\(\s*['"`][^'"`]*package\.json/i,
    message: 'main bundle still reads package.json at runtime via fs.readFileSync(new URL(...))',
  },
]

for (const { pattern, message } of forbiddenPatterns) {
  if (pattern.test(content)) {
    console.error(`❌ Desktop bundle verification failed: ${message}`)
    console.error(`   Bundle: ${bundlePath}`)
    process.exit(1)
  }
}

console.log(`✅ Desktop main bundle verified: ${path.basename(bundlePath)}`)

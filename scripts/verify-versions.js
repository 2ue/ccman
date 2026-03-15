#!/usr/bin/env node
/**
 * 验证所有 package.json 的版本号是否一致
 *
 * 用途：
 * 1. 在 CI/CD 中运行，确保版本号同步
 * 2. 在发布前运行，防止版本号不一致
 *
 * 使用方式：
 * - node scripts/verify-versions.js
 * - npm run verify:versions (如果在 package.json 中添加了 script)
 */

const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')

const versionSourcePath = path.join(rootDir, 'packages', 'core', 'src', 'version.ts')

// 需要检查的版本来源
const versionTargets = [
  { path: path.join(rootDir, 'package.json'), type: 'package-json' },
  { path: path.join(rootDir, 'packages', 'core', 'package.json'), type: 'package-json' },
  { path: path.join(rootDir, 'packages', 'cli', 'package.json'), type: 'package-json' },
  { path: path.join(rootDir, 'packages', 'desktop', 'package.json'), type: 'package-json' },
  { path: path.join(rootDir, 'packages', 'aicoding', 'package.json'), type: 'package-json' },
  { path: versionSourcePath, type: 'version-source' },
]

console.log('🔍 验证版本号一致性...\n')

// 读取所有版本来源
const packages = versionTargets.map((target) => {
  try {
    const content = fs.readFileSync(target.path, 'utf-8')

    if (target.type === 'package-json') {
      const pkg = JSON.parse(content)
      return {
        path: path.relative(rootDir, target.path),
        name: pkg.name,
        version: pkg.version,
      }
    }

    const match = content.match(/export const VERSION = '([^']+)'/)
    if (!match) {
      throw new Error('无法从 version.ts 中解析 VERSION')
    }

    return {
      path: path.relative(rootDir, target.path),
      name: 'core-source-version',
      version: match[1],
    }
  } catch (error) {
    console.error(`❌ 读取失败: ${target.path}`)
    console.error(`   ${error.message}`)
    process.exit(1)
  }
})

// 显示所有版本号
console.log('📦 当前版本号:\n')
packages.forEach((pkg) => {
  console.log(`   ${pkg.path.padEnd(40)} ${pkg.version}`)
})
console.log()

// 检查版本号是否一致
const versions = packages.map((pkg) => pkg.version)
const uniqueVersions = [...new Set(versions)]

if (uniqueVersions.length === 1) {
  console.log(`✅ 所有版本号一致: ${uniqueVersions[0]}`)
  process.exit(0)
} else {
  console.error('❌ 版本号不一致！\n')
  console.error('   请运行以下命令统一版本号:')
  console.error(`   npm run version ${uniqueVersions[0] || '<版本号>'}\n`)

  // 显示不一致的详细信息
  console.error('   不一致详情:')
  uniqueVersions.forEach((version) => {
    const pkgsWithVersion = packages.filter((pkg) => pkg.version === version)
    console.error(`   版本 ${version}:`)
    pkgsWithVersion.forEach((pkg) => {
      console.error(`     - ${pkg.path}`)
    })
  })

  process.exit(1)
}

#!/usr/bin/env node

/**
 * 一键修改所有包的版本号
 *
 * 用法:
 *   node scripts/bump-version.js 3.0.3
 *   npm run version 3.0.3
 */

const fs = require('fs')
const path = require('path')

const newVersion = process.argv[2]

if (!newVersion) {
  console.error('❌ 请提供版本号')
  console.log('用法: node scripts/bump-version.js <version>')
  console.log('示例: node scripts/bump-version.js 3.0.3')
  process.exit(1)
}

// 验证版本号格式 (x.y.z 或 x.y.z-alpha.1)
const versionRegex = /^\d+\.\d+\.\d+(-[a-z]+\.\d+)?$/
if (!versionRegex.test(newVersion)) {
  console.error('❌ 版本号格式错误')
  console.log('正确格式: x.y.z 或 x.y.z-alpha.1')
  process.exit(1)
}

// 需要修改的文件
const files = [
  'package.json',
  'packages/core/package.json',
  'packages/cli/package.json',
  'packages/desktop/package.json',
]

console.log(`\n🔄 将所有包版本号修改为: ${newVersion}\n`)

let successCount = 0
let errorCount = 0

for (const file of files) {
  const filePath = path.join(process.cwd(), file)

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  跳过: ${file} (文件不存在)`)
      continue
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const pkg = JSON.parse(content)
    const oldVersion = pkg.version

    pkg.version = newVersion

    // 保持原有的格式（2 空格缩进）
    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')

    console.log(`✅ ${file.padEnd(35)} ${oldVersion} → ${newVersion}`)
    successCount++
  } catch (error) {
    console.error(`❌ ${file}: ${error.message}`)
    errorCount++
  }
}

console.log(`\n✨ 完成！成功: ${successCount}, 失败: ${errorCount}`)

if (errorCount === 0) {
  console.log('\n📝 下一步:')
  console.log(`  git add .`)
  console.log(`  git commit -m "chore: bump version to ${newVersion}"`)
  console.log(`  git tag v${newVersion}`)
  console.log(`  git push && git push --tags`)
}

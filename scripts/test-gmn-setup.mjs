#!/usr/bin/env node
/**
 * GMN 配置脚本测试
 *
 * 测试策略：
 * 1. 使用临时测试目录（不影响正式环境）
 * 2. 测试保护模式和全覆盖模式
 * 3. 验证配置文件内容
 * 4. 测试完成后清理
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execSync } from 'child_process'

// 测试配置
const TEST_API_KEY = 'sk-ant-test-key-123456'
const GMN_BASE_URLS = {
  claude: 'https://gmn.chuangzuoli.com/api',
  codex: 'https://gmn.chuangzuoli.com',
  gemini: 'https://gmn.chuangzuoli.com',
  opencode: 'https://gmn.chuangzuoli.com',
}

// 创建临时测试目录
const TEST_ROOT = path.join(os.tmpdir(), `ccman-gmn-test-${Date.now()}`)
const TEST_HOME = path.join(TEST_ROOT, 'home')

console.log('🧪 GMN 配置脚本测试\n')
console.log(`测试目录: ${TEST_ROOT}\n`)

// 确保测试目录存在
fs.mkdirSync(TEST_HOME, { recursive: true })

// ============================================================================
// 工具函数
// ============================================================================

function createTestConfig(tool, config) {
  const configMap = {
    claude: path.join(TEST_HOME, '.claude/settings.json'),
    codex: path.join(TEST_HOME, '.codex/config.toml'),
    'codex-auth': path.join(TEST_HOME, '.codex/auth.json'),
    gemini: path.join(TEST_HOME, '.gemini/settings.json'),
    'gemini-env': path.join(TEST_HOME, '.gemini/.env'),
    opencode: path.join(TEST_HOME, '.config/opencode/opencode.json'),
  }

  const configPath = configMap[tool]
  fs.mkdirSync(path.dirname(configPath), { recursive: true })

  if (tool === 'codex') {
    fs.writeFileSync(configPath, config)
  } else if (tool === 'gemini-env') {
    fs.writeFileSync(configPath, config)
  } else {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  }
}

function readTestConfig(tool) {
  const configMap = {
    claude: path.join(TEST_HOME, '.claude/settings.json'),
    codex: path.join(TEST_HOME, '.codex/config.toml'),
    'codex-auth': path.join(TEST_HOME, '.codex/auth.json'),
    gemini: path.join(TEST_HOME, '.gemini/settings.json'),
    'gemini-env': path.join(TEST_HOME, '.gemini/.env'),
    opencode: path.join(TEST_HOME, '.config/opencode/opencode.json'),
  }

  const configPath = configMap[tool]
  if (!fs.existsSync(configPath)) {
    return null
  }

  if (tool === 'codex') {
    return fs.readFileSync(configPath, 'utf-8')
  } else if (tool === 'gemini-env') {
    return fs.readFileSync(configPath, 'utf-8')
  } else {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  }
}

function cleanup() {
  if (fs.existsSync(TEST_ROOT)) {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true })
  }
}

function runScript(scriptPath, args = []) {
  const env = { ...process.env, HOME: TEST_HOME }
  const cmd = `node ${scriptPath} ${args.join(' ')}`

  try {
    const output = execSync(cmd, {
      env,
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    return { success: true, output }
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout }
  }
}

// ============================================================================
// 测试用例
// ============================================================================

let passedTests = 0
let failedTests = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
    passedTests++
  } catch (error) {
    console.error(`❌ ${name}`)
    console.error(`   ${error.message}`)
    failedTests++
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

// ============================================================================
// 测试 1: setup-gmn-standalone.mjs - 保护模式（从零开始）
// ============================================================================

console.log('📋 测试 1: 独立脚本 - 保护模式（从零开始）\n')

test('应该创建所有配置文件', () => {
  const result = runScript('scripts/setup-gmn-standalone.mjs', [TEST_API_KEY])
  assert(result.success, '脚本执行失败')

  assert(fs.existsSync(path.join(TEST_HOME, '.claude/settings.json')), 'Claude 配置未创建')
  assert(fs.existsSync(path.join(TEST_HOME, '.codex/config.toml')), 'Codex 配置未创建')
  assert(fs.existsSync(path.join(TEST_HOME, '.codex/auth.json')), 'Codex auth 未创建')
  assert(fs.existsSync(path.join(TEST_HOME, '.gemini/settings.json')), 'Gemini 配置未创建')
  assert(fs.existsSync(path.join(TEST_HOME, '.gemini/.env')), 'Gemini .env 未创建')
  assert(fs.existsSync(path.join(TEST_HOME, '.config/opencode/opencode.json')), 'OpenCode 配置未创建')
})

test('Claude 配置应该包含正确的认证信息', () => {
  const config = readTestConfig('claude')
  assert(config.env.ANTHROPIC_AUTH_TOKEN === TEST_API_KEY, 'API Key 不正确')
  assert(config.env.ANTHROPIC_BASE_URL === GMN_BASE_URLS.claude, 'Base URL 不正确')
})

test('Codex 配置应该包含 GMN provider', () => {
  const config = readTestConfig('codex')
  assert(config.includes('model_provider = "gmn"'), 'model_provider 不正确')
  assert(config.includes('model = "gpt-5.2-codex"'), 'model 不正确')
  assert(config.includes('model_reasoning_effort = "high"'), 'model_reasoning_effort 不正确')
  assert(config.includes('model_verbosity = "high"'), 'model_verbosity 不正确')
  assert(config.includes('disable_response_storage = true'), 'disable_response_storage 不正确')
  assert(config.includes('windows_wsl_setup_acknowledged = true'), 'windows_wsl_setup_acknowledged 不正确')
  assert(config.includes('web_search = "live"'), 'web_search 不正确')
  assert(config.includes('[sandbox_workspace_write]'), 'sandbox_workspace_write 块不存在')
  assert(config.includes('network_access = true'), 'network_access 不正确')
  assert(config.includes('[model_providers.gmn]'), 'gmn provider 块不存在')
  assert(config.includes(GMN_BASE_URLS.codex), 'Base URL 不存在')
})

test('Codex auth.json 应该包含 API Key', () => {
  const auth = readTestConfig('codex-auth')
  assert(auth.OPENAI_API_KEY === TEST_API_KEY, 'API Key 不正确')
})

test('Gemini 配置应该启用 IDE', () => {
  const config = readTestConfig('gemini')
  assert(config.ide.enabled === true, 'IDE 未启用')
})

test('Gemini .env 应该包含认证信息', () => {
  const env = readTestConfig('gemini-env')
  assert(env.includes(`GEMINI_API_KEY=${TEST_API_KEY}`), 'API Key 不存在')
  assert(env.includes(`GOOGLE_GEMINI_BASE_URL=${GMN_BASE_URLS.gemini}`), 'Base URL 不存在')
})

test('OpenCode 配置应该包含 GMN provider', () => {
  const config = readTestConfig('opencode')
  assert(config.provider.gmn.name === 'GMN', 'Provider 名称不正确')
  assert(config.provider.gmn.options.apiKey === TEST_API_KEY, 'API Key 不正确')
  assert(config.provider.gmn.options.baseURL === GMN_BASE_URLS.opencode, 'Base URL 不正确')
})

// ============================================================================
// 测试 2: setup-gmn-standalone.mjs - 保护模式（保留现有配置）
// ============================================================================

console.log('\n📋 测试 2: 独立脚本 - 保护模式（保留现有配置）\n')

// 创建包含自定义配置的文件
createTestConfig('claude', {
  env: {
    ANTHROPIC_AUTH_TOKEN: 'old-key',
    ANTHROPIC_BASE_URL: 'https://old.com',
    CUSTOM_ENV: 'should-be-preserved',
  },
  permissions: {
    allow: ['custom-permission'],
  },
  customField: 'custom-value',
})

createTestConfig('codex-auth', {
  OPENAI_API_KEY: 'old-key',
  CUSTOM_FIELD: 'should-be-removed',
})

createTestConfig('gemini-env', 'CUSTOM_VAR=custom-value\nGEMINI_API_KEY=old-key')

createTestConfig('opencode', {
  provider: {
    other: {
      name: 'Other Provider',
      options: { apiKey: 'other-key' },
    },
  },
})

// 运行脚本
const result2 = runScript('scripts/setup-gmn-standalone.mjs', [TEST_API_KEY])
assert(result2.success, '脚本执行失败')

test('Claude 应该保留自定义字段', () => {
  const config = readTestConfig('claude')
  assert(config.env.ANTHROPIC_AUTH_TOKEN === TEST_API_KEY, 'API Key 未更新')
  assert(config.env.ANTHROPIC_BASE_URL === GMN_BASE_URLS.claude, 'Base URL 未更新')
  assert(config.env.CUSTOM_ENV === 'should-be-preserved', '自定义 env 丢失')
  assert(config.permissions.allow[0] === 'custom-permission', 'permissions 丢失')
  assert(config.customField === 'custom-value', '自定义字段丢失')
})

test('Gemini .env 应该保留其他变量', () => {
  const env = readTestConfig('gemini-env')
  assert(env.includes('CUSTOM_VAR=custom-value'), '自定义变量丢失')
  assert(env.includes(`GEMINI_API_KEY=${TEST_API_KEY}`), 'API Key 未更新')
})

test('Codex auth.json 应该备份并覆盖写入（仅保留 OPENAI_API_KEY）', () => {
  const authPath = path.join(TEST_HOME, '.codex/auth.json')
  const backupPath = `${authPath}.bak`

  assert(fs.existsSync(backupPath), 'auth.json.bak 未创建')

  const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'))
  assert(auth.OPENAI_API_KEY === TEST_API_KEY, 'API Key 未更新')
  assert(auth.CUSTOM_FIELD === undefined, '不应保留其他字段')

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
  assert(backup.OPENAI_API_KEY === 'old-key', '备份内容不正确')
  assert(backup.CUSTOM_FIELD === 'should-be-removed', '备份未保留原字段')
})

test('OpenCode 应该保留其他 provider', () => {
  const config = readTestConfig('opencode')
  assert(config.provider.other, '其他 provider 丢失')
  assert(config.provider.other.name === 'Other Provider', '其他 provider 内容丢失')
  assert(config.provider.gmn, 'GMN provider 未添加')
})

// ============================================================================
// 测试 3: setup-gmn-standalone.mjs - 全覆盖模式
// ============================================================================

console.log('\n📋 测试 3: 独立脚本 - 全覆盖模式\n')

// 清理并重新创建配置
cleanup()
fs.mkdirSync(TEST_HOME, { recursive: true })

createTestConfig('claude', {
  env: {
    ANTHROPIC_AUTH_TOKEN: 'old-key',
    CUSTOM_ENV: 'will-be-lost',
  },
  customField: 'will-be-lost',
})

// 注意：全覆盖模式需要交互式确认，这里我们需要模拟输入 'y'
// 由于测试环境限制，我们跳过这个测试或者修改脚本支持 --force 参数

console.log('⚠️  全覆盖模式需要交互式确认，跳过自动测试')
console.log('   手动测试命令: node scripts/setup-gmn-standalone.mjs --overwrite\n')

// ============================================================================
// 测试 4: setup-gmn.mjs（基于 ccman）
// ============================================================================

console.log('📋 测试 4: 基于 ccman 的脚本\n')

// 检查是否已构建（检查 dist 目录）
const coreDistPath = path.join(process.cwd(), 'packages/core/dist/index.js')
if (!fs.existsSync(coreDistPath)) {
  console.log('⚠️  core 包未构建，跳过测试')
  console.log('   运行 pnpm build 后再测试\n')
} else {
  // 设置 NODE_ENV=test 以使用测试路径
  process.env.NODE_ENV = 'test'
  process.env.HOME = TEST_HOME

  const result4 = runScript('scripts/setup-gmn.mjs', [TEST_API_KEY])

  test('基于 ccman 的脚本应该成功执行', () => {
    assert(result4.success, `脚本执行失败: ${result4.error}`)
  })

  test('应该创建 ccman 配置文件', () => {
    // ccman 在测试模式下使用 /tmp/ccman-test/.ccman
    const ccmanDir = path.join('/tmp/ccman-test', '.ccman')
    assert(fs.existsSync(ccmanDir), 'ccman 配置目录未创建')
  })
}

// ============================================================================
// 测试总结
// ============================================================================

console.log('\n' + '='.repeat(60))
console.log('📊 测试总结')
console.log('='.repeat(60))
console.log(`✅ 通过: ${passedTests}`)
console.log(`❌ 失败: ${failedTests}`)
console.log(`📁 测试目录: ${TEST_ROOT}`)

if (failedTests === 0) {
  console.log('\n🎉 所有测试通过！')
  cleanup()
  console.log('✅ 测试目录已清理')
} else {
  console.log('\n⚠️  部分测试失败，保留测试目录以供调试')
  console.log(`   查看: ${TEST_ROOT}`)
}

process.exit(failedTests > 0 ? 1 : 0)

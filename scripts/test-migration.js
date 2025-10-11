#!/usr/bin/env node

/**
 * 测试 v2 到 v3 的配置迁移
 *
 * 此脚本会：
 * 1. 读取旧版配置（只读，不修改）
 * 2. 模拟迁移过程
 * 3. 验证转换后的数据结构
 * 4. 输出详细的对比信息
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

const ccmanDir = path.join(os.homedir(), '.ccman')
const v2ConfigPath = path.join(ccmanDir, 'config.json')
const v2ProvidersDir = path.join(ccmanDir, 'providers')

/**
 * 读取并分析旧版配置
 */
function analyzeV2Config() {
  console.log('📊 分析旧版配置...\n')

  // 检查文件是否存在
  if (!fs.existsSync(v2ConfigPath)) {
    console.error('❌ 未找到 config.json')
    return null
  }

  if (!fs.existsSync(v2ProvidersDir)) {
    console.error('❌ 未找到 providers 目录')
    return null
  }

  // 读取 config.json
  const configContent = fs.readFileSync(v2ConfigPath, 'utf-8')
  const config = JSON.parse(configContent)

  console.log(`✅ config.json (${Object.keys(config.providers).length} 个服务商)`)
  console.log(`   版本: ${config.version}`)
  console.log(`   当前激活: ${config.currentProvider || '无'}`)
  console.log(`   创建时间: ${config.metadata?.createdAt}`)
  console.log(`   更新时间: ${config.metadata?.updatedAt}\n`)

  // 分析每个 provider
  const providers = []
  const errors = []

  for (const [key, meta] of Object.entries(config.providers)) {
    const providerPath = path.join(v2ProvidersDir, meta.configFile)

    if (!fs.existsSync(providerPath)) {
      errors.push(`⚠️  文件不存在: ${meta.configFile}`)
      continue
    }

    try {
      const providerContent = fs.readFileSync(providerPath, 'utf-8')
      const provider = JSON.parse(providerContent)

      providers.push({
        key,
        meta,
        detail: provider,
      })

      console.log(`✅ ${provider.name}`)
      console.log(`   文件: ${meta.configFile}`)
      console.log(`   Base URL: ${provider.config.env.ANTHROPIC_BASE_URL}`)
      console.log(`   API Key: ${provider.config.env.ANTHROPIC_AUTH_TOKEN.substring(0, 20)}...`)
      console.log(`   最后使用: ${meta.lastUsed || '从未使用'}`)
      console.log(`   创建时间: ${provider.metadata?.createdAt}`)
      console.log(`   使用次数: ${provider.metadata?.usageCount || 0}\n`)
    } catch (error) {
      errors.push(`❌ 解析失败: ${meta.configFile} - ${error.message}`)
    }
  }

  if (errors.length > 0) {
    console.log('\n⚠️  发现问题:')
    errors.forEach((err) => console.log(`   ${err}`))
  }

  return {
    config,
    providers,
    errors,
  }
}

/**
 * 模拟迁移过程（不实际写入文件）
 */
function simulateMigration(data) {
  console.log('\n\n🔄 模拟迁移过程...\n')

  const { config, providers } = data

  const migratedProviders = []
  let currentProviderId = null

  for (const { key, meta, detail } of providers) {
    // 生成新的 ID
    const createdAt = detail.metadata?.createdAt
      ? new Date(detail.metadata.createdAt).getTime()
      : Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const id = `claude-${createdAt}-${random}`

    // 转换时间戳
    const lastUsedAt = meta.lastUsed ? new Date(meta.lastUsed).getTime() : undefined

    // 创建新的 provider
    const newProvider = {
      id,
      name: detail.name,
      baseUrl: detail.config.env.ANTHROPIC_BASE_URL,
      apiKey: detail.config.env.ANTHROPIC_AUTH_TOKEN,
      createdAt,
      lastUsedAt,
    }

    migratedProviders.push(newProvider)

    // 记录当前激活的 provider
    if (config.currentProvider === key) {
      currentProviderId = id
    }

    console.log(`✅ ${detail.name}`)
    console.log(`   旧 ID: ${key}`)
    console.log(`   新 ID: ${id}`)
    console.log(`   创建时间: ${new Date(createdAt).toISOString()}`)
    if (lastUsedAt) {
      console.log(`   最后使用: ${new Date(lastUsedAt).toISOString()}`)
    }
    console.log()
  }

  // 按最后使用时间排序
  migratedProviders.sort((a, b) => {
    if (!a.lastUsedAt && !b.lastUsedAt) return 0
    if (!a.lastUsedAt) return 1
    if (!b.lastUsedAt) return -1
    return b.lastUsedAt - a.lastUsedAt
  })

  const v3Config = {
    currentProviderId,
    providers: migratedProviders,
    presets: [],
  }

  return v3Config
}

/**
 * 验证新配置
 */
function validateV3Config(v3Config) {
  console.log('\n\n✅ 验证新配置...\n')

  const errors = []

  // 验证基本结构
  if (!Array.isArray(v3Config.providers)) {
    errors.push('providers 必须是数组')
  }

  // 验证每个 provider
  for (const [index, provider] of v3Config.providers.entries()) {
    const requiredFields = ['id', 'name', 'baseUrl', 'apiKey', 'createdAt']
    for (const field of requiredFields) {
      if (!provider[field]) {
        errors.push(`providers[${index}] 缺少字段: ${field}`)
      }
    }

    // 验证 ID 格式
    if (provider.id && !provider.id.startsWith('claude-')) {
      errors.push(`providers[${index}].id 格式错误: ${provider.id}`)
    }

    // 验证时间戳
    if (provider.createdAt && typeof provider.createdAt !== 'number') {
      errors.push(`providers[${index}].createdAt 必须是 number`)
    }
  }

  // 验证 currentProviderId
  if (v3Config.currentProviderId) {
    const currentExists = v3Config.providers.some((p) => p.id === v3Config.currentProviderId)
    if (!currentExists) {
      errors.push(`currentProviderId (${v3Config.currentProviderId}) 不存在于 providers 中`)
    }
  }

  if (errors.length > 0) {
    console.log('❌ 验证失败:\n')
    errors.forEach((err) => console.log(`   ${err}`))
    return false
  }

  console.log('✅ 所有验证通过')
  console.log(`   Providers: ${v3Config.providers.length}`)
  if (v3Config.currentProviderId) {
    const current = v3Config.providers.find((p) => p.id === v3Config.currentProviderId)
    console.log(`   当前激活: ${current?.name}`)
  }

  return true
}

/**
 * 输出预览
 */
function previewV3Config(v3Config) {
  console.log('\n\n📋 新配置预览:\n')
  console.log(JSON.stringify(v3Config, null, 2))
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 ccman v2 -> v3 配置迁移测试\n')
  console.log('=' .repeat(60))
  console.log()

  // 分析旧配置
  const v2Data = analyzeV2Config()
  if (!v2Data) {
    process.exit(1)
  }

  if (v2Data.providers.length === 0) {
    console.log('\n⚠️  没有找到可迁移的 provider')
    process.exit(0)
  }

  // 模拟迁移
  const v3Config = simulateMigration(v2Data)

  // 验证新配置
  const isValid = validateV3Config(v3Config)

  if (!isValid) {
    process.exit(1)
  }

  // 输出预览
  previewV3Config(v3Config)

  console.log('\n' + '='.repeat(60))
  console.log('\n✨ 测试完成！数据转换正确。')
  console.log('\n💡 下一步: 运行实际迁移命令')
  console.log('   pnpm --filter @ccman/cli migrate\n')
}

main()

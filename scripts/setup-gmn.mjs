#!/usr/bin/env node
/**
 * GMN 快速配置脚本（基于 ccman）
 *
 * 功能：将 GMN 服务商配置到所有 AI 编程工具
 *
 * 用法：
 *   node scripts/setup-gmn.mjs              # 交互式输入
 *   node scripts/setup-gmn.mjs sk-ant-xxx   # 直接传入 API Key
 *
 * 依赖：需要先构建 core 包（pnpm build）
 */

import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import {
  createClaudeManager,
  createCodexManager,
  createGeminiManager,
  createOpenCodeManager,
} from '../packages/core/dist/index.js'

const GMN_BASE_URL = 'https://gmn.chuangzuoli.cn/openai'
const PROVIDER_NAME = 'GMN'

const tools = [
  { name: 'Claude Code', manager: createClaudeManager() },
  { name: 'Codex', manager: createCodexManager() },
  { name: 'Gemini CLI', manager: createGeminiManager() },
  { name: 'OpenCode', manager: createOpenCodeManager() },
]

async function main() {
  console.log('🚀 GMN 快速配置工具\n')

  // 1. 获取 API Key
  let apiKey = process.argv[2]

  if (!apiKey) {
    const rl = createInterface({ input: stdin, output: stdout })
    apiKey = await rl.question('请输入 GMN API Key: ')
    rl.close()
  }

  if (!apiKey?.trim()) {
    throw new Error('API Key 不能为空')
  }

  console.log('\n开始配置...\n')

  // 2. 配置所有工具
  for (const { name, manager } of tools) {
    try {
      const existing = manager.findByName(PROVIDER_NAME)

      const provider = existing
        ? manager.edit(existing.id, { baseUrl: GMN_BASE_URL, apiKey })
        : manager.add({ name: PROVIDER_NAME, baseUrl: GMN_BASE_URL, apiKey })

      manager.switch(provider.id)
      console.log(`✅ ${name}`)
    } catch (error) {
      console.error(`❌ ${name}: ${error.message}`)
    }
  }

  console.log('\n🎉 GMN 配置完成！')
  console.log('\n提示：请重启对应的工具以使配置生效。')
}

main().catch((err) => {
  console.error(`\n❌ 错误: ${err.message}`)
  process.exit(1)
})

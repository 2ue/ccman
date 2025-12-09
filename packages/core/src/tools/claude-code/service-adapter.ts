/**
 * Claude Code ServiceAdapter
 */

import type { ServiceAdapter, Provider } from '../../types.js'
import { ValidationFailedError } from '../../types.js'
import { ClaudeConfigAdapter } from './config-adapter.js'
import { loadTemplate, renderTemplate } from '../../adapters/template-engine.js'

export class ClaudeServiceAdapter implements ServiceAdapter {
  private configAdapter = new ClaudeConfigAdapter()

  writeOfficial(provider: Provider): void {
    // 1. 加载模板
    const templateContent = loadTemplate('claude/settings.json')

    // 2. 渲染模板
    const rendered = renderTemplate(templateContent, { provider })

    // 3. 解析渲染后的JSON
    const templateConfig = JSON.parse(rendered)

    // 4. 读取现有配置
    const existingConfig = (this.configAdapter.read('main') as any) || {}

    // 5. 深度合并（老配置优先）
    const merged = this.configAdapter.merge(
      'main',
      existingConfig,
      templateConfig,
      'old-override-new'
    )

    // 6. 强制更新托管字段
    const final = merged as any
    final.env = final.env || {}
    final.env.ANTHROPIC_AUTH_TOKEN = provider.apiKey
    final.env.ANTHROPIC_BASE_URL = provider.baseUrl

    // 7. 写入
    this.configAdapter.write('main', final, 'new-override-old')
  }

  readCurrent(): Provider | null {
    const config = this.configAdapter.read('main') as any

    if (!config || !config.env || !config.env.ANTHROPIC_AUTH_TOKEN) {
      return null
    }

    return {
      id: 'current',
      name: 'current',
      baseUrl: config.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      apiKey: config.env.ANTHROPIC_AUTH_TOKEN,
      createdAt: 0,
      updatedAt: 0,
    }
  }

  validate(provider: Partial<Provider>): void {
    if (!provider.baseUrl) {
      throw new ValidationFailedError('baseUrl', 'baseUrl is required for Claude Code')
    }
    if (!provider.apiKey) {
      throw new ValidationFailedError('apiKey', 'apiKey is required for Claude Code')
    }
  }
}

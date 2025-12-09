/**
 * Codex ServiceAdapter - Writes provider config to Codex
 */

import type { Provider, ServiceAdapter } from '../../types.js'
import { CodexConfigAdapter } from './config-adapter.js'

export class CodexServiceAdapter implements ServiceAdapter {
  private configAdapter = new CodexConfigAdapter()

  writeOfficial(provider: Provider): void {
    // 1. Read existing config
    const existing = this.configAdapter.read('main') as Record<string, any>

    // 2. Load template (for future use when template needs customization)
    // const templateContent = loadTemplate('codex/config.toml')
    // const rendered = renderTemplate(templateContent, { provider })

    // 3. Get template data (currently using existing as base)
    const templateData = this.configAdapter.read('main')

    // 4. Merge with old-override-new mode (preserve user settings)
    const merged = this.configAdapter.merge(
      'main',
      existing,
      templateData,
      'old-override-new'
    ) as Record<string, any>

    // 5. Force update managed fields (ccman-controlled)
    merged.model_provider = provider.name

    // 6. Initialize or update model_providers section
    if (!merged.model_providers) {
      merged.model_providers = {}
    }

    merged.model_providers[provider.name] = {
      name: provider.name,
      base_url: provider.baseUrl,
      wire_api: 'responses',
      requires_openai_auth: true,
    }

    // 7. Write merged config
    this.configAdapter.write('main', merged, 'new-override-old')

    // 8. Write auth.json with API key
    const authData = {
      [provider.name]: {
        api_key: provider.apiKey,
      },
    }

    // Read existing auth and merge
    const existingAuth = this.configAdapter.read('auth') as Record<string, any>
    const mergedAuth = { ...existingAuth, ...authData }

    this.configAdapter.write('auth', mergedAuth, 'new-override-old')
  }

  validate(provider: Partial<Provider>): void {
    const errors: string[] = []

    if (!provider.name) {
      errors.push('Provider name is required')
    }

    if (!provider.baseUrl) {
      errors.push('Base URL is required')
    } else if (!this.isValidUrl(provider.baseUrl)) {
      errors.push('Invalid base URL format')
    }

    if (!provider.apiKey) {
      errors.push('API key is required')
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed:\n${errors.join('\n')}`)
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

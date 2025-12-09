/**
 * Gemini CLI ServiceAdapter - Writes provider config to Gemini
 */

import type { Provider, ServiceAdapter } from '../../types.js'
import { loadTemplate, renderTemplate } from '../../adapters/template-engine.js'
import { GeminiConfigAdapter } from './config-adapter.js'

export class GeminiServiceAdapter implements ServiceAdapter {
  private configAdapter = new GeminiConfigAdapter()

  writeOfficial(provider: Provider): void {
    // 1. Handle settings.json
    const settingsTemplate = loadTemplate('gemini/settings.json')
    const renderedSettings = renderTemplate(settingsTemplate, { provider })

    // Parse rendered template
    const templateSettings = JSON.parse(renderedSettings)

    // Read existing settings
    const existingSettings = this.configAdapter.read('main') as Record<string, any>

    // Merge with old-override-new mode (preserve user settings)
    const mergedSettings = this.configAdapter.merge(
      'main',
      existingSettings,
      templateSettings,
      'old-override-new'
    ) as Record<string, any>

    // Ensure IDE is enabled (force update if not set)
    if (!mergedSettings.ide || typeof mergedSettings.ide !== 'object') {
      mergedSettings.ide = {}
    }
    if (mergedSettings.ide.enabled === undefined) {
      mergedSettings.ide.enabled = true
    }

    // Ensure auth type is set (force update if not set)
    if (!mergedSettings.security || typeof mergedSettings.security !== 'object') {
      mergedSettings.security = {}
    }
    if (!mergedSettings.security.auth || typeof mergedSettings.security.auth !== 'object') {
      mergedSettings.security.auth = {}
    }
    if (mergedSettings.security.auth.selectedType === undefined) {
      mergedSettings.security.auth.selectedType = 'gemini-api-key'
    }

    // Write merged settings
    this.configAdapter.write('main', mergedSettings, 'new-override-old')

    // 2. Handle .env file
    const envTemplate = loadTemplate('gemini/.env')
    const renderedEnv = renderTemplate(envTemplate, { provider })

    // Parse rendered .env
    const templateEnv: Record<string, string> = {}
    for (const line of renderedEnv.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      const value = trimmed.slice(eqIndex + 1).trim()
      if (!key) continue
      templateEnv[key] = value
    }

    // Read existing .env
    const existingEnv = this.configAdapter.read('env') as Record<string, string>

    // Merge environment variables
    const mergedEnv = { ...existingEnv }

    // Force update managed fields
    if (provider.apiKey) {
      mergedEnv.GEMINI_API_KEY = provider.apiKey
    }

    if (provider.baseUrl) {
      mergedEnv.GOOGLE_GEMINI_BASE_URL = provider.baseUrl
    } else {
      // Remove base URL if not provided (use default)
      delete mergedEnv.GOOGLE_GEMINI_BASE_URL
    }

    // Set model if provided
    if (provider.model) {
      // Handle both string and object types
      if (typeof provider.model === 'string') {
        mergedEnv.GEMINI_MODEL = provider.model
      } else {
        // If it's an object, try to extract defaultModel or stringify it
        const modelMeta = provider.model as Record<string, any>
        if (modelMeta.defaultModel) {
          mergedEnv.GEMINI_MODEL = String(modelMeta.defaultModel)
        }
      }
    } else if (!mergedEnv.GEMINI_MODEL) {
      // Default model if not set
      mergedEnv.GEMINI_MODEL = 'gemini-2.5-pro'
    }

    // Write merged .env
    this.configAdapter.write('env', mergedEnv, 'new-override-old')
  }

  validate(provider: Partial<Provider>): void {
    const errors: string[] = []

    if (!provider.name) {
      errors.push('Provider name is required')
    }

    if (!provider.apiKey) {
      errors.push('API key is required')
    }

    // baseUrl is optional for Gemini (can use official API)
    if (provider.baseUrl && !this.isValidUrl(provider.baseUrl)) {
      errors.push('Invalid base URL format')
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

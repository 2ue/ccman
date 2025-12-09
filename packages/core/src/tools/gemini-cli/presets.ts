/**
 * Gemini CLI Presets
 */

import type { PresetSpec } from '../../types.js'

export const GEMINI_PRESETS: PresetSpec[] = [
  {
    name: 'google-official',
    baseUrl: '',
    description: 'Google Gemini Official API (API Key authentication)',
    isBuiltIn: true,
  },
  {
    name: 'packyapi',
    baseUrl: 'https://www.packyapi.com',
    description: 'PackyAPI Gemini Compatible Service',
    isBuiltIn: true,
  },
  {
    name: 'litellm-proxy',
    baseUrl: 'http://localhost:4000',
    description: 'Local LiteLLM Proxy (Gemini Compatible)',
    isBuiltIn: true,
  },
]

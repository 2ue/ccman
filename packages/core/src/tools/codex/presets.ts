/**
 * Codex Presets
 */

import type { PresetSpec } from '../../types.js'

export const CODEX_PRESETS: PresetSpec[] = [
  {
    name: 'openai-official',
    baseUrl: 'https://api.openai.com/v1',
    description: 'OpenAI Official API',
    isBuiltIn: true,
  },
  {
    name: 'azure-openai',
    baseUrl: 'https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-id}',
    description: 'Azure OpenAI Service',
    isBuiltIn: true,
  },
  {
    name: 'cloudflare-ai-gateway',
    baseUrl: 'https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai',
    description: 'Cloudflare AI Gateway',
    isBuiltIn: true,
  },
]

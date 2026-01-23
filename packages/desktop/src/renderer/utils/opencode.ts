export const DEFAULT_OPENCODE_NPM = '@ai-sdk/openai'

export interface OpenCodeMeta {
  npm?: string
  models?: unknown
}

export function parseOpenCodeMeta(raw?: string): OpenCodeMeta | null {
  if (!raw || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed as OpenCodeMeta
    }
  } catch {
    return { npm: raw }
  }
  return null
}

export function buildOpenCodeModel(meta: OpenCodeMeta): string {
  const payload: OpenCodeMeta = {}
  if (meta.npm) payload.npm = meta.npm
  if (meta.models) payload.models = meta.models
  return JSON.stringify(payload)
}

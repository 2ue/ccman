export const SIGHT_MORE_ROOT_URL = 'https://2api.sight-more.com'

interface SightPresetTemplate {
  name: string
  baseUrl: string
  description: string
}

type BaseUrlTransformer = (baseUrl: string) => string

/**
 * 创建 Sight More 预设
 *
 * Sight More 是一个多协议 API 中转服务，同一域名同时兼容
 * Anthropic（Claude Code）、OpenAI（Codex / OpenCode）与 Gemini 协议。
 *
 * @param transformBaseUrl 可选的 Base URL 变换函数（例如 OpenClaw 需要追加 /v1）
 */
export function createSightPreset(
  transformBaseUrl: BaseUrlTransformer = (baseUrl) => baseUrl
): SightPresetTemplate[] {
  return [
    {
      name: 'Sight More',
      baseUrl: transformBaseUrl(SIGHT_MORE_ROOT_URL),
      description: 'Sight More API 中转服务 (2api.sight-more.com)',
    },
  ]
}

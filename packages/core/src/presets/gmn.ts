export const GMN_ROOT_URL = 'https://gmn.chuangzuoli.com'
export const GMN1_ROOT_URL = 'https://gmncode.cn'

interface GmnPresetTemplate {
  name: string
  baseUrl: string
  description: string
}

type BaseUrlTransformer = (baseUrl: string) => string

export function createDualGmnPresets(
  transformBaseUrl: BaseUrlTransformer = (baseUrl) => baseUrl
): GmnPresetTemplate[] {
  return [
    {
      name: 'GMN',
      baseUrl: transformBaseUrl(GMN_ROOT_URL),
      description: 'GMN 主域名线路 (gmn.chuangzuoli.com)',
    },
    {
      name: 'GMN1',
      baseUrl: transformBaseUrl(GMN1_ROOT_URL),
      description: 'GMN1 备用域名线路 (gmncode.cn)',
    },
  ]
}

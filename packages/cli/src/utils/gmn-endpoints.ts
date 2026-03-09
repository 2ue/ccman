import type { EndpointCandidate } from './endpoint-latency.js'

export interface GmnProfile {
  commandName: 'gmn' | 'gmn1'
  title: string
  endpointGroupLabel: string
  endpointGroupDescription: string
  baseUrls: EndpointCandidate[]
}

export const GMN_PROFILE: GmnProfile = {
  commandName: 'gmn',
  title: 'GMN',
  endpointGroupLabel: '创作里域名线路',
  endpointGroupDescription: '仅包含 chuangzuoli 域名下的 2 条地址',
  baseUrls: [
    {
      label: '创作里主站',
      url: 'https://gmn.chuangzuoli.com',
      description: 'chuangzuoli 主域名入口',
    },
    {
      label: '创作里 CDN',
      url: 'https://cdn.gmnchuangzuoli.com',
      description: 'chuangzuoli 域名 CDN 加速入口',
    },
  ],
}

export const GMN1_PROFILE: GmnProfile = {
  commandName: 'gmn1',
  title: 'GMN1',
  endpointGroupLabel: '扩展加速线路',
  endpointGroupDescription: '包含除 chuangzuoli 之外的其余 5 条地址',
  baseUrls: [
    {
      label: '阿里云 CDN',
      url: 'https://gmncodex.com',
      description: '阿里云解析 CDN 回国加速',
    },
    {
      label: '全球边缘 A',
      url: 'https://gmncode.cn',
      description: '全球边缘节点加速',
    },
    {
      label: 'CF CDN A',
      url: 'https://cdn.gmncode.cn',
      description: 'CF 解析 CDN 回国加速',
    },
    {
      label: '全球边缘 B',
      url: 'https://gmn.codex.com',
      description: '全球边缘节点加速',
    },
    {
      label: 'CF CDN B',
      url: 'https://cdn.gmncode.com',
      description: 'CF 解析 CDN 回国加速',
    },
  ],
}

interface EndpointDisplayResult {
  label: string
  url: string
  latencyMs: number | null
  error?: string
}

export function getEndpointHost(url: string): string {
  return new URL(url).host
}

export function formatEndpointChoiceLabel(result: EndpointDisplayResult, index: number): string {
  const latencyText =
    result.latencyMs === null ? result.error || '测速失败' : `${result.latencyMs} ms`
  return `${index + 1}. ${result.label} | ${getEndpointHost(result.url)} | ${latencyText}`
}

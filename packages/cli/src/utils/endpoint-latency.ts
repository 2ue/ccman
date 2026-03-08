import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { performance } from 'node:perf_hooks'

export interface EndpointCandidate {
  url: string
  label: string
  description: string
  probeUrl?: string
}

interface ProbeAttemptResult {
  latencyMs: number | null
  statusCode: number | null
  error?: string
}

export interface EndpointProbeResult extends EndpointCandidate {
  latencyMs: number | null
  statusCode: number | null
  samples: number[]
  error?: string
  originalIndex: number
}

export interface EndpointProbeOptions {
  sampleCount?: number
  timeoutMs?: number
}

export function normalizeEndpointUrl(url: string): string {
  const normalized = url.trim().replace(/\/+$/, '')
  new URL(normalized)
  return normalized
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) {
    throw new Error('至少需要一个采样值')
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2)
  }
  return sorted[middle]
}

function probeOnce(url: string, timeoutMs: number): Promise<ProbeAttemptResult> {
  return new Promise((resolve) => {
    const target = new URL(url)
    const requester = target.protocol === 'http:' ? httpRequest : httpsRequest
    const start = performance.now()
    let settled = false

    const finish = (result: ProbeAttemptResult) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    const req = requester(
      target,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          'User-Agent': 'ccman-latency-probe/1.0',
        },
      },
      (response) => {
        const latencyMs = Math.max(1, Math.round(performance.now() - start))
        const statusCode = response.statusCode ?? null
        response.destroy()
        finish({ latencyMs, statusCode })
      }
    )

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`测速超时（>${timeoutMs}ms）`))
    })

    req.on('error', (error) => {
      finish({
        latencyMs: null,
        statusCode: null,
        error: error.message,
      })
    })

    req.end()
  })
}

async function probeCandidate(
  candidate: EndpointCandidate,
  originalIndex: number,
  options: Required<EndpointProbeOptions>
): Promise<EndpointProbeResult> {
  const normalizedUrl = normalizeEndpointUrl(candidate.url)
  const normalizedProbeUrl = candidate.probeUrl
    ? normalizeEndpointUrl(candidate.probeUrl)
    : normalizedUrl

  const samples: number[] = []
  let statusCode: number | null = null
  let lastError: string | undefined

  for (let index = 0; index < options.sampleCount; index += 1) {
    const result = await probeOnce(normalizedProbeUrl, options.timeoutMs)
    if (result.latencyMs !== null) {
      samples.push(result.latencyMs)
      statusCode = result.statusCode
    } else if (!lastError) {
      lastError = result.error
    }
  }

  return {
    ...candidate,
    url: normalizedUrl,
    probeUrl: normalizedProbeUrl,
    originalIndex,
    samples,
    statusCode,
    latencyMs: samples.length > 0 ? calculateMedian(samples) : null,
    error: samples.length > 0 ? undefined : lastError || '测速失败',
  }
}

export async function probeEndpointCandidates(
  candidates: EndpointCandidate[],
  options: EndpointProbeOptions = {}
): Promise<EndpointProbeResult[]> {
  const resolvedOptions: Required<EndpointProbeOptions> = {
    sampleCount: options.sampleCount ?? 3,
    timeoutMs: options.timeoutMs ?? 2500,
  }

  return Promise.all(
    candidates.map((candidate, index) => probeCandidate(candidate, index, resolvedOptions))
  )
}

export function sortEndpointProbeResults(results: EndpointProbeResult[]): EndpointProbeResult[] {
  return [...results].sort((left, right) => {
    const leftReachable = left.latencyMs !== null
    const rightReachable = right.latencyMs !== null

    if (leftReachable && !rightReachable) return -1
    if (!leftReachable && rightReachable) return 1
    if (!leftReachable && !rightReachable) return left.originalIndex - right.originalIndex

    if (left.latencyMs !== right.latencyMs) {
      return (left.latencyMs || 0) - (right.latencyMs || 0)
    }

    return left.originalIndex - right.originalIndex
  })
}

export function pickDefaultEndpoint(
  results: EndpointProbeResult[]
): EndpointProbeResult | undefined {
  return sortEndpointProbeResults(results)[0]
}

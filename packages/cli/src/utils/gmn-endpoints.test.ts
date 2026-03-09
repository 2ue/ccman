import assert from 'node:assert/strict'
import test from 'node:test'

import {
  GMN1_PROFILE,
  GMN_PROFILE,
  formatEndpointChoiceLabel,
  getEndpointHost,
} from './gmn-endpoints.js'

test('GMN should only include chuangzuoli domain endpoints', () => {
  assert.deepEqual(
    GMN_PROFILE.baseUrls.map((item) => item.url),
    ['https://gmn.chuangzuoli.com', 'https://cdn.gmnchuangzuoli.com']
  )
  assert.ok(GMN_PROFILE.baseUrls.every((item) => item.url.includes('chuangzuoli.com')))
})

test('GMN1 should include only non-chuangzuoli endpoints', () => {
  assert.deepEqual(
    GMN1_PROFILE.baseUrls.map((item) => item.url),
    [
      'https://gmncodex.com',
      'https://gmncode.cn',
      'https://cdn.gmncode.cn',
      'https://gmn.codex.com',
      'https://cdn.gmncode.com',
    ]
  )
  assert.ok(GMN1_PROFILE.baseUrls.every((item) => !item.url.includes('chuangzuoli.com')))
})

test('endpoint choice label should use a compact numbered format', () => {
  assert.equal(getEndpointHost('https://gmn.chuangzuoli.com'), 'gmn.chuangzuoli.com')

  assert.equal(
    formatEndpointChoiceLabel(
      {
        label: '创作里主站',
        url: 'https://gmn.chuangzuoli.com',
        latencyMs: 42,
      },
      0
    ),
    '1. 创作里主站 | gmn.chuangzuoli.com | 42 ms'
  )

  assert.equal(
    formatEndpointChoiceLabel(
      {
        label: 'CF CDN A',
        url: 'https://cdn.gmncode.cn',
        latencyMs: null,
        error: '测速超时',
      },
      2
    ),
    '3. CF CDN A | cdn.gmncode.cn | 测速超时'
  )
})

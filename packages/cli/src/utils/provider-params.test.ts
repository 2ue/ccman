import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveProviderAddInput, resolveProviderEditInput } from './provider-params.js'

const presets = [
  {
    name: 'GMN',
    baseUrl: 'https://gmn.chuangzuoli.com',
    description: 'GMN 主站',
    isBuiltIn: true,
  },
]

test('resolveProviderAddInput should build non-interactive preset input', () => {
  const resolved = resolveProviderAddInput(
    {
      preset: 'gmn',
      apiKey: 'sk-test',
      switch: true,
    },
    presets
  )

  assert.equal(resolved.nonInteractive, true)
  assert.equal(resolved.switchNow, true)
  assert.deepEqual(resolved.input, {
    name: 'GMN',
    desc: undefined,
    baseUrl: 'https://gmn.chuangzuoli.com',
    apiKey: 'sk-test',
  })
})

test('resolveProviderAddInput should allow empty Gemini values', () => {
  const resolved = resolveProviderAddInput(
    {
      name: 'Gemini Default',
      baseUrl: '',
      apiKey: '',
    },
    [],
    {
      allowEmptyBaseUrl: true,
      allowEmptyApiKey: true,
    }
  )

  assert.equal(resolved.nonInteractive, true)
  assert.deepEqual(resolved.input, {
    name: 'Gemini Default',
    desc: undefined,
    baseUrl: '',
    apiKey: '',
  })
})

test('resolveProviderAddInput should reject missing required fields', () => {
  assert.throws(() =>
    resolveProviderAddInput(
      {
        name: 'Broken',
      },
      []
    )
  )
})

test('resolveProviderEditInput should preserve explicit empty desc', () => {
  const resolved = resolveProviderEditInput({
    newName: 'Renamed',
    desc: '',
    baseUrl: 'https://api.example.com',
    apiKey: 'sk-updated',
  })

  assert.equal(resolved.nonInteractive, true)
  assert.deepEqual(resolved.updates, {
    name: 'Renamed',
    desc: '',
    baseUrl: 'https://api.example.com',
    apiKey: 'sk-updated',
  })
})

test('resolveProviderEditInput should allow empty Gemini baseUrl and apiKey', () => {
  const resolved = resolveProviderEditInput(
    {
      baseUrl: '',
      apiKey: '',
    },
    {
      allowEmptyBaseUrl: true,
      allowEmptyApiKey: true,
    }
  )

  assert.deepEqual(resolved.updates, {
    baseUrl: '',
    apiKey: '',
  })
})

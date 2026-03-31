import assert from 'node:assert/strict'
import test from 'node:test'

import { parseConfirmAnswer } from './confirm.js'

test('parseConfirmAnswer accepts uppercase and lowercase y values', () => {
  for (const value of ['y', 'Y']) {
    assert.equal(parseConfirmAnswer(value, false), true)
  }
})

test('parseConfirmAnswer accepts uppercase and lowercase n values', () => {
  for (const value of ['n', 'N']) {
    assert.equal(parseConfirmAnswer(value, true), false)
  }
})

test('parseConfirmAnswer falls back to the default for blank input', () => {
  assert.equal(parseConfirmAnswer('', true), true)
  assert.equal(parseConfirmAnswer('   ', false), false)
})

test('parseConfirmAnswer rejects unsupported values', () => {
  assert.throws(() => parseConfirmAnswer('maybe', true))
})

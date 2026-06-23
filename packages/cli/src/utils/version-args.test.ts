import assert from 'node:assert/strict'
import test from 'node:test'
import { isRootVersionRequest } from './version-args.js'

test('isRootVersionRequest accepts root version flags', () => {
  assert.equal(isRootVersionRequest(['-v']), true)
  assert.equal(isRootVersionRequest(['-V']), true)
  assert.equal(isRootVersionRequest(['--version']), true)
})

test('isRootVersionRequest rejects non-root or partial version args', () => {
  assert.equal(isRootVersionRequest([]), false)
  assert.equal(isRootVersionRequest(['cx', '--version']), false)
  assert.equal(isRootVersionRequest(['-version']), false)
  assert.equal(isRootVersionRequest(['--version', 'extra']), false)
})

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildRuntimeSyncConfig,
  collectSyncCommandInput,
  getMissingConnectionFields,
} from './helpers.js'

test('collectSyncCommandInput should prefer CLI values and trim whitespace', () => {
  const input = collectSyncCommandInput(
    {
      webdavUrl: ' https://dav.example.com ',
      username: ' alice ',
      password: ' secret ',
      authType: 'digest',
      remoteDir: ' /ccman ',
      syncPassword: ' sync-secret ',
      rememberSyncPassword: true,
      yes: true,
      test: true,
    },
    {}
  )

  assert.deepEqual(input.overrides, {
    webdavUrl: 'https://dav.example.com',
    username: 'alice',
    password: 'secret',
    authType: 'digest',
    remoteDir: '/ccman',
    syncPassword: 'sync-secret',
  })
  assert.equal(input.rememberSyncPassword, true)
  assert.equal(input.yes, true)
  assert.equal(input.shouldTest, true)
  assert.equal(input.nonInteractive, true)
})

test('collectSyncCommandInput should fall back to env values', () => {
  const input = collectSyncCommandInput(
    {},
    {
      CCMAN_WEBDAV_URL: 'https://dav.env.example.com',
      CCMAN_WEBDAV_USERNAME: 'env-user',
      CCMAN_WEBDAV_PASSWORD: 'env-pass',
      CCMAN_WEBDAV_AUTH_TYPE: 'password',
      CCMAN_WEBDAV_REMOTE_DIR: '/env-dir',
      CCMAN_SYNC_PASSWORD: 'env-sync-pass',
    }
  )

  assert.deepEqual(input.overrides, {
    webdavUrl: 'https://dav.env.example.com',
    username: 'env-user',
    password: 'env-pass',
    authType: 'password',
    remoteDir: '/env-dir',
    syncPassword: 'env-sync-pass',
  })
  assert.equal(input.nonInteractive, true)
})

test('collectSyncCommandInput should reject conflicting remember flags', () => {
  assert.throws(() =>
    collectSyncCommandInput({
      rememberSyncPassword: true,
      forgetSyncPassword: true,
    })
  )
})

test('buildRuntimeSyncConfig should merge existing config with overrides', () => {
  const merged = buildRuntimeSyncConfig(
    {
      webdavUrl: 'https://dav.old.example.com',
      username: 'old-user',
      password: 'old-pass',
      authType: 'password',
      remoteDir: '/old-dir',
      syncPassword: 'old-sync-pass',
      rememberSyncPassword: false,
      lastSync: 123,
    },
    collectSyncCommandInput({
      webdavUrl: 'https://dav.new.example.com',
      remoteDir: '/new-dir',
    })
  )

  assert.deepEqual(merged, {
    webdavUrl: 'https://dav.new.example.com',
    username: 'old-user',
    password: 'old-pass',
    authType: 'password',
    remoteDir: '/new-dir',
    syncPassword: 'old-sync-pass',
    rememberSyncPassword: false,
    lastSync: 123,
  })
})

test('getMissingConnectionFields should only report required fields', () => {
  assert.deepEqual(
    getMissingConnectionFields({
      webdavUrl: 'https://dav.example.com',
      username: '',
      password: undefined,
      remoteDir: '/ccman',
    }),
    ['username', 'password']
  )
})

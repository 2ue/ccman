import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { __setTestPaths, getCcmanDir } from '../paths.js'
import { uploadToCloud } from './sync-v2.js'
import { uploadToWebDAV } from './webdav-client.js'

vi.mock('./webdav-client.js', () => ({
  uploadToWebDAV: vi.fn(async () => {}),
  downloadFromWebDAV: vi.fn(async () => ''),
  existsOnWebDAV: vi.fn(async () => false),
}))

describe('sync-v2 uploadToCloud', () => {
  beforeEach(() => {
    const testDir = path.join(
      os.tmpdir(),
      `ccman-sync-v2-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )

    __setTestPaths({
      ccman: path.join(testDir, '.ccman'),
      codex: path.join(testDir, '.codex'),
      claude: path.join(testDir, '.claude'),
      opencode: path.join(testDir, '.config', 'opencode'),
      openclaw: path.join(testDir, '.openclaw'),
    })

    fs.rmSync(path.join(testDir, '.ccman'), { recursive: true, force: true })
    vi.clearAllMocks()
  })

  it('should skip missing files and upload existing openclaw config only', async () => {
    const ccmanDir = getCcmanDir()
    fs.mkdirSync(ccmanDir, { recursive: true })
    fs.writeFileSync(
      path.join(ccmanDir, 'openclaw.json'),
      JSON.stringify(
        {
          currentProviderId: 'openclaw-1',
          providers: [
            {
              id: 'openclaw-1',
              name: 'GMN',
              baseUrl: 'https://gmn.chuangzuoli.com/v1',
              apiKey: 'sk-sync-openclaw',
              createdAt: Date.now(),
              lastModified: Date.now(),
            },
          ],
          presets: [],
        },
        null,
        2
      ),
      'utf-8'
    )

    await uploadToCloud(
      {
        webdavUrl: 'https://dav.example.com',
        username: 'demo',
        password: 'demo',
        remoteDir: '/',
      },
      'sync-password'
    )

    const mock = vi.mocked(uploadToWebDAV)
    expect(mock).toHaveBeenCalledTimes(1)
    expect(mock.mock.calls[0][1]).toBe('.ccman/openclaw.json')
  })

  it('should throw when no local sync file exists', async () => {
    await expect(
      uploadToCloud(
        {
          webdavUrl: 'https://dav.example.com',
          username: 'demo',
          password: 'demo',
          remoteDir: '/',
        },
        'sync-password'
      )
    ).rejects.toThrow('本地未找到可上传的配置文件')
  })
})

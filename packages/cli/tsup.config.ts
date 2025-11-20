import { defineConfig } from 'tsup'
import { cpSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'], // 改为 ESM
  clean: true,
  splitting: false,
  external: [
    'commander',
    'inquirer',
    'chalk',
    '@iarna/toml', // TOML 库需要 external（使用 require('stream')）
    'proper-lockfile',
    'webdav',
  ],
  noExternal: ['@ccman/core'], // 强制打包 @ccman/core 源码（Core 不会发布到 npm）
  bundle: true,
  platform: 'node',
  onSuccess: async () => {
    // 复制模板文件到 dist 目录
    const templatesSource = resolve(__dirname, '../core/templates')
    const templatesTarget = resolve(__dirname, 'dist/templates')

    cpSync(templatesSource, templatesTarget, {
      recursive: true,
      force: true,
    })

    console.log('✅ Templates copied to dist/templates')
  },
})

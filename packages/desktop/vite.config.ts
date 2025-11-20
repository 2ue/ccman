import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    electron([
      {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: [
                'electron',
                'path',
                'fs',
                'os',
                'http',
                'https',
                'url',
                'child_process',
                '@ccman/core',
              ],
            },
          },
        },
      },
      {
        entry: 'src/preload/index.ts',
        vite: {
          build: {
            outDir: 'dist/preload',
            rollupOptions: {
              external: ['electron', '@ccman/core'],
            },
          },
        },
        onstart(options) {
          options.reload()
        },
      },
    ]),
  ],
  build: {
    outDir: 'dist/renderer',
    rollupOptions: {
      external: ['@ccman/core'],
    },
  },
  optimizeDeps: {
    exclude: ['@ccman/core'],
  },
  server: {
    port: 5173,
  },
})

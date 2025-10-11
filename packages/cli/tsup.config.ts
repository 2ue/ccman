import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  clean: true,
  splitting: false,
  external: ['commander', 'inquirer', 'chalk'],
  noExternal: ['@ccman/core'],
  bundle: true,
  platform: 'node',
})

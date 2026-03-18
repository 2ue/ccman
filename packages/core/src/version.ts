import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

type PackageJson = {
  version?: string
}

export function resolveVersionFromRuntimeDir(runtimeDir: string): string {
  const candidates = [join(runtimeDir, '../package.json'), join(runtimeDir, '../../package.json')]

  for (const packageJsonPath of candidates) {
    if (!existsSync(packageJsonPath)) {
      continue
    }

    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as PackageJson
    if (typeof pkg.version === 'string' && pkg.version.length > 0) {
      return pkg.version
    }
  }

  throw new Error(`Unable to resolve package.json version from runtime dir: ${runtimeDir}`)
}

export function loadVersion(moduleUrl: string = import.meta.url): string {
  const runtimeDir = dirname(fileURLToPath(moduleUrl))
  return resolveVersionFromRuntimeDir(runtimeDir)
}

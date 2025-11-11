import * as os from 'os'
import * as path from 'path'

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

// 根据环境确定根目录（避免重复判断）
let rootDir: string
if (isTest) {
  // 测试环境：使用临时目录 + 进程 ID（每个测试进程独立）
  rootDir = path.join(os.tmpdir(), `ccman-test-${process.pid}`)
} else if (isDev) {
  // 开发环境：使用临时目录（共享）
  rootDir = path.join(os.tmpdir(), 'ccman-dev')
} else {
  // 生产环境：使用用户主目录
  rootDir = os.homedir()
}

// 所有路径基于 rootDir（统一逻辑）
let ccmanDir: string = path.join(rootDir, '.ccman')
let codexDir: string = path.join(rootDir, '.codex')
let claudeDir: string = path.join(rootDir, '.claude')

/**
 * 获取 ccman 配置目录
 */
export function getCcmanDir(): string {
  return ccmanDir
}

/**
 * 获取 Codex 配置目录
 */
export function getCodexDir(): string {
  return codexDir
}

/**
 * 获取 Claude Code 配置目录
 */
export function getClaudeDir(): string {
  return claudeDir
}

/**
 * 获取 ccman 配置文件路径
 */
export function getConfigPath(): string {
  return path.join(ccmanDir, 'config.json')
}

/**
 * 获取 ccman presets 文件路径（用户自定义）
 */
export function getPresetsPath(): string {
  return path.join(ccmanDir, 'presets.json')
}

/**
 * 获取 ccman 默认 presets 文件路径（内置）
 */
export function getDefaultPresetsPath(): string {
  return path.join(ccmanDir, 'presets.default.json')
}

/**
 * 获取 Codex 配置文件路径
 */
export function getCodexConfigPath(): string {
  return path.join(codexDir, 'config.toml')
}

/**
 * 获取 Codex auth.json 文件路径
 */
export function getCodexAuthPath(): string {
  return path.join(codexDir, 'auth.json')
}

/**
 * 获取 Claude Code 配置文件路径
 */
export function getClaudeConfigPath(): string {
  return path.join(claudeDir, 'settings.json')
}

/**
 * 获取 Claude Code 历史记录文件路径 (~/.claude.json)
 * 注意：这是一个独立文件，不在 ~/.claude/ 目录下
 */
export function getClaudeJsonPath(): string {
  return path.join(rootDir, '.claude.json')
}

/**
 * 测试专用 API：设置自定义路径
 * 仅在测试环境可用，用于精确控制测试路径
 */
export function __setTestPaths(paths: {
  ccman?: string
  codex?: string
  claude?: string
}): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('__setTestPaths can only be used in test environment')
  }
  if (paths.ccman) ccmanDir = paths.ccman
  if (paths.codex) codexDir = paths.codex
  if (paths.claude) claudeDir = paths.claude
}

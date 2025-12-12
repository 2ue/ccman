/**
 * 路径管理模块（向后兼容层）
 *
 * 注意：此模块是向后兼容层，内部使用 path-resolver.ts 的实现
 * 新代码应直接使用 adapters/path-resolver.ts
 *
 * 根据 Decision 6: Root Directory Management，统一使用 path-resolver 的逻辑：
 * 1. CCMAN_ROOT 环境变量（最高优先级）
 * 2. ~/.ccmanrc 持久化配置
 * 3. NODE_ENV=test → /tmp/ccman-test
 * 4. NODE_ENV=development → /tmp/ccman-dev
 * 5. 默认 → os.homedir()
 */

// 从 path-resolver 导入所有路径函数
import {
  getCcmanDir as _getCcmanDir,
  getCodexDir as _getCodexDir,
  getClaudeDir as _getClaudeDir,
  getGeminiDir as _getGeminiDir,
  getCodexConfigPath as _getCodexConfigPath,
  getCodexAuthPath as _getCodexAuthPath,
  getClaudeConfigPath as _getClaudeConfigPath,
  getClaudeJsonPath as _getClaudeJsonPath,
  getGeminiSettingsPath as _getGeminiSettingsPath,
  getGeminiEnvPath as _getGeminiEnvPath,
} from './adapters/path-resolver.js'

import * as path from 'path'

// 为了向后兼容，保留可变的目录变量（供 __setTestPaths 使用）
let ccmanDirOverride: string | null = null
let codexDirOverride: string | null = null
let claudeDirOverride: string | null = null

/**
 * 获取 ccman 配置目录
 */
export function getCcmanDir(): string {
  return ccmanDirOverride || _getCcmanDir()
}

/**
 * 获取 Codex 配置目录
 */
export function getCodexDir(): string {
  return codexDirOverride || _getCodexDir()
}

/**
 * 获取 Claude Code 配置目录
 */
export function getClaudeDir(): string {
  return claudeDirOverride || _getClaudeDir()
}

/**
 * 获取 Gemini CLI 配置目录
 */
export function getGeminiDir(): string {
  return _getGeminiDir()
}

/**
 * 获取 ccman 配置文件路径
 */
export function getConfigPath(): string {
  return path.join(getCcmanDir(), 'config.json')
}

/**
 * 获取 ccman presets 文件路径（用户自定义）
 */
export function getPresetsPath(): string {
  return path.join(getCcmanDir(), 'presets.json')
}

/**
 * 获取 ccman 默认 presets 文件路径（内置）
 */
export function getDefaultPresetsPath(): string {
  return path.join(getCcmanDir(), 'presets.default.json')
}

/**
 * 获取 Codex 配置文件路径
 */
export function getCodexConfigPath(): string {
  return codexDirOverride ? path.join(codexDirOverride, 'config.toml') : _getCodexConfigPath()
}

/**
 * 获取 Codex auth.json 文件路径
 */
export function getCodexAuthPath(): string {
  return codexDirOverride ? path.join(codexDirOverride, 'auth.json') : _getCodexAuthPath()
}

/**
 * 获取 Claude Code 配置文件路径
 */
export function getClaudeConfigPath(): string {
  return claudeDirOverride ? path.join(claudeDirOverride, 'settings.json') : _getClaudeConfigPath()
}

/**
 * 获取 Claude Code 历史记录文件路径 (~/.claude.json)
 * 注意：这是一个独立文件，不在 ~/.claude/ 目录下
 */
export function getClaudeJsonPath(): string {
  return _getClaudeJsonPath()
}

/**
 * 获取 Gemini CLI 用户配置文件路径 (~/.gemini/settings.json)
 */
export function getGeminiSettingsPath(): string {
  return _getGeminiSettingsPath()
}

/**
 * 获取 Gemini CLI 环境变量文件路径 (~/.gemini/.env)
 */
export function getGeminiEnvPath(): string {
  return _getGeminiEnvPath()
}

/**
 * 测试专用 API：设置自定义路径
 * 仅在测试环境可用，用于精确控制测试路径
 *
 * @deprecated 推荐使用 path-resolver.ts 的 setRootDir() 代替
 */
export function __setTestPaths(paths: { ccman?: string; codex?: string; claude?: string }): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('__setTestPaths can only be used in test environment')
  }
  if (paths.ccman) ccmanDirOverride = paths.ccman
  if (paths.codex) codexDirOverride = paths.codex
  if (paths.claude) claudeDirOverride = paths.claude
}

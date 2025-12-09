/**
 * PathResolver - 根目录和路径管理
 *
 * 支持特性：
 * - 持久化根目录配置（~/.ccmanrc）
 * - CCMAN_ROOT 环境变量覆盖
 * - 固定测试路径（/tmp/ccman-test，无 PID）
 * - 开发环境隔离
 */

import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

// =============================================================================
// 配置和常量
// =============================================================================

const RC_PATH = path.join(os.homedir(), '.ccmanrc')
const DEFAULT_TEST_PATH = '/tmp/ccman-test'
const DEFAULT_DEV_PATH = path.join(os.tmpdir(), 'ccman-dev')

interface RcConfig {
  rootDir?: string
}

// =============================================================================
// 根目录决策逻辑
// =============================================================================

let cachedRootDir: string | null = null

/**
 * 获取根目录
 *
 * 决策顺序（优先级从高到低）：
 * 1. CCMAN_ROOT 环境变量（最高优先级，可覆盖一切）
 * 2. ~/.ccmanrc 持久化配置
 * 3. NODE_ENV=test → /tmp/ccman-test（固定，无 PID）
 * 4. NODE_ENV=development → /tmp/ccman-dev
 * 5. 默认 → os.homedir()
 */
export function getRootDir(): string {
  // 如果已缓存且没有环境变量覆盖，直接返回
  if (cachedRootDir && !process.env.CCMAN_ROOT) {
    return cachedRootDir
  }

  // 1. 环境变量（最高优先级）
  if (process.env.CCMAN_ROOT) {
    cachedRootDir = process.env.CCMAN_ROOT
    return cachedRootDir
  }

  // 2. 持久化配置
  try {
    if (fs.existsSync(RC_PATH)) {
      const content = fs.readFileSync(RC_PATH, 'utf-8')
      const config: RcConfig = JSON.parse(content)
      if (config.rootDir) {
        cachedRootDir = config.rootDir
        return cachedRootDir
      }
    }
  } catch (error) {
    // 忽略解析错误，继续使用默认逻辑
  }

  // 3. NODE_ENV=test → 固定测试路径（不带 PID）
  if (process.env.NODE_ENV === 'test') {
    cachedRootDir = DEFAULT_TEST_PATH
    return cachedRootDir
  }

  // 4. NODE_ENV=development → 开发路径
  if (process.env.NODE_ENV === 'development') {
    cachedRootDir = DEFAULT_DEV_PATH
    return cachedRootDir
  }

  // 5. 默认 → 用户主目录
  cachedRootDir = os.homedir()
  return cachedRootDir
}

/**
 * 设置根目录（持久化到 ~/.ccmanrc）
 *
 * @param root 新的根目录路径
 */
export function setRootDir(root: string): void {
  // 验证路径
  if (!path.isAbsolute(root)) {
    throw new Error(`Root directory must be an absolute path: ${root}`)
  }

  // 更新缓存
  cachedRootDir = root

  // 持久化到 ~/.ccmanrc
  const config: RcConfig = { rootDir: root }
  try {
    fs.writeFileSync(RC_PATH, JSON.stringify(config, null, 2), { mode: 0o600 })
  } catch (error) {
    throw new Error(`Failed to persist root directory to ${RC_PATH}: ${error}`)
  }
}

/**
 * 重置根目录（删除 ~/.ccmanrc，使用默认逻辑）
 */
export function resetRootDir(): void {
  cachedRootDir = null

  // 删除持久化配置
  try {
    if (fs.existsSync(RC_PATH)) {
      fs.unlinkSync(RC_PATH)
    }
  } catch (error) {
    throw new Error(`Failed to reset root directory: ${error}`)
  }
}

// =============================================================================
// 工具目录路径
// =============================================================================

/**
 * 获取 ccman 配置目录
 */
export function getCcmanDir(): string {
  return path.join(getRootDir(), '.ccman')
}

/**
 * 获取 Codex 配置目录
 */
export function getCodexDir(): string {
  return path.join(getRootDir(), '.codex')
}

/**
 * 获取 Claude Code 配置目录
 */
export function getClaudeDir(): string {
  return path.join(getRootDir(), '.claude')
}

/**
 * 获取 Gemini CLI 配置目录
 */
export function getGeminiDir(): string {
  return path.join(getRootDir(), '.gemini')
}

// =============================================================================
// 配置文件路径
// =============================================================================

/**
 * 获取 ccman 工具配置文件路径
 * @param tool 工具 ID
 */
export function getCcmanConfigPath(tool: string): string {
  return path.join(getCcmanDir(), `${tool}.json`)
}

/**
 * 获取 Codex 配置文件路径
 */
export function getCodexConfigPath(): string {
  return path.join(getCodexDir(), 'config.toml')
}

/**
 * 获取 Codex auth.json 文件路径
 */
export function getCodexAuthPath(): string {
  return path.join(getCodexDir(), 'auth.json')
}

/**
 * 获取 Claude Code 配置文件路径
 */
export function getClaudeConfigPath(): string {
  return path.join(getClaudeDir(), 'settings.json')
}

/**
 * 获取 Claude Code 历史记录文件路径 (~/.claude.json)
 */
export function getClaudeJsonPath(): string {
  return path.join(getRootDir(), '.claude.json')
}

/**
 * 获取 Gemini CLI 配置文件路径
 */
export function getGeminiSettingsPath(): string {
  return path.join(getGeminiDir(), 'settings.json')
}

/**
 * 获取 Gemini CLI 环境变量文件路径
 */
export function getGeminiEnvPath(): string {
  return path.join(getGeminiDir(), '.env')
}

// =============================================================================
// 工具特定目录（通用）
// =============================================================================

/**
 * 获取工具的配置目录
 * @param tool 工具 ID
 */
export function getToolDir(tool: string): string {
  const rootDir = getRootDir()

  // 标准工具使用固定目录名
  const dirMap: Record<string, string> = {
    ccman: '.ccman',
    'claude-code': '.claude',
    codex: '.codex',
    'gemini-cli': '.gemini',
  }

  const dirName = dirMap[tool] || `.${tool}`
  return path.join(rootDir, dirName)
}

/**
 * 展开路径中的 ~ 符号
 * @param filePath 可能包含 ~ 的路径
 */
export function expandPath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(getRootDir(), filePath.slice(2))
  }
  return filePath
}

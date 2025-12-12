/**
 * 工具管理器（Tool Manager）- 兼容层
 *
 * 这是一个兼容层，将旧 API（createCodexManager/createClaudeManager 等）
 * 委托给新的 ProviderService。
 *
 * 背景：
 * - 旧系统使用 'claude' 作为工具标识，存储到 claude.json
 * - 新系统使用 'claude-code' 作为工具标识，存储到 claude-code.json
 * - 这导致 sync 命令无法看到 CLI 添加的服务商（数据隔离 Bug）
 *
 * 解决方案：
 * - 旧 API 委托给 ProviderService
 * - 工具标识自动映射：'claude' → 'claude-code'，'gemini' → 'gemini-cli'
 * - 数据迁移：旧配置文件自动重命名
 *
 * @deprecated 请直接使用 ProviderService
 */
/* eslint-disable max-lines */

import * as path from 'path'
import { getCcmanDir } from './paths.js'
import { readJSON, writeJSON, fileExists, ensureDir } from './utils/file.js'
import { ProviderService } from './services/provider-service.js'
import { CODEX_PRESETS } from './presets/codex.js'
import { CC_PRESETS } from './presets/claude.js'
import { MCP_PRESETS } from './presets/mcp.js'
import { GEMINI_PRESETS } from './presets/gemini.js'
import type { Tool, Provider as NewProvider } from './types.js'
import type {
  ToolType,
  Provider,
  PresetTemplate,
  InternalPresetTemplate,
  ToolConfig,
  AddProviderInput,
  EditProviderInput,
  AddPresetInput,
  EditPresetInput,
  ToolManager,
} from './tool-manager.types.js'
import {
  ProviderNotFoundError,
  ProviderNameConflictError,
  PresetNameConflictError,
} from './tool-manager.types.js'

// 重新导出类型，保持向后兼容
export type {
  ToolType,
  Provider,
  PresetTemplate,
  AddProviderInput,
  EditProviderInput,
  AddPresetInput,
  EditPresetInput,
  ToolManager,
}
export { ProviderNotFoundError, ProviderNameConflictError, PresetNameConflictError }

// =============================================================================
// 工具标识映射（旧 → 新）
// =============================================================================

/**
 * 旧工具标识 → 新工具标识 映射
 *
 * - 'codex' → 'codex'（无变化）
 * - 'claude' → 'claude-code'
 * - 'gemini' → 'gemini-cli'
 * - 'mcp' → 'mcp'（MCP 由 McpService 单独处理，但保留映射以便将来使用）
 */
const TOOL_ID_MAP: Record<ToolType, Tool> = {
  codex: 'codex',
  claude: 'claude-code',
  gemini: 'gemini-cli',
  mcp: 'mcp',
}

/**
 * 将旧工具标识映射到新工具标识
 */
function mapToolType(tool: ToolType): Tool {
  return TOOL_ID_MAP[tool]
}

// 跟踪已发出警告的工具，避免重复警告
const warnedTools = new Set<ToolType>()

// =============================================================================
// 预设配置（用于 listPresets 等方法）
// =============================================================================

/**
 * 工具内置预设映射
 */
const TOOL_PRESETS: Record<ToolType, InternalPresetTemplate[]> = {
  codex: CODEX_PRESETS,
  claude: CC_PRESETS,
  gemini: GEMINI_PRESETS,
  mcp: MCP_PRESETS,
}

/**
 * 获取预设配置文件路径
 */
function getPresetsConfigPath(tool: ToolType): string {
  const mappedTool = mapToolType(tool)
  return path.join(getCcmanDir(), `${mappedTool}.json`)
}

/**
 * 加载预设配置（用于用户自定义预设的读写）
 */
function loadPresetsConfig(tool: ToolType): ToolConfig {
  const configPath = getPresetsConfigPath(tool)
  if (!fileExists(configPath)) {
    return { providers: [], presets: [] }
  }
  return readJSON<ToolConfig>(configPath)
}

/**
 * 保存预设配置
 */
function savePresetsConfig(tool: ToolType, config: ToolConfig): void {
  const configPath = getPresetsConfigPath(tool)
  ensureDir(getCcmanDir())
  writeJSON(configPath, config)
}

// =============================================================================
// 工具管理器工厂函数（委托给 ProviderService）
// =============================================================================

/**
 * 统一工具管理器工厂函数
 *
 * 这是一个兼容层，将旧 API 委托给新的 ProviderService。
 *
 * @deprecated 请直接使用 ProviderService
 */
// eslint-disable-next-line max-lines-per-function
function createToolManager(tool: ToolType): ToolManager {
  const mappedTool = mapToolType(tool)
  const builtinPresets = TOOL_PRESETS[tool]

  // 发出废弃警告（每个工具仅一次）
  if (!warnedTools.has(tool)) {
    // 在生产环境中，静默警告以避免干扰用户
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.warn(
        `[Deprecated] createToolManager('${tool}') is deprecated. Use ProviderService directly.`
      )
    }
    warnedTools.add(tool)
  }

  /**
   * 将 NewProvider 转换为旧的 Provider 类型
   * 两者结构相同，只是来源不同
   */
  function toProvider(p: NewProvider): Provider {
    return {
      id: p.id,
      name: p.name,
      baseUrl: p.baseUrl,
      apiKey: p.apiKey,
      model: p.model,
      desc: p.desc,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      lastUsedAt: p.lastUsedAt,
    }
  }

  /**
   * 根据 id 从列表中找到 provider
   */
  function findById(providers: NewProvider[], id: string): NewProvider | undefined {
    return providers.find((p) => p.id === id)
  }

  return {
    add(input: AddProviderInput): Provider {
      try {
        const newProvider = ProviderService.add(mappedTool, {
          name: input.name,
          baseUrl: input.baseUrl,
          apiKey: input.apiKey,
          model: input.model,
          desc: input.desc,
        })
        return toProvider(newProvider)
      } catch (error) {
        // 转换错误类型以保持兼容性
        if (error instanceof Error && error.message.includes('already exists')) {
          throw new ProviderNameConflictError(input.name)
        }
        throw error
      }
    },

    list(): Provider[] {
      const providers = ProviderService.list(mappedTool)
      return providers.map(toProvider)
    },

    get(id: string): Provider {
      const providers = ProviderService.list(mappedTool)
      const provider = findById(providers, id)
      if (!provider) {
        throw new ProviderNotFoundError(id)
      }
      return toProvider(provider)
    },

    findByName(name: string): Provider | undefined {
      try {
        const provider = ProviderService.get(mappedTool, name)
        return toProvider(provider)
      } catch {
        return undefined
      }
    },

    switch(id: string): void {
      const providers = ProviderService.list(mappedTool)
      const provider = findById(providers, id)
      if (!provider) {
        throw new ProviderNotFoundError(id)
      }
      ProviderService.apply(mappedTool, provider.name)
    },

    getCurrent(): Provider | null {
      const provider = ProviderService.current(mappedTool)
      return provider ? toProvider(provider) : null
    },

    edit(id: string, updates: EditProviderInput): Provider {
      const providers = ProviderService.list(mappedTool)
      const provider = findById(providers, id)
      if (!provider) {
        throw new ProviderNotFoundError(id)
      }

      try {
        const updated = ProviderService.update(mappedTool, provider.name, {
          name: updates.name,
          baseUrl: updates.baseUrl,
          apiKey: updates.apiKey,
          model: updates.model,
          desc: updates.desc,
        })
        return toProvider(updated)
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          throw new ProviderNameConflictError(updates.name!)
        }
        throw error
      }
    },

    remove(id: string): void {
      const providers = ProviderService.list(mappedTool)
      const provider = findById(providers, id)
      if (!provider) {
        throw new ProviderNotFoundError(id)
      }
      ProviderService.delete(mappedTool, provider.name)
    },

    clone(sourceId: string, newName: string): Provider {
      const providers = ProviderService.list(mappedTool)
      const source = findById(providers, sourceId)
      if (!source) {
        throw new ProviderNotFoundError(sourceId)
      }

      try {
        const cloned = ProviderService.clone(mappedTool, source.name, newName)
        return toProvider(cloned)
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          throw new ProviderNameConflictError(newName)
        }
        throw error
      }
    },

    // =========================================================================
    // 预设相关方法（保留原实现，因为 ProviderService 不处理预设）
    // =========================================================================

    addPreset(input: AddPresetInput): PresetTemplate {
      const config = loadPresetsConfig(tool)

      if (!config.presets) {
        config.presets = []
      }

      const allPresets = [...builtinPresets, ...config.presets]
      const nameExists = allPresets.some((p) => p.name === input.name)
      if (nameExists) {
        throw new PresetNameConflictError(input.name)
      }

      const preset: InternalPresetTemplate = {
        name: input.name,
        baseUrl: input.baseUrl,
        description: input.description,
      }

      config.presets.push(preset)
      savePresetsConfig(tool, config)

      return {
        ...preset,
        isBuiltIn: false,
      }
    },

    listPresets(): PresetTemplate[] {
      const config = loadPresetsConfig(tool)
      const userPresets = config.presets || []

      const builtinWithFlag = builtinPresets.map((p) => ({
        ...p,
        isBuiltIn: true,
      }))

      const userWithFlag = userPresets.map((p) => ({
        ...p,
        isBuiltIn: false,
      }))

      return [...builtinWithFlag, ...userWithFlag]
    },

    editPreset(name: string, updates: EditPresetInput): PresetTemplate {
      const config = loadPresetsConfig(tool)

      if (!config.presets) {
        config.presets = []
      }

      const preset = config.presets.find((p) => p.name === name)

      if (!preset) {
        throw new Error(`预置不存在: ${name}`)
      }

      if (updates.name !== undefined && updates.name !== preset.name) {
        const allPresets = [...builtinPresets, ...config.presets]
        const nameConflict = allPresets.some((p) => p.name !== name && p.name === updates.name)
        if (nameConflict) {
          throw new PresetNameConflictError(updates.name)
        }
      }

      if (updates.name !== undefined) preset.name = updates.name
      if (updates.baseUrl !== undefined) preset.baseUrl = updates.baseUrl
      if (updates.description !== undefined) preset.description = updates.description

      savePresetsConfig(tool, config)

      return {
        ...preset,
        isBuiltIn: false,
      }
    },

    removePreset(name: string): void {
      const config = loadPresetsConfig(tool)

      if (!config.presets) {
        return
      }

      const index = config.presets.findIndex((p) => p.name === name)

      if (index === -1) {
        throw new Error(`Preset not found: ${name}`)
      }

      config.presets.splice(index, 1)
      savePresetsConfig(tool, config)
    },
  }
}

/**
 * 创建 Codex 工具管理器（对外 API）
 */
export function createCodexManager(): ToolManager {
  return createToolManager('codex')
}

/**
 * 创建 Claude 工具管理器（对外 API）
 */
export function createClaudeManager(): ToolManager {
  return createToolManager('claude')
}

/**
 * 创建 MCP 管理器（对外 API）
 */
export function createMCPManager(): ToolManager {
  return createToolManager('mcp')
}

/**
 * 创建 Gemini CLI 管理器（对外 API）
 */
export function createGeminiManager(): ToolManager {
  return createToolManager('gemini')
}

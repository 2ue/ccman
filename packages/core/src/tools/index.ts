/**
 * Tools 统一导出和注册
 */

// 导出所有 tool descriptors
export { claudeDescriptor } from './claude-code/index.js'
export { codexDescriptor } from './codex/index.js'
export { geminiDescriptor } from './gemini-cli/index.js'
export { ccmanDescriptor } from './ccman/index.js'

// 导出所有 adapters (for direct usage if needed)
export { ClaudeConfigAdapter, ClaudeServiceAdapter, CLAUDE_PRESETS } from './claude-code/index.js'
export { CodexConfigAdapter, CodexServiceAdapter, CODEX_PRESETS } from './codex/index.js'
export { GeminiConfigAdapter, GeminiServiceAdapter, GEMINI_PRESETS } from './gemini-cli/index.js'
export { CcmanConfigAdapter } from './ccman/index.js'

// 自动注册所有工具到 ToolRegistry
import { ToolRegistry } from '../services/tool-registry.js'
import { claudeDescriptor } from './claude-code/index.js'
import { codexDescriptor } from './codex/index.js'
import { geminiDescriptor } from './gemini-cli/index.js'
import { ccmanDescriptor } from './ccman/index.js'

// 注册所有工具
ToolRegistry.register(claudeDescriptor)
ToolRegistry.register(codexDescriptor)
ToolRegistry.register(geminiDescriptor)
ToolRegistry.register(ccmanDescriptor)

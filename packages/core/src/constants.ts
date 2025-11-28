/**
 * 全局常量定义
 *
 * 这个文件从 @ccman/types 重新导出共享的类型和常量，
 * 并提供 Core 模块特有的辅助函数。
 *
 * 类型定义的单一真实来源是 @ccman/types，
 * 这样可以避免重复定义，降低维护成本。
 */

// 从 @ccman/types 重新导出共享的类型和常量
export {
  TOOL_TYPES,
  type ToolType,
  MAIN_TOOL_TYPES,
  type MainToolType,
  TOOL_CONFIG,
} from '@ccman/types'

import {
  TOOL_CONFIG,
  type ToolType,
  type MainToolType,
  TOOL_TYPES,
  MAIN_TOOL_TYPES,
} from '@ccman/types'

/**
 * 获取工具配置的辅助函数
 * @param toolType 工具类型
 * @returns 工具配置对象
 */
export function getToolConfig(toolType: ToolType) {
  return TOOL_CONFIG[toolType]
}

/**
 * 检查是否为有效的工具类型
 * @param value 要检查的值
 * @returns 是否为有效的工具类型
 */
export function isValidToolType(value: unknown): value is ToolType {
  return Object.values(TOOL_TYPES).includes(value as ToolType)
}

/**
 * 检查是否为主要工具类型（排除 MCP）
 * @param value 要检查的值
 * @returns 是否为主要工具类型
 */
export function isMainToolType(value: unknown): value is MainToolType {
  return Object.values(MAIN_TOOL_TYPES).includes(value as MainToolType)
}

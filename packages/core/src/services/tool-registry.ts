/**
 * ToolRegistry - 工具注册中心
 *
 * 功能：
 * - 管理所有 ToolDescriptor
 * - 提供工具查询和发现
 * - 支持按能力筛选
 */

import type { Tool, ToolDescriptor } from '../types.js'
import { ToolNotFoundError } from '../types.js'

// =============================================================================
// Tool Registry 单例
// =============================================================================

class ToolRegistryImpl {
  private tools: Map<Tool, ToolDescriptor> = new Map()

  /**
   * 注册工具
   *
   * @param descriptor 工具描述符
   * @throws {Error} 如果工具已注册
   */
  register(descriptor: ToolDescriptor): void {
    if (this.tools.has(descriptor.id)) {
      throw new Error(`Tool already registered: ${descriptor.id}`)
    }

    // 验证必填字段
    this.validateDescriptor(descriptor)

    this.tools.set(descriptor.id, descriptor)
  }

  /**
   * 批量注册工具
   *
   * @param descriptors 工具描述符数组
   */
  registerAll(descriptors: ToolDescriptor[]): void {
    for (const descriptor of descriptors) {
      this.register(descriptor)
    }
  }

  /**
   * 获取工具描述符
   *
   * @param tool 工具 ID
   * @returns 工具描述符
   * @throws {ToolNotFoundError} 如果工具不存在
   */
  get(tool: Tool): ToolDescriptor {
    const descriptor = this.tools.get(tool)

    if (!descriptor) {
      throw new ToolNotFoundError(tool)
    }

    return descriptor
  }

  /**
   * 列出所有工具
   *
   * @returns 所有工具描述符数组
   */
  list(): ToolDescriptor[] {
    return Array.from(this.tools.values())
  }

  /**
   * 检查工具是否存在
   *
   * @param tool 工具 ID
   * @returns 是否存在
   */
  has(tool: Tool): boolean {
    return this.tools.has(tool)
  }

  /**
   * 根据短名称查找工具
   *
   * @param short 短名称（如 'cx', 'cc', 'gc'）
   * @returns 工具描述符或 undefined
   */
  getByShort(short: string): ToolDescriptor | undefined {
    for (const descriptor of this.tools.values()) {
      if (descriptor.short === short) {
        return descriptor
      }
    }
    return undefined
  }

  /**
   * 根据能力筛选工具
   *
   * @param capability 能力类型
   * @returns 符合条件的工具描述符数组
   */
  filterByCapability(capability: 'service' | 'mcp' | 'config'): ToolDescriptor[] {
    const result: ToolDescriptor[] = []

    for (const descriptor of this.tools.values()) {
      if (descriptor.capabilities.includes(capability)) {
        result.push(descriptor)
      }
    }

    return result
  }

  /**
   * 取消注册工具（主要用于测试）
   *
   * @param tool 工具 ID
   */
  unregister(tool: Tool): void {
    this.tools.delete(tool)
  }

  /**
   * 清空所有注册（主要用于测试）
   */
  clear(): void {
    this.tools.clear()
  }

  /**
   * 验证工具描述符
   *
   * @param descriptor 工具描述符
   * @throws {Error} 如果验证失败
   */
  private validateDescriptor(descriptor: ToolDescriptor): void {
    // 验证必填字段
    if (!descriptor.id) {
      throw new Error('Tool descriptor must have an id')
    }
    if (!descriptor.short) {
      throw new Error(`Tool descriptor ${descriptor.id} must have a short name`)
    }
    if (!descriptor.displayName) {
      throw new Error(`Tool descriptor ${descriptor.id} must have a displayName`)
    }
    if (!Array.isArray(descriptor.configPaths)) {
      throw new Error(`Tool descriptor ${descriptor.id} must have configPaths array`)
    }
    if (!Array.isArray(descriptor.capabilities)) {
      throw new Error(`Tool descriptor ${descriptor.id} must have capabilities array`)
    }
    if (descriptor.capabilities.length === 0) {
      throw new Error(`Tool descriptor ${descriptor.id} must have at least one capability`)
    }

    // 验证能力和适配器的一致性
    if (descriptor.capabilities.includes('service') && !descriptor.adapters.service) {
      throw new Error(
        `Tool descriptor ${descriptor.id} has 'service' capability but no ServiceAdapter`
      )
    }

    if (descriptor.capabilities.includes('mcp') && !descriptor.adapters.mcp) {
      throw new Error(`Tool descriptor ${descriptor.id} has 'mcp' capability but no McpAdapter`)
    }

    if (descriptor.capabilities.includes('config') && !descriptor.adapters.config) {
      throw new Error(
        `Tool descriptor ${descriptor.id} has 'config' capability but no ConfigAdapter`
      )
    }

    // 验证短名称唯一性
    const existingWithSameShort = this.getByShort(descriptor.short)
    if (existingWithSameShort && existingWithSameShort.id !== descriptor.id) {
      throw new Error(
        `Short name '${descriptor.short}' is already used by tool '${existingWithSameShort.id}'`
      )
    }
  }
}

// =============================================================================
// 导出单例实例
// =============================================================================

/**
 * 全局 ToolRegistry 实例
 */
export const ToolRegistry = new ToolRegistryImpl()

/**
 * TemplateEngine - 模板渲染和配置合并
 *
 * 功能：
 * - 加载模板文件
 * - 替换占位符（{{key}}, {{key|default:value}}）
 * - 深度合并配置（支持多种合并模式）
 */

import * as fs from 'fs'
import * as path from 'path'
import type { MergeMode } from '../types.js'

// =============================================================================
// 模板加载
// =============================================================================

const TEMPLATE_BASE_DIR = path.join(__dirname, '../../templates')

/**
 * 加载模板文件
 *
 * @param templatePath 模板文件路径（相对于 templates/ 目录）
 * @returns 模板内容
 */
export function loadTemplate(templatePath: string): string {
  const fullPath = path.join(TEMPLATE_BASE_DIR, templatePath)

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Template not found: ${templatePath} (${fullPath})`)
  }

  try {
    return fs.readFileSync(fullPath, 'utf-8')
  } catch (error) {
    throw new Error(`Failed to load template ${templatePath}: ${error}`)
  }
}

// =============================================================================
// 占位符替换
// =============================================================================

/**
 * 渲染模板（替换占位符）
 *
 * 支持的语法：
 * - {{key}} - 简单替换
 * - {{obj.nested.key}} - 嵌套访问
 * - {{key|default:'value'}} - 默认值
 *
 * @param template 模板字符串
 * @param data 数据对象
 * @returns 渲染后的字符串
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
  // 匹配 {{key}} 或 {{key|default:'value'}}
  const placeholderRegex = /\{\{([^}]+)\}\}/g

  return template.replace(placeholderRegex, (match, expression) => {
    const trimmed = expression.trim()

    // 检查是否有默认值
    const defaultMatch = trimmed.match(/^(.+?)\|default:['"](.+?)['"]$/)

    if (defaultMatch) {
      const key = defaultMatch[1].trim()
      const defaultValue = defaultMatch[2]
      const value = getNestedValue(data, key)
      return value !== undefined && value !== null ? String(value) : defaultValue
    }

    // 没有默认值，直接获取值
    const value = getNestedValue(data, trimmed)

    if (value === undefined || value === null) {
      // 可选：抛出错误或返回空字符串
      // throw new Error(`Missing value for placeholder: ${trimmed}`)
      return '' // 返回空字符串
    }

    return String(value)
  })
}

/**
 * 获取嵌套对象的值
 *
 * @param obj 对象
 * @param key 键（支持 'a.b.c' 格式）
 * @returns 值或 undefined
 */
function getNestedValue(obj: any, key: string): any {
  const keys = key.split('.')
  let current = obj

  for (const k of keys) {
    if (current === undefined || current === null) {
      return undefined
    }
    current = current[k]
  }

  return current
}

// =============================================================================
// 深度合并
// =============================================================================

/**
 * 深度合并两个对象
 *
 * @param base 基础对象
 * @param override 覆盖对象
 * @param mode 合并模式
 * @returns 合并后的对象
 */
export function deepMerge(base: any, override: any, mode: MergeMode = 'old-override-new'): any {
  // 处理 null/undefined
  if (base === null || base === undefined) {
    return override
  }
  if (override === null || override === undefined) {
    return base
  }

  // 如果类型不同，根据模式决定返回哪个
  if (typeof base !== typeof override) {
    return mode === 'old-override-new' ? base : override
  }

  // 如果不是对象，根据模式决定
  if (typeof base !== 'object' || Array.isArray(base) || Array.isArray(override)) {
    return mode === 'old-override-new' ? base : override
  }

  // 深度合并对象
  const result: any = { ...base }

  for (const key in override) {
    if (Object.prototype.hasOwnProperty.call(override, key)) {
      if (Object.prototype.hasOwnProperty.call(base, key)) {
        // 键存在于两个对象中，递归合并
        result[key] = deepMerge(base[key], override[key], mode)
      } else {
        // 键只在 override 中，直接添加
        result[key] = override[key]
      }
    }
  }

  return result
}

/**
 * 合并模板输出和现有配置
 *
 * @param existingConfig 现有配置
 * @param templateOutput 模板渲染输出（已解析为对象）
 * @param mode 合并模式（默认 'old-override-new'）
 * @returns 合并后的配置
 */
export function mergeConfig(
  existingConfig: any,
  templateOutput: any,
  mode: MergeMode = 'old-override-new'
): any {
  if (mode === 'old-override-new') {
    // 老配置优先：merge(template, existing)
    // 这样 existing 的值会覆盖 template 的值
    return deepMerge(templateOutput, existingConfig, mode)
  } else {
    // 新配置优先：merge(existing, template)
    // 这样 template 的值会覆盖 existing 的值
    return deepMerge(existingConfig, templateOutput, mode)
  }
}

// =============================================================================
// 工具函数
// =============================================================================

/**
 * 判断值是否为普通对象（不是数组、Date、RegExp 等）
 */
export function isPlainObject(value: any): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

/**
 * 克隆对象（深拷贝）
 */
export function cloneDeep(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => cloneDeep(item))
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags)
  }

  const cloned: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = cloneDeep(obj[key])
    }
  }

  return cloned
}

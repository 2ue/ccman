/**
 * 模板工具函数
 */

/**
 * 简单的变量替换（零依赖）
 *
 * @example
 * const template = { apiKey: "{{apiKey}}", url: "{{baseUrl}}/v1" }
 * const result = replaceVariables(template, { apiKey: "sk-xxx", baseUrl: "https://api.com" })
 * // => { apiKey: "sk-xxx", url: "https://api.com/v1" }
 */
export function replaceVariables(template: any, variables: Record<string, string>): any {
  const jsonStr = JSON.stringify(template)
  let result = jsonStr

  for (const [key, value] of Object.entries(variables)) {
    // 转义特殊字符
    const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), escapedValue)
  }

  return JSON.parse(result)
}

/**
 * 深度合并对象（source 优先）
 *
 * 合并策略：
 * - 对象：递归合并
 * - 数组：source 覆盖 target
 * - 基本类型：source 覆盖 target
 *
 * @param target 默认配置
 * @param source 用户配置（优先级更高）
 *
 * @example
 * const target = { a: 1, b: { c: 2 } }
 * const source = { b: { d: 3 }, e: 4 }
 * const result = deepMerge(target, source)
 * // => { a: 1, b: { c: 2, d: 3 }, e: 4 }
 */
export function deepMerge<T = any>(target: any, source: any): T {
  const result = { ...target }

  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = result[key]

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // 递归合并对象
      result[key] = deepMerge(targetValue, sourceValue)
    } else {
      // 覆盖（包括数组、基本类型、null、undefined）
      result[key] = sourceValue
    }
  }

  return result as T
}

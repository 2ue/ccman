/**
 * 统一的卡片样式定义
 * 遵循设计系统，确保UI一致性
 */

export const CARD_STYLES = {
  // 基础卡片容器
  base: 'bg-white rounded-lg p-4 border transition-all',

  // Provider 卡片
  provider: 'hover:shadow-md border-gray-200 hover:border-gray-300',

  // Provider 卡片激活状态
  providerActive: 'border-blue-500',

  // MCP 卡片
  mcp: 'hover:shadow-md border-gray-200 hover:border-gray-300',

  // 卡片标题
  title: 'text-base font-medium text-gray-900 truncate',

  // 卡片副标题
  subtitle: 'text-xs text-gray-600 font-mono truncate',

  // 卡片描述
  description: 'text-sm text-gray-600 line-clamp-2',

  // 激活标签
  badge:
    'inline-block px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-100 text-blue-700 border-blue-200',

  // 卡片底部操作区域
  actions: 'flex gap-2 pt-3 border-t border-gray-100',

  // 主要操作按钮
  actionPrimary:
    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors',

  // 卡片内图标按钮 - 克隆
  iconClone: 'p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors',

  // 卡片内图标按钮 - 编辑
  iconEdit: 'p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors',

  // 卡片内图标按钮 - 删除
  iconDelete: 'p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors',
} as const

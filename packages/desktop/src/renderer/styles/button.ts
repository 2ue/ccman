/**
 * 统一的按钮样式定义
 * 遵循设计系统，确保UI一致性
 */

export const BUTTON_STYLES = {
  // 主要操作：添加、保存、确认
  primary:
    'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium',

  // 次要操作：取消、关闭、编辑配置
  secondary:
    'px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium',

  // 危险操作：删除
  danger:
    'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium',

  // 图标按钮（小尺寸，用于工具栏）
  icon: 'p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors',

  // 卡片内操作按钮（通用）
  cardAction:
    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors',

  // 卡片内主要操作（蓝色）
  cardActionPrimary:
    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors',

  // 卡片内成功操作（绿色）
  cardActionSuccess:
    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors',

  // 卡片内危险操作（红色）
  cardActionDanger:
    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors',
} as const

/**
 * 带图标的按钮组合样式
 */
export const BUTTON_WITH_ICON = {
  primary: `${BUTTON_STYLES.primary} flex items-center gap-2`,
  secondary: `${BUTTON_STYLES.secondary} flex items-center gap-2`,
  danger: `${BUTTON_STYLES.danger} flex items-center gap-2`,
} as const

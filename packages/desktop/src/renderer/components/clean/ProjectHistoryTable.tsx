/**
 * Project History Table Component
 * 显示所有项目的历史记录,支持单独删除
 */

import { useState, Fragment } from 'react'
import { Trash2, Folder, Eye, EyeOff } from 'lucide-react'
import type { ProjectDetail } from '@ccman/types'
import ProjectHistoryDetail from './ProjectHistoryDetail'

interface ProjectHistoryTableProps {
  projects: ProjectDetail[]
  onDelete: (projectPath: string) => void
  onDeleteHistoryEntry: (projectPath: string, index: number) => void
  onClearHistory: (projectPath: string) => void
  loading: boolean
}

interface ProjectHistoryRowProps {
  project: ProjectDetail
  onDelete: (projectPath: string) => void
  onDeleteHistoryEntry: (projectPath: string, index: number) => void
  onClearHistory: (projectPath: string) => void
}

// ============================================================================
// 工具函数
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function truncatePath(path: string, maxLength: number = 50): string {
  if (path.length <= maxLength) return path
  const parts = path.split('/')
  if (parts.length <= 2) return `...${path.slice(-maxLength)}`
  return `.../${parts.slice(-2).join('/')}`
}

// ============================================================================
// ProjectHistoryRow 子组件
// ============================================================================

function ProjectHistoryRow({
  project,
  onDelete,
  onDeleteHistoryEntry,
  onClearHistory,
}: ProjectHistoryRowProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Fragment>
      <tr className="hover:bg-gray-50 transition-colors">
        {/* 项目路径 */}
        <td className="px-6 py-4">
          <div className="flex items-start gap-2">
            <Folder className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate" title={project.path}>
                {truncatePath(project.path)}
              </p>
              <button
                onClick={() => setExpanded(!expanded)}
                className="md:hidden mt-1 space-y-1 text-left w-full"
              >
                <p className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  {expanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {project.historyCount} 条记录 · {formatBytes(project.estimatedSize)}
                </p>
                {project.lastMessage && (
                  <p className="text-xs text-gray-500 truncate" title={project.lastMessage}>
                    {project.lastMessage}
                  </p>
                )}
              </button>
            </div>
          </div>
        </td>

        {/* 历史记录数 */}
        <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
            title={expanded ? '收起历史记录' : '查看历史记录'}
          >
            {expanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {project.historyCount} 条
          </button>
        </td>

        {/* 占用空间 */}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
          {formatBytes(project.estimatedSize)}
        </td>

        {/* 最后消息 */}
        <td className="px-6 py-4 text-sm text-gray-500 hidden xl:table-cell max-w-xs">
          <p className="truncate" title={project.lastMessage || ''}>
            {project.lastMessage || '-'}
          </p>
        </td>

        {/* 操作按钮 */}
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button
            onClick={() => onDelete(project.path)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            title="删除此项目的历史记录"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">删除</span>
          </button>
        </td>
      </tr>

      {/* 历史详情行 */}
      {expanded && (
        <ProjectHistoryDetail
          projectPath={project.path}
          onClose={() => setExpanded(false)}
          onDelete={(index) => onDeleteHistoryEntry(project.path, index)}
          onClear={() => {
            onClearHistory(project.path)
            setExpanded(false)
          }}
        />
      )}
    </Fragment>
  )
}

// ============================================================================
// ProjectHistoryTable 主组件
// ============================================================================

export default function ProjectHistoryTable({
  projects,
  onDelete,
  onDeleteHistoryEntry,
  onClearHistory,
  loading,
}: ProjectHistoryTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">加载项目历史...</span>
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <Folder className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>暂无项目历史记录</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">项目历史记录</h3>
        <p className="text-sm text-gray-600 mt-1">共 {projects.length} 个项目</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                项目路径
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                历史记录数
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                占用空间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                最后消息
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => (
              <ProjectHistoryRow
                key={project.path}
                project={project}
                onDelete={onDelete}
                onDeleteHistoryEntry={onDeleteHistoryEntry}
                onClearHistory={onClearHistory}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

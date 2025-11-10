/**
 * Clean Page - ~/.claude.json 清理工具
 * 显示项目历史和缓存信息，支持批量清理和精确删除
 */

import { useState, useEffect } from 'react'
import type { ProjectDetail, CacheDetail, CleanResult } from '@ccman/core'
import CleanHeader from './clean/CleanHeader'
import ProjectHistoryTable from './clean/ProjectHistoryTable'
import CacheInfoTable from './clean/CacheInfoTable'
import ConfirmDialog from './dialogs/ConfirmDialog'

interface CleanPageProps {
  onSuccess: (message: string) => void
  onError: (title: string, message: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ConfirmState {
  show: boolean
  title: string
  message: string
  confirmText?: string
  danger?: boolean
  onConfirm: () => void
}

export default function CleanPage({ onSuccess, onError }: CleanPageProps) {
  const [loading, setLoading] = useState(true)
  const [fileSize, setFileSize] = useState('--')
  const [projects, setProjects] = useState<ProjectDetail[]>([])
  const [caches, setCaches] = useState<CacheDetail[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      const [analysis, projectList, cacheList] = await Promise.all([
        window.electronAPI.clean.analyze(),
        window.electronAPI.clean.getProjects(),
        window.electronAPI.clean.getCaches(),
      ])

      setFileSize(analysis.fileSizeFormatted)
      setProjects(projectList)
      setCaches(cacheList)
    } catch (error) {
      onError('加载失败', (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 预设清理
  const handlePresetClean = (preset: 'conservative' | 'moderate' | 'aggressive') => {
    const presetNames = {
      conservative: '保守清理',
      moderate: '中等清理',
      aggressive: '激进清理',
    }

    const presetDescriptions = {
      conservative: '保留最近10条历史记录，清理缓存数据',
      moderate: '保留最近5条历史记录，清理缓存和统计数据',
      aggressive: '清空所有历史记录，清理缓存和统计数据',
    }

    setConfirmState({
      show: true,
      title: `确认${presetNames[preset]}`,
      message: `${presetDescriptions[preset]}\n\n此操作会自动创建备份文件。`,
      confirmText: '确认清理',
      danger: preset === 'aggressive',
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, show: false }))
        setLoading(true)
        try {
          const result: CleanResult = await window.electronAPI.clean.executePreset(preset)
          await loadData()
          onSuccess(
            `清理成功！节省了 ${formatBytes(result.saved)} 空间（${presetNames[preset]}）`
          )
        } catch (error) {
          onError('清理失败', (error as Error).message)
          setLoading(false)
        }
      },
    })
  }

  // 删除单个项目
  const handleDeleteProject = (projectPath: string) => {
    setConfirmState({
      show: true,
      title: '删除历史记录',
      message: (
        <div>
          <p className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded break-all mb-3">
            {projectPath}
          </p>
          <p className="text-sm text-gray-700 mb-2">确定要删除该项目的对话历史吗？</p>
          <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
            💡 仅清理 Claude Code 历史记录，不会影响您的项目代码
          </div>
          <p className="mt-2 text-xs text-gray-500">此操作会自动创建备份文件</p>
        </div>
      ),
      confirmText: '删除',
      danger: true,
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, show: false }))
        try {
          await window.electronAPI.clean.deleteProject(projectPath)
          await loadData()
          onSuccess('项目历史记录已删除')
        } catch (error) {
          onError('删除失败', (error as Error).message)
        }
      },
    })
  }

  // 删除单个缓存
  const handleDeleteCache = (cacheKey: string) => {
    const cache = caches.find((c) => c.key === cacheKey)
    if (!cache) return

    setConfirmState({
      show: true,
      title: '删除缓存',
      message: (
        <div>
          <div className="text-sm bg-gray-100 p-3 rounded space-y-1 mb-3">
            <p className="font-medium text-gray-900">{cache.name}</p>
            <p className="text-xs text-gray-600">大小: {cache.sizeFormatted}</p>
          </div>
          <p className="text-sm text-gray-700 mb-2">确定要删除此缓存项吗？</p>
          <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
            💡 仅清理缓存数据，不会影响您的项目代码
          </div>
          <p className="mt-2 text-xs text-gray-500">此操作会自动创建备份文件</p>
        </div>
      ),
      confirmText: '删除',
      danger: true,
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, show: false }))
        try {
          await window.electronAPI.clean.deleteCache(cacheKey)
          await loadData()
          onSuccess('缓存已删除')
        } catch (error) {
          onError('删除失败', (error as Error).message)
        }
      },
    })
  }

  // 刷新数据
  const handleRefresh = () => {
    loadData()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
          {/* 头部 */}
          <CleanHeader
            fileSize={fileSize}
            onPresetClean={handlePresetClean}
            onRefresh={handleRefresh}
            loading={loading}
          />

          {/* 项目历史表格 */}
          <ProjectHistoryTable
            projects={projects}
            onDelete={handleDeleteProject}
            loading={loading}
          />

          {/* 缓存信息表格 */}
          <CacheInfoTable
            caches={caches}
            onDelete={handleDeleteCache}
            loading={loading}
          />
        </div>
      </main>

      {/* 确认对话框 */}
      <ConfirmDialog
        show={confirmState.show}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        danger={confirmState.danger}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, show: false }))}
      />
    </div>
  )
}

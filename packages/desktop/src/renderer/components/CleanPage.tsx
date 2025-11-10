/**
 * Clean Page - ~/.claude.json 清理工具
 * 显示项目历史和缓存信息，支持批量清理和精确删除
 */

import { useState, useEffect } from 'react'
import type { ProjectDetail, CacheDetail, CleanResult } from '@ccman/core'
import CleanHeader from './clean/CleanHeader'
import ProjectHistoryTable from './clean/ProjectHistoryTable'
import CacheInfoTable from './clean/CacheInfoTable'

interface CleanPageProps {
  onSuccess: (message: string) => void
  onError: (title: string, message: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CleanPage({ onSuccess, onError }: CleanPageProps) {
  const [loading, setLoading] = useState(true)
  const [fileSize, setFileSize] = useState('--')
  const [projects, setProjects] = useState<ProjectDetail[]>([])
  const [caches, setCaches] = useState<CacheDetail[]>([])

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
  const handlePresetClean = async (preset: 'conservative' | 'moderate' | 'aggressive') => {
    const presetNames = {
      conservative: '保守清理',
      moderate: '中等清理',
      aggressive: '激进清理',
    }

    if (!window.confirm(`确认执行"${presetNames[preset]}"吗？\n\n此操作会自动创建备份文件。`)) {
      return
    }

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
  }

  // 删除单个项目
  const handleDeleteProject = async (projectPath: string) => {
    if (!window.confirm(`确定要删除项目的历史记录吗？\n\n${projectPath}\n\n此操作会自动创建备份文件。`)) {
      return
    }

    try {
      await window.electronAPI.clean.deleteProject(projectPath)
      await loadData()
      onSuccess('项目历史记录已删除')
    } catch (error) {
      onError('删除失败', (error as Error).message)
    }
  }

  // 删除单个缓存
  const handleDeleteCache = async (cacheKey: string) => {
    const cache = caches.find((c) => c.key === cacheKey)
    if (!cache) return

    if (!window.confirm(`确定要删除缓存项吗？\n\n${cache.name} (${cache.sizeFormatted})\n\n此操作会自动创建备份文件。`)) {
      return
    }

    try {
      await window.electronAPI.clean.deleteCache(cacheKey)
      await loadData()
      onSuccess('缓存已删除')
    } catch (error) {
      onError('删除失败', (error as Error).message)
    }
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
    </div>
  )
}

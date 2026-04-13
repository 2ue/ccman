/**
 * 本地备份配置区块
 * 结构与 WebDAVSync 一致：标题在外，内容分卡片
 */

import { useState } from 'react'
import { FileUp, FileDown, HardDrive, AlertTriangle } from 'lucide-react'
import { BUTTON_WITH_ICON } from '../../styles/button'
import { ConfirmDialog } from '../dialogs/ConfirmDialog'

interface BackupSectionProps {
  onSuccess: (message: string) => void
  onError: (title: string, message: string) => void
}

export default function BackupSection({ onSuccess, onError }: BackupSectionProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [importDir, setImportDir] = useState<string | null>(null)
  const [importFiles, setImportFiles] = useState<string[]>([])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const targetDir = await window.electronAPI.importExport.selectFolder('选择导出目录')
      if (!targetDir) {
        setIsExporting(false)
        return
      }
      const result = await window.electronAPI.importExport.exportConfig(targetDir)
      if (result.success) {
        onSuccess(`配置已导出到：${targetDir}\n包含文件：${result.exportedFiles.join(', ')}`)
      }
    } catch (error) {
      onError('导出失败', (error as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportClick = async () => {
    try {
      const sourceDir = await window.electronAPI.importExport.selectFolder('选择导入目录')
      if (!sourceDir) return
      const validation = await window.electronAPI.importExport.validateImportDir(sourceDir)
      if (!validation.valid) {
        onError('导入失败', validation.message || '无效的导入目录')
        return
      }
      setImportDir(sourceDir)
      setImportFiles(validation.foundFiles)
      setShowImportConfirm(true)
    } catch (error) {
      onError('导入失败', (error as Error).message)
    }
  }

  const handleImportConfirm = async () => {
    if (!importDir) return
    try {
      setIsImporting(true)
      setShowImportConfirm(false)
      const result = await window.electronAPI.importExport.importConfig(importDir)
      if (result.success) {
        let message = `配置已导入\n导入文件：${result.importedFiles.join(', ')}`
        if (result.backupPaths.length > 0) {
          message += `\n\n备份文件：\n${result.backupPaths.join('\n')}`
        }
        onSuccess(message)
      }
    } catch (error) {
      onError('导入失败', (error as Error).message)
    } finally {
      setIsImporting(false)
      setImportDir(null)
      setImportFiles([])
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-2">
        <HardDrive className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">本地备份</h2>
      </div>

      {/* 操作卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex flex-col items-center gap-2 px-4 py-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileUp className="w-5 h-5" />
            <span className="text-sm font-medium">{isExporting ? '导出中...' : '导出配置'}</span>
            <span className="text-xs text-blue-500">保存到本地文件夹</span>
          </button>

          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="flex flex-col items-center gap-2 px-4 py-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-5 h-5" />
            <span className="text-sm font-medium">{isImporting ? '导入中...' : '导入配置'}</span>
            <span className="text-xs text-blue-500">从本地文件夹导入</span>
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          <p className="text-xs text-yellow-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            导出文件包含 API Key，请妥善保管；导入会自动备份当前配置
          </p>
        </div>
      </div>

      {/* 导入确认对话框 */}
      <ConfirmDialog
        show={showImportConfirm}
        title="确认导入配置"
        message={
          <div className="space-y-3">
            <p className="text-red-600 font-medium flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              警告：此操作将覆盖当前所有配置！
            </p>
            <div className="text-sm text-gray-700">
              <p className="font-medium">源目录：</p>
              <p className="text-gray-600 break-all">{importDir}</p>
            </div>
            <div className="text-sm text-gray-700">
              <p className="font-medium">找到配置文件：</p>
              <ul className="list-disc list-inside text-gray-600">
                {importFiles.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-gray-500">当前配置将被覆盖（自动备份）</p>
          </div>
        }
        confirmText="确认导入"
        cancelText="取消"
        onConfirm={handleImportConfirm}
        onCancel={() => {
          setShowImportConfirm(false)
          setImportDir(null)
          setImportFiles([])
        }}
        danger
      />
    </div>
  )
}

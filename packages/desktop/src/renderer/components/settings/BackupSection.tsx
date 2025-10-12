/**
 * 本地备份配置区块
 */

import { useState } from 'react'
import { FileUp, FileDown } from 'lucide-react'
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

      // 选择目标文件夹
      const targetDir = await window.electronAPI.importExport.selectFolder('选择导出目录')
      if (!targetDir) {
        setIsExporting(false)
        return
      }

      // 执行导出
      const result = await window.electronAPI.importExport.exportConfig(targetDir)

      if (result.success) {
        onSuccess(`✅ 配置已导出到：${targetDir}\n包含文件：${result.exportedFiles.join(', ')}`)
      }
    } catch (error) {
      onError('导出失败', (error as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportClick = async () => {
    try {
      // 选择源文件夹
      const sourceDir = await window.electronAPI.importExport.selectFolder('选择导入目录')
      if (!sourceDir) {
        return
      }

      // 验证目录
      const validation = await window.electronAPI.importExport.validateImportDir(sourceDir)
      if (!validation.valid) {
        onError('导入失败', validation.message || '无效的导入目录')
        return
      }

      // 显示确认对话框
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

      // 执行导入
      const result = await window.electronAPI.importExport.importConfig(importDir)

      if (result.success) {
        let message = `✅ 配置已导入\n导入文件：${result.importedFiles.join(', ')}`
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
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">💾 本地备份</h2>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* 说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">📦 导入/导出说明</h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>
              <strong>导出配置</strong>：将配置保存到本地文件夹（包含 API Key）
            </li>
            <li>
              <strong>导入配置</strong>：从本地文件夹导入配置（会覆盖当前配置，自动备份）
            </li>
            <li>适用场景：本地备份、迁移到其他设备、版本控制</li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`${BUTTON_WITH_ICON.primary} bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <FileUp className="w-4 h-4" />
            {isExporting ? '导出中...' : '导出配置'}
          </button>

          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className={`${BUTTON_WITH_ICON.primary} bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <FileDown className="w-4 h-4" />
            {isImporting ? '导入中...' : '导入配置'}
          </button>
        </div>

        {/* 安全提示 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-yellow-900 mb-2">⚠️ 安全提示</h3>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
            <li>导出的配置文件包含完整的 API Key，请妥善保管</li>
            <li>导入操作会覆盖当前配置，请确认后再操作</li>
            <li>所有导入操作都会自动备份当前配置</li>
          </ul>
        </div>
      </div>

      {/* 导入确认对话框 */}
      <ConfirmDialog
        show={showImportConfirm}
        title="确认导入配置"
        message={
          <div className="space-y-3">
            <p className="text-red-600 font-medium">⚠️ 警告：此操作将覆盖当前所有配置！</p>
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

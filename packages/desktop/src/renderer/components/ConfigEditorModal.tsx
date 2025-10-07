import { useState, useEffect } from 'react'
import { X, Save, AlertTriangle } from 'lucide-react'
import { BUTTON_WITH_ICON, BUTTON_STYLES } from '../styles/button'
import { AlertDialog } from './dialogs'

interface ConfigFile {
  name: string
  path: string
  content: string
  language: 'json' | 'toml'
}

interface Props {
  show: boolean
  title: string
  files: ConfigFile[]
  onSave: (files: ConfigFile[]) => Promise<void>
  onClose: () => void
}

export default function ConfigEditorModal({ show, title, files, onSave, onClose }: Props) {
  const [activeTab, setActiveTab] = useState(0)
  const [editedFiles, setEditedFiles] = useState<ConfigFile[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const [alertDialog, setAlertDialog] = useState<{
    show: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
  }>({
    show: false,
    title: '',
    message: '',
    type: 'info',
  })

  useEffect(() => {
    if (show) {
      setEditedFiles(files.map(f => ({ ...f })))
      setActiveTab(0)
      setErrors([])
    }
  }, [show, files])

  if (!show) return null

  const handleContentChange = (index: number, newContent: string) => {
    const updated = [...editedFiles]
    updated[index] = { ...updated[index], content: newContent }
    setEditedFiles(updated)

    // 清除该文件的错误
    const newErrors = [...errors]
    newErrors[index] = ''
    setErrors(newErrors)
  }

  const validateFile = (file: ConfigFile): string => {
    try {
      if (file.language === 'json') {
        JSON.parse(file.content)
      } else if (file.language === 'toml') {
        // 简单的TOML验证：检查基本语法
        const lines = file.content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          if (line && !line.startsWith('#')) {
            // 检查key=value格式或[section]格式
            if (!line.match(/^\[.*\]$/) && !line.match(/^[\w\d_-]+\s*=/) && !line.startsWith('[[')) {
              return `第 ${i + 1} 行：TOML 格式错误`
            }
          }
        }
      }
      return ''
    } catch (error) {
      if (file.language === 'json') {
        return `JSON 格式错误：${(error as Error).message}`
      }
      return `格式错误：${(error as Error).message}`
    }
  }

  const handleSave = async () => {
    // 验证所有文件
    const validationErrors = editedFiles.map(validateFile)
    setErrors(validationErrors)

    if (validationErrors.some(err => err !== '')) {
      return
    }

    setIsSaving(true)
    try {
      await onSave(editedFiles)
      onClose()
    } catch (error) {
      setAlertDialog({
        show: true,
        title: '保存失败',
        message: (error as Error).message,
        type: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const currentFile = editedFiles[activeTab]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              请谨慎编辑配置文件，格式错误可能导致工具无法正常工作
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs (if multiple files) */}
        {editedFiles.length > 1 && (
          <div className="flex border-b border-gray-200 px-6">
            {editedFiles.map((file, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`
                  px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === index
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                  ${errors[index] ? 'text-red-600' : ''}
                `}
              >
                {file.name}
                {errors[index] && <span className="ml-1">⚠️</span>}
              </button>
            ))}
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden flex flex-col p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">
              文件路径：<span className="font-mono text-xs text-gray-500">{currentFile?.path}</span>
            </div>
            <div className="text-xs text-gray-500">
              {currentFile?.language.toUpperCase()} 格式
            </div>
          </div>

          <textarea
            value={currentFile?.content || ''}
            onChange={(e) => handleContentChange(activeTab, e.target.value)}
            className="flex-1 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
            spellCheck={false}
          />

          {errors[activeTab] && (
            <div className="mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {errors[activeTab]}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {editedFiles.length} 个配置文件
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className={BUTTON_STYLES.secondary}>
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={BUTTON_WITH_ICON.primary}
            >
              <Save className="w-4 h-4" />
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>

      {/* Alert Dialog */}
      <AlertDialog
        show={alertDialog.show}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
        onClose={() => setAlertDialog({ ...alertDialog, show: false })}
      />
    </div>
  )
}

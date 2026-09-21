import { useEffect, useState } from 'react'
import type { Provider } from '@ccman/types'
import { Loader2, LockKeyhole } from 'lucide-react'
import ToolPage from './ToolPage'
import { OpenAIIcon } from './icons/BrandIcons'
import { AlertDialog } from './dialogs'

interface CodexPageProps {
  providers: Provider[]
  currentProvider?: Provider
  onAdd: () => void
  onSwitch: (id: string) => void
  onEdit: (provider: Provider) => void
  onDelete: (id: string, name: string) => void
  onClone: (provider: Provider) => void
}

export default function CodexPage(props: CodexPageProps) {
  const [preserveProviderName, setPreserveProviderName] = useState(true)
  const [isLoadingSetting, setIsLoadingSetting] = useState(true)
  const [isSavingSetting, setIsSavingSetting] = useState(false)
  const [settingsError, setSettingsError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadSettings = async () => {
      try {
        const settings = await window.electronAPI.codex.getSettings()
        if (!cancelled) {
          setPreserveProviderName(settings.preserveProviderName)
        }
      } catch (error) {
        if (!cancelled) {
          setSettingsError((error as Error).message)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSetting(false)
        }
      }
    }

    void loadSettings()
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggleProviderNameProtection = async () => {
    const nextValue = !preserveProviderName
    setIsSavingSetting(true)
    try {
      const settings = await window.electronAPI.codex.setPreserveProviderName(nextValue)
      setPreserveProviderName(settings.preserveProviderName)
    } catch (error) {
      setSettingsError((error as Error).message)
    } finally {
      setIsSavingSetting(false)
    }
  }

  const isSettingBusy = isLoadingSetting || isSavingSetting
  const settingTitle = preserveProviderName
    ? '已开启：切换时保留 Codex model_provider 名称'
    : '已关闭：切换时使用目标服务商名称'

  return (
    <>
      <ToolPage
        toolType="codex"
        toolName="Codex"
        icon={OpenAIIcon}
        {...props}
        headerActions={
          <button
            type="button"
            role="switch"
            aria-checked={preserveProviderName}
            aria-label="切换时保护 Codex model_provider 名称"
            title={isLoadingSetting ? '正在读取 Codex 设置' : settingTitle}
            disabled={isSettingBusy}
            onClick={handleToggleProviderNameProtection}
            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              preserveProviderName
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {isSettingBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LockKeyhole className="h-4 w-4" />
            )}
            <span>保护 provider 名称</span>
            <span
              aria-hidden="true"
              className={`relative h-4 w-7 flex-shrink-0 rounded-full transition-colors ${
                preserveProviderName ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                  preserveProviderName ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
        }
      />

      <AlertDialog
        show={Boolean(settingsError)}
        title="Codex 设置操作失败"
        message={settingsError}
        type="error"
        onClose={() => setSettingsError('')}
      />
    </>
  )
}

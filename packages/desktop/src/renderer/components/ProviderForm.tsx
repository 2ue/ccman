/**
 * ProviderForm - 服务商表单组件
 *
 * 按照新架构:Provider 没有 type 字段,由父组件区分工具类型
 */

import { useState, useEffect } from 'react'
import type {
  Provider,
  AddProviderInput,
  EditProviderInput,
  PresetTemplate,
} from '@ccman/core'
import { BUTTON_STYLES } from '../styles/button'

interface Props {
  provider?: Provider
  preset?: PresetTemplate
  isClone?: boolean
  existingProviders?: Provider[]
  onSubmit: (input: AddProviderInput | EditProviderInput) => void | Promise<void>
  onCancel: () => void
}

export default function ProviderForm({ provider, preset, isClone = false, existingProviders = [], onSubmit, onCancel }: Props) {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    if (provider) {
      // 编辑模式:预填充 provider 数据
      setName(provider.name)
      setBaseUrl(provider.baseUrl)
      setApiKey('') // 编辑时 API Key 不显示,需重新输入
    } else if (preset) {
      // Preset 模式:预填充 preset 数据
      setName(preset.name)
      setBaseUrl(preset.baseUrl)
      setApiKey('')
    } else {
      // 空白模式
      setName('')
      setBaseUrl('')
      setApiKey('')
    }
  }, [provider, preset])

  // 检查名称是否重复
  const checkNameConflict = (inputName: string): boolean => {
    if (!inputName.trim()) return false

    // 编辑模式且克隆模式：需要排除正在编辑的服务商
    const currentId = provider && !isClone ? provider.id : null

    return existingProviders.some(
      (p) => p.name === inputName.trim() && p.id !== currentId
    )
  }

  // 处理名称输入变化
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setName(newName)

    // 实时检查名称冲突
    if (newName.trim() && checkNameConflict(newName)) {
      setNameError(`服务商名称已存在: ${newName.trim()}`)
    } else {
      setNameError('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 提交前再次检查名称冲突
    if (checkNameConflict(name)) {
      setNameError(`服务商名称已存在: ${name.trim()}`)
      return
    }

    // HTML5 表单验证会自动处理必填项
    onSubmit({ name, baseUrl, apiKey: apiKey ? apiKey : undefined })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {preset && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">使用配置：</span> {preset.name}
          </p>
          <p className="text-xs text-blue-600 mt-1">{preset.description}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          服务商名称 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={handleNameChange}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            nameError
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
          placeholder="例如：我的 Anthropic API"
          required
        />
        {nameError && (
          <p className="text-sm text-red-600 mt-1">{nameError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          API 地址 <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://api.anthropic.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          API 密钥 {provider && <span className="text-gray-500 text-xs">(留空不修改)</span>}
          {!provider && <span className="text-red-500">*</span>}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="sk-ant-..."
          required={!provider}
        />
        {provider && (
          <p className="text-xs text-gray-500 mt-1">
            编辑时不显示现有密钥,如需修改请重新输入
          </p>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          取消
        </button>
        <button type="submit" className={BUTTON_STYLES.primary}>
          {isClone ? '克隆' : provider ? '保存' : '添加'}
        </button>
      </div>
    </form>
  )
}

/**
 * ProviderForm - 服务商表单组件
 *
 * 按照新架构:Provider 没有 type 字段,由父组件区分工具类型
 */

import { useState, useEffect } from 'react'
import type { Provider, AddProviderInput, EditProviderInput, PresetTemplate } from '@ccman/types'
import { BUTTON_STYLES } from '../styles/button'

interface Props {
  provider?: Provider
  preset?: PresetTemplate
  isClone?: boolean
  existingProviders?: Provider[]
  tool?: 'codex' | 'claude' | 'gemini' | 'opencode'
  onSubmit: (input: AddProviderInput | EditProviderInput) => void | Promise<void>
  onCancel: () => void
}

export default function ProviderForm({
  provider,
  preset,
  isClone = false,
  existingProviders = [],
  tool = 'codex',
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    console.log('[ProviderForm] useEffect triggered', { provider, preset })
    if (provider) {
      // 编辑/克隆模式:预填充 provider 数据
      console.log('[ProviderForm] Using provider data:', provider)
      setName(provider.name)
      setDesc(provider.desc || '')
      setBaseUrl(provider.baseUrl)
      setApiKey('') // 编辑时 API Key 不显示,需重新输入
    } else if (preset) {
      // Preset 模式:预填充 preset 数据
      console.log('[ProviderForm] Using preset data:', preset)
      setName(preset.name)
      // 不继承预置描述,留空让用户自行填写
      setDesc('')
      setBaseUrl(preset.baseUrl)
      setApiKey('')
    } else {
      // 空白模式
      console.log('[ProviderForm] Using blank mode')
      setName('')
      setDesc('')
      setBaseUrl('')
      setApiKey('')
    }

  }, [provider, preset, tool])

  // 检查名称是否重复
  const checkNameConflict = (inputName: string): boolean => {
    if (!inputName.trim()) return false

    // 编辑模式且克隆模式：需要排除正在编辑的服务商
    const currentId = provider && !isClone ? provider.id : null

    return existingProviders.some((p) => p.name === inputName.trim() && p.id !== currentId)
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

    // 计算最终 API Key:
    // - 新增模式(provider 为空): 必填,直接使用表单值
    // - 编辑模式(provider 存在且非克隆): 为空表示不修改,不向上层传 apiKey
    // - 克隆模式(provider 存在且 isClone): 为空表示沿用原 provider 的 apiKey
    let finalApiKey: string | undefined

    if (!provider) {
      // 新增模式(包括从预置添加): HTML5 required 已经保证有值
      finalApiKey = apiKey
    } else if (isClone) {
      // 克隆模式: 允许留空表示复用原有 Key
      finalApiKey = apiKey || provider.apiKey
    } else {
      // 编辑模式: 留空表示不修改
      finalApiKey = apiKey || undefined
    }

    const trimmedName = name.trim()
    const trimmedDesc = desc.trim()

    const baseInput =
      finalApiKey !== undefined
        ? { name: trimmedName, desc: trimmedDesc || undefined, baseUrl, apiKey: finalApiKey }
        : { name: trimmedName, desc: trimmedDesc || undefined, baseUrl }

    const input: AddProviderInput | EditProviderInput = baseInput

    onSubmit(input)
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
            nameError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
          }`}
          placeholder="例如：我的 Anthropic API"
          required
        />
        {nameError && <p className="text-sm text-red-600 mt-1">{nameError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">描述(可选)</label>
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="例如: 官方 Anthropic API, 只读环境等"
        />
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
          <p className="text-xs text-gray-500 mt-1">编辑时不显示现有密钥,如需修改请重新输入</p>
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

import { useState, useEffect } from 'react'

export default function AboutPage() {
  const [version, setVersion] = useState('Loading...')

  useEffect(() => {
    window.electronAPI.system.getAppVersion().then(setVersion)
  }, [])

  const handleOpenUrl = async (url: string) => {
    try {
      await window.electronAPI.system.openUrl(url)
    } catch (error) {
      console.error('打开链接失败：', error)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-sm p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ccman</h1>
          <p className="text-gray-600">Codex/Claude Code API 服务商配置管理工具</p>
          <p className="text-sm text-gray-500 mt-2">版本 {version}</p>
        </div>

        {/* 项目描述 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">项目简介</h2>
          <p className="text-gray-700 leading-relaxed">
            ccman 是一个专为 Codex 和 Claude Code 用户设计的 API 服务商管理工具。
            它可以让您轻松管理多个 API 服务商，并快速在不同服务商之间切换。
          </p>
        </div>

        {/* 核心功能 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">核心功能</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>支持 Codex 和 Claude Code 双工具配置管理</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>快速切换不同的 API 服务商</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>预置服务商支持，快速添加常用服务商</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>CLI 和 Desktop 双界面支持</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>零破坏性设计，保留用户自定义配置</span>
            </li>
          </ul>
        </div>

        {/* 社区链接 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">社区与支持</h2>
          <div className="space-y-3">
            <button
              onClick={() => handleOpenUrl('https://github.com/2ue/ccm')}
              className="flex items-center text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub 仓库
            </button>
            <button
              onClick={() => handleOpenUrl('https://github.com/2ue/ccm/issues')}
              className="flex items-center text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              问题反馈
            </button>
            <button
              onClick={() => handleOpenUrl('https://github.com/2ue/ccm#readme')}
              className="flex items-center text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              项目文档
            </button>
          </div>
        </div>

        {/* 开源协议 */}
        <div className="text-center text-sm text-gray-500 pt-6 border-t border-gray-200">
          <p>MIT License © 2025 2ue</p>
          <p className="mt-1">用 ❤️ 构建，遵循 Linus Torvalds 的"好品味"理念</p>
        </div>
      </div>
    </div>
  )
}

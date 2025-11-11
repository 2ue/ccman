/**
 * MCP (Model Context Protocol) 服务器预设模板
 * 本地副本，避免在 Renderer 进程中导入需要 Node.js API 的 Core 代码
 */

/**
 * MCP 预设详细信息（包含完整的 command, args, env）
 */
export interface MCPPresetDetail {
  name: string
  command: string
  args: string[]
  description: string
  envRequired?: string[] // 需要配置的环境变量
  argsPlaceholder?: string // args 中需要替换的占位符说明
}

/**
 * MCP 预设列表（完整信息，供 Desktop UI 使用）
 */
export const MCP_PRESETS_DETAIL: MCPPresetDetail[] = [
  {
    name: 'filesystem',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/files'],
    description: '文件系统访问',
    argsPlaceholder: '需要修改第3个参数为允许访问的目录路径',
  },
  {
    name: 'github',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    description: 'GitHub 集成',
    envRequired: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
  },
  {
    name: 'postgres',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb'],
    description: 'PostgreSQL 数据库',
    argsPlaceholder: '需要修改第3个参数为数据库连接字符串',
  },
  {
    name: 'brave-search',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    description: 'Brave 搜索',
    envRequired: ['BRAVE_API_KEY'],
  },
  {
    name: 'google-maps',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-maps'],
    description: 'Google Maps',
    envRequired: ['GOOGLE_MAPS_API_KEY'],
  },
  {
    name: 'puppeteer',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    description: '浏览器自动化',
  },
  {
    name: 'sqlite',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite', '/path/to/database.db'],
    description: 'SQLite 数据库',
    argsPlaceholder: '需要修改第3个参数为数据库文件路径',
  },
  {
    name: 'sequential-thinking',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    description: '序列思考增强',
  },
]

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CCM (Claude Code Manager) 是一个 TypeScript 命令行工具，用于管理 Claude Code API 配置。新架构直接修改 `~/.claude/settings.json` 文件实现配置切换，无需 shell 集成。

## 新架构设计 (v2.0.0)

### 核心理念
- **直接配置修改**: 直接修改 `~/.claude/settings.json` 实现配置切换
- **多供应商支持**: 在 `~/.ccman/providers/` 目录存储多个供应商配置
- **零 shell 依赖**: 无需修改 shell 配置文件，立即生效
- **安全备份**: 每次切换前自动备份当前配置

### 目录结构
```
~/.ccman/
├── config.json              # CCM 主配置文件
├── providers/               # 供应商配置目录
│   ├── anthropic.json      # Anthropic 官方配置
│   ├── packycode.json      # Packycode 配置
│   └── custom.json         # 其他自定义配置
└── backups/                # 配置备份目录（未来功能）
```

### 项目结构
```
src/
├── types/                  # TypeScript 类型定义
├── core/                   # 核心模块
│   ├── CCMConfigManager.ts     # CCM 配置管理
│   └── ClaudeConfigManager.ts  # Claude 配置管理
├── providers/              # 供应商管理
│   └── ProviderManager.ts      # 供应商业务逻辑
├── cli.ts                  # CLI 入口点
└── index.ts               # 模块导出
```

## 配置文件结构

### CCM 主配置 (~/.ccman/config.json)
```json
{
  "currentProvider": "anthropic",
  "claudeConfigPath": "~/.claude/settings.json",
  "providers": {
    "anthropic": {
      "name": "Anthropic Official",
      "configFile": "anthropic.json",
      "lastUsed": "2025-01-15T10:30:00.000Z"
    }
  },
  "metadata": {
    "version": "2.0.0",
    "createdAt": "2025-01-10T08:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### 供应商配置 (~/.ccman/providers/anthropic.json)
```json
{
  "name": "Anthropic Official",
  "description": "Official Anthropic API",
  "config": {
    "env": {
      "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
      "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
      "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1,
      "CLAUDE_CODE_MAX_OUTPUT_TOKENS": 32000
    },
    "permissions": {
      "allow": [],
      "deny": []
    },
    "apiKeyHelper": "echo 'sk-xxx'"
  },
  "metadata": {
    "createdAt": "2025-01-10T08:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "usageCount": 25
  }
}
```

## 命令使用

### 开发命令
```bash
npm run build         # 编译 TypeScript
npm run dev           # 开发模式运行
npm start             # 运行编译后的程序
npm run clean         # 清理构建文件
npm run lint          # 代码检查
```

### 基础使用（精简版）
```bash
# 核心命令（6个）
ccman                             # 交互式菜单（默认入口）
ccman ls                          # 智能列表显示（合并原status信息）
ccman ls --current                # 显示当前供应商详情（替代原current）
ccman ls --brief                  # 简洁模式显示
ccman add <id> <name> <url> [key] # 添加供应商配置
ccman use <id>                    # 切换到指定供应商
ccman rm <id>                     # 删除供应商配置（别名：remove）
ccman clear                       # 清除所有配置（别名：reset）
```

### 命令详解
```bash
# 默认交互模式 - 最直观的入口
ccman                    # 进入菜单，包含所有操作（添加/切换/更新/删除/状态）

# 智能列表命令 - 整合了多种信息显示
ccman ls                 # 显示所有供应商 + 系统状态信息
ccman ls --current       # 仅显示当前供应商的详细信息  
ccman ls --brief         # 简洁模式，仅显示供应商名称和ID

# 快速操作命令 - 适合脚本和熟练用户
ccman add <id> <name> <url> [key] -d "description"  # 添加时指定描述
ccman use <id>                                      # 快速切换
ccman rm <id>                                       # 快速删除
ccman clear                                         # 重置所有配置
```

## 核心类型定义

### ClaudeSettings
Claude settings.json 的标准结构
```typescript
interface ClaudeSettings {
  env: {
    ANTHROPIC_AUTH_TOKEN: string;
    ANTHROPIC_BASE_URL: string;
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC?: number;
    CLAUDE_CODE_MAX_OUTPUT_TOKENS?: number;
  };
  permissions: { allow: string[]; deny: string[]; };
  apiKeyHelper: string;
}
```

### ProviderConfig
供应商配置结构
```typescript
interface ProviderConfig {
  name: string;
  description: string;
  config: ClaudeSettings;
  metadata: {
    createdAt: string;
    updatedAt: string;
    usageCount: number;
  };
}
```

## 关键特性

### 1. 直接配置修改
- 直接读写 `~/.claude/settings.json`
- **选择性覆盖**: 只修改CCM管理的key，保留用户其他配置
- 无需重启终端或 source 任何文件
- 配置切换立即生效

#### CCM管理的配置项
```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "...",       // ✅ CCM管理
    "ANTHROPIC_BASE_URL": "...",         // ✅ CCM管理
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1,  // ✅ CCM管理
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": 32000  // ✅ CCM管理
  },
  "permissions": {
    "allow": [],                         // ✅ CCM管理
    "deny": []                           // ✅ CCM管理
  },
  "apiKeyHelper": "..."                  // ✅ CCM管理
}
```

#### 用户配置保护
- 保留所有其他用户自定义配置项
- 保留 `env` 中其他环境变量  
- 保留 `permissions` 中其他权限设置
- 保留所有非CCM管理的顶级配置项

### 2. 自动备份机制
- 每次切换前自动备份当前配置
- 备份文件带时间戳，便于恢复
- 防止配置丢失和冲突

### 3. 交互式界面
- 使用 inquirer.js 提供友好的交互体验
- 彩色输出和进度反馈
- 确认提示防止误操作

### 4. 类型安全
- 完整的 TypeScript 类型定义
- 编译时错误检查
- 严格的接口约束

## 安全注意事项

### 🚨 开发时的重要限制

**绝对禁止修改以下文件（会导致系统不可用）:**
- `~/.ccman/config.json` - 现有历史配置文件
- `~/.claude/settings.json` - Claude Code 配置文件

**开发时的安全做法:**
1. **使用测试目录**: 开发时使用 `~/.ccman-dev/` 或其他测试目录
2. **配置隔离**: 通过环境变量指定不同的配置路径
3. **备份验证**: 修改前确保备份机制正常工作
4. **分步测试**: 先测试读取，再测试写入功能

### 开发环境配置
```bash
# 设置开发环境配置路径
export CCM_CONFIG_DIR="~/.ccman-dev"
export CLAUDE_CONFIG_PATH="~/.claude/settings-dev.json"

# 或在代码中使用环境变量
const configDir = process.env.CCM_CONFIG_DIR || path.join(os.homedir(), '.ccman');
```

## 构建和部署

### TypeScript 编译
- 目标: ES2020, CommonJS 模块
- 输出: `dist/` 目录，包含源映射
- CLI 入口: `dist/cli.js` 带正确的 shebang

### 依赖管理
- 使用 pnpm 管理依赖
- 包含所有必要的类型声明
- 严格的版本控制

## 测试方法

### 功能测试
- CLI 命令交互测试
- 文件系统操作验证
- 配置切换流程测试
- 错误处理验证

### 安全测试
- 备份机制验证
- 权限检查
- 配置文件完整性
- 回滚功能测试

## 未来改进

### 计划功能
- 配置模板和预设
- 批量配置管理
- 网络连接测试
- 配置迁移工具
- 增强的错误诊断

### 架构优化
- 插件化供应商支持
- 配置验证和修复
- 更好的备份策略
- 性能优化

## 开发注意事项

- **测试优先**: 修改任何配置管理逻辑前先测试
- **备份验证**: 确保每次操作都有可靠的备份
- **用户体验**: 提供清晰的反馈和错误信息
- **向后兼容**: 考虑现有用户的配置迁移
- **安全第一**: 绝不能破坏用户的现有配置
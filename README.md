# CCM - Claude Code Manager

<div align="center">

[![npm version](https://img.shields.io/npm/v/ccman.svg)](https://www.npmjs.com/package/ccman)
[![npm downloads](https://img.shields.io/npm/dm/ccman.svg)](https://www.npmjs.com/package/ccman)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/ccman.svg)](https://nodejs.org)

**智能管理 Claude Code API 配置的 TypeScript CLI 工具**

🌍 多语言支持 · 🔧 直接配置集成 · 📁 多供应商管理 · ⚡ 零配置体验

**中文文档** | [English](./README_en.md)

</div>

---

## ✨ 核心特性

- **🌍 智能语言支持** - 自动检测系统语言，支持中英文无缝切换
- **🔧 直接配置集成** - 直接修改 `~/.claude/settings.json`，无需 Shell 集成
- **📁 多供应商管理** - 在不同 API 供应商间快速切换（Anthropic 官方、第三方等）
- **🎯 交互式菜单** - 友好的命令行交互界面，支持连续操作
- **⚡ 零配置体验** - 开箱即用，智能默认配置
- **🔒 安全可靠** - 自动备份，选择性配置更新，保护用户数据

## 🚀 快速开始

### 安装

```bash
npm install -g ccman
```

### 首次运行

```bash
ccman
```

首次运行时会自动引导你：
1. 选择界面语言（中文/英文/自动检测）
2. 创建第一个供应商配置
3. 自动应用到 Claude Code

## 📖 命令参考

### 核心命令

```bash
ccman                              # 交互式主菜单（推荐入口）
ccman ls                           # 列出所有供应商及系统状态
ccman ls --current                 # 显示当前供应商详情
ccman ls --brief                   # 简洁列表模式
ccman add <id> <name> <url> [key]  # 添加新供应商
ccman use <id>                     # 切换到指定供应商
ccman rm <id>                      # 删除供应商
ccman clear                        # 清除所有配置（需确认）
```

### 语言管理

```bash
ccman lang                         # 显示当前语言设置
ccman lang set zh                  # 设置为中文
ccman lang set en                  # 设置为英文
ccman lang set auto                # 自动检测系统语言
ccman lang reset                   # 重置为首次运行状态
```

## 💡 使用示例

### 添加并切换供应商

```bash
# 添加官方 Anthropic 配置
ccman add anthropic "Anthropic Official" https://api.anthropic.com sk-ant-xxx

# 添加第三方供应商
ccman add custom "My Custom API" https://api.custom.com

# 切换到自定义供应商
ccman use custom

# 列出所有供应商
ccman ls
```

### 交互式菜单操作

```bash
$ ccman

? 您想要执行什么操作？
❯ 切换供应商
  添加新供应商
  更新供应商
  删除供应商
  显示详细状态
  退出

# 选择操作后，按提示完成配置
# 每次操作后可以选择继续或退出
```

## 🔧 工作原理

CCM 直接管理 `~/.claude/settings.json` 文件，通过以下方式确保安全：

### 1. 选择性更新

只修改 CCM 管理的配置项：
- `env.ANTHROPIC_AUTH_TOKEN`
- `env.ANTHROPIC_BASE_URL`
- `env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`
- `env.CLAUDE_CODE_MAX_OUTPUT_TOKENS`
- `permissions.allow` / `permissions.deny`

### 2. 配置保护

保留用户的其他所有配置项：
- ✅ 保留：`mcpServers`、`model`、`customUserConfig` 等
- 🔄 更新：仅更新上述 CCM 管理的配置项

### 3. 自动备份

每次切换前自动备份当前配置到 `~/.ccman/backups/`

## 📂 配置结构

```
~/.ccman/
├── config.json              # CCM 主配置
├── providers/               # 供应商配置目录
│   ├── anthropic.json      # Anthropic 官方
│   ├── custom.json         # 自定义供应商
│   └── ...
└── backups/                # 配置备份目录（自动创建）
```

### 供应商配置文件结构

```json
{
  "name": "Anthropic Official",
  "description": "Anthropic 官方 API 配置",
  "config": {
    "env": {
      "ANTHROPIC_AUTH_TOKEN": "your-token",
      "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
      "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1,
      "CLAUDE_CODE_MAX_OUTPUT_TOKENS": 32000
    },
    "permissions": {
      "allow": [],
      "deny": []
    }
  },
  "metadata": {
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "usageCount": 5
  }
}
```

### CCM 主配置文件结构

```json
{
  "currentProvider": "anthropic",
  "claudeConfigPath": "/Users/user/.claude/settings.json",
  "providers": {
    "anthropic": {
      "name": "Anthropic Official",
      "configFile": "anthropic.json",
      "lastUsed": "2025-01-15T10:30:00.000Z"
    }
  },
  "settings": {
    "language": "zh",
    "firstRun": false
  },
  "metadata": {
    "version": "2.1.3",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

## 🌐 语言支持

### 支持的语言

- **中文 (zh)** - 完整中文界面
- **英文 (en)** - 完整英文界面
- **自动检测 (auto)** - 基于系统 `LANG` 环境变量自动选择

### 语言检测逻辑

- 英文环境 (`en-*`) → 自动使用英文界面
- 其他环境（包括 `zh-*`、未设置等）→ 自动使用中文界面
- 用户可随时手动覆盖语言设置

### 首次运行体验

```bash
$ ccman

🌍 Welcome to CCM! / 欢迎使用 CCM!

This is your first time running CCM.
这是您首次运行 CCM。

? Please choose your preferred language:
? 请选择您偏好的语言：
❯ 🇨🇳 中文 (Chinese)
  🇺🇸 English
  🌐 基于系统自动检测 (Auto-detect based on system)

✓ 语言已设置为中文
✓ 您可以稍后使用以下命令更改：ccman lang set <zh|en|auto>
```

## 🛠️ 开发

### 环境准备

```bash
# 克隆仓库
git clone https://github.com/2ue/ccman.git
cd ccman

# 安装依赖
pnpm install
```

### 开发命令

```bash
pnpm run dev                 # 开发模式运行（使用 tsx）
pnpm run build               # TypeScript 编译
pnpm run start               # 运行编译后的 CLI
pnpm run clean               # 清理 dist/ 目录
pnpm run lint                # ESLint 代码检查
pnpm test                    # 运行测试
```

### 开发环境隔离

CCM 支持开发环境配置隔离，避免影响生产配置：

```bash
# 设置开发环境配置路径
export CCM_CONFIG_DIR=".ccman-dev"
export CLAUDE_CONFIG_PATH="$HOME/.claude/settings-dev.json"

# 在隔离环境中运行
pnpm run dev
```

### 项目结构

```
src/
├── types/                    # TypeScript 类型定义
│   └── index.ts             # 核心类型接口
├── core/                     # 核心模块
│   ├── CCMConfigManager.ts  # CCM 配置管理器
│   └── ClaudeConfigManager.ts # Claude 配置管理器
├── providers/                # 供应商管理
│   └── ProviderManager.ts   # 供应商业务逻辑
├── commands/                 # 命令处理
│   └── lang.ts              # 语言命令处理
├── i18n/                     # 国际化
│   ├── LanguageManager.ts   # 语言管理器
│   └── messages.ts          # 多语言消息
├── utils/                    # 工具函数
│   ├── env-config.ts        # 环境配置
│   └── version.ts           # 版本信息
├── config/                   # 配置文件
│   └── static-env.ts        # 静态环境配置
├── cli.ts                    # CLI 入口点
└── index.ts                 # 模块导出
```

## 📋 系统要求

- **Node.js** >= 16.0.0
- **Claude Code** 已安装并支持 settings.json
- **操作系统**: Linux, macOS, Windows (WSL)
- **包管理器**: npm, pnpm, yarn（推荐 pnpm）

## 🔍 故障排除

### 供应商配置未生效

```bash
# 1. 检查当前供应商信息
ccman ls --current

# 2. 重新应用配置
ccman use <provider-id>

# 3. 检查 Claude 配置文件
cat ~/.claude/settings.json | grep ANTHROPIC

# 4. 查看完整配置
cat ~/.claude/settings.json | jq .
```

### 语言切换问题

```bash
# 查看当前语言设置
ccman lang

# 强制设置为中文
ccman lang set zh

# 强制设置为英文
ccman lang set en

# 重置到首次运行状态（重新选择语言）
ccman lang reset
ccman
```

### 配置文件损坏

```bash
# 删除所有配置（会要求确认）
ccman clear

# 重新开始配置
ccman
```

### 开发环境问题

```bash
# 使用隔离的开发环境
export CCM_CONFIG_DIR=".ccman-dev"
pnpm run dev

# 清理并重新构建
pnpm run clean
pnpm run build
```

## 📝 更新日志

### v2.1.3 (2025-09-24)
- ✨ 添加 `CLAUDE_CODE_MAX_OUTPUT_TOKENS` 配置支持
- 🐛 修复 TypeScript 编译错误，完全移除 apiKeyHelper 配置项
- 🎨 优化交互式菜单体验
- 📦 升级依赖包版本

### v2.1.2
- 🎨 简化供应商配置，移除手动 ID 设置
- ✨ 优化首次运行体验

### v2.0.0
- 🎉 全新架构：直接配置集成，无需 Shell 集成
- 🌍 智能多语言支持（中文/英文/自动检测）
- 🎯 交互式菜单系统
- 📁 多供应商管理
- 🔒 自动备份和配置保护

### v1.x
- 旧架构：基于 Shell 环境变量集成（已废弃）

## 🚀 从 v1.x 迁移

CCM v2.0 使用完全不同的架构，与 v1.x 不兼容：

### v1.x（已废弃）
- ❌ 修改 shell 配置文件（.bashrc, .zshrc 等）
- ❌ 使用环境变量
- ❌ 复杂的 shell 集成和重新加载

### v2.x（当前版本）
- ✅ 直接修改 `~/.claude/settings.json`
- ✅ 基于供应商的配置管理
- ✅ 智能语言支持
- ✅ 简化、安全的实现方式

**迁移步骤**：

1. 卸载 v1.x 版本
2. 清理 shell 配置文件中的相关内容
3. 安装 v2.x 版本：`npm install -g ccman`
4. 运行 `ccman` 重新配置

## 🤝 贡献

我们欢迎各种形式的贡献！

### 如何贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 报告问题

如果你发现了 bug 或有新功能建议，请在 [GitHub Issues](https://github.com/2ue/ccman/issues) 中提交。

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 👤 作者

**2ue**
- 📧 Email: jie746635835@163.com
- 🐙 GitHub: [@2ue](https://github.com/2ue)

## 🙏 致谢

感谢所有为本项目做出贡献的开发者！

感谢以下开源项目：
- [TypeScript](https://www.typescriptlang.org/)
- [Commander.js](https://github.com/tj/commander.js)
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js)
- [Chalk](https://github.com/chalk/chalk)

---

<div align="center">

**CCM v2.x - 智能、多语言、无缝的 Claude Code 供应商管理**

Made with ❤️ by [2ue](https://github.com/2ue)

[⬆ 回到顶部](#ccm---claude-code-manager)

</div>
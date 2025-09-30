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

- **🌍 智能语言支持** - 自动检测系统语言,支持中英文无缝切换
- **🔧 直接配置集成** - 直接修改 `~/.claude/settings.json`,无需 Shell 集成
- **📁 多供应商管理** - 在不同 API 供应商间快速切换(Anthropic 官方、第三方等)
- **🎯 交互式菜单** - 友好的命令行交互界面,支持连续操作
- **⚡ 零配置体验** - 开箱即用,智能默认配置
- **🔒 安全可靠** - 自动备份,选择性配置更新,保护用户数据

## 🚀 快速开始

### 安装方式

#### 方式 1: npm 安装 (推荐)

```bash
# 全局安装
npm install -g ccman

# 或使用 pnpm
pnpm add -g ccman

# 或使用 yarn
yarn global add ccman
```

#### 方式 2: npx 直接运行 (无需安装)

```bash
# 直接运行,不安装到全局
npx ccman

# 运行特定命令
npx ccman ls
npx ccman add anthropic "Anthropic Official" https://api.anthropic.com
```

#### 方式 3: 从源码安装

```bash
# 克隆仓库
git clone https://github.com/2ue/ccman.git
cd ccman

# 安装依赖
pnpm install

# 全局链接 (开发模式)
npm link

# 或构建后使用
pnpm build
node dist/cli.js
```

#### 方式 4: 下载预编译版本

访问 [GitHub Releases](https://github.com/2ue/ccman/releases) 下载对应平台的预编译版本 (如果提供)

### 首次运行

```bash
ccman
```

首次运行时会自动引导你:
1. 选择界面语言(中文/英文/自动检测)
2. 创建第一个供应商配置
3. 自动应用到 Claude Code

## 📖 命令参考

### 核心命令

```bash
ccman                              # 交互式主菜单(推荐入口)
ccman ls                           # 列出所有供应商及系统状态
ccman ls --current                 # 显示当前供应商详情
ccman ls --brief                   # 简洁列表模式
ccman add <id> <name> <url> [key]  # 添加新供应商
ccman use <id>                     # 切换到指定供应商
ccman rm <id>                      # 删除供应商
ccman clear                        # 清除所有配置(需确认)
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

? 您想要执行什么操作?
❯ 切换供应商
  添加新供应商
  更新供应商
  删除供应商
  显示详细状态
  退出

# 选择操作后,按提示完成配置
# 每次操作后可以选择继续或退出
```

## 🔧 工作原理

CCM 直接管理 `~/.claude/settings.json` 文件,通过以下方式确保安全:

### 选择性更新

只修改 CCM 管理的配置项:
- `env.ANTHROPIC_AUTH_TOKEN`
- `env.ANTHROPIC_BASE_URL`
- `env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`
- `env.CLAUDE_CODE_MAX_OUTPUT_TOKENS`
- `permissions.allow` / `permissions.deny`

**保留所有其他用户配置项**(如 `mcpServers`、`model`、`customUserConfig` 等)

### 自动备份

每次切换前自动备份当前配置到 `~/.ccman/backups/`

## 📂 配置结构

```
~/.ccman/
├── config.json              # CCM 主配置
├── providers/               # 供应商配置目录
│   ├── anthropic.json      # Anthropic 官方
│   ├── custom.json         # 自定义供应商
│   └── ...
└── backups/                # 配置备份目录(自动创建)
```

## 🌐 语言支持

### 支持的语言

- **中文 (zh)** - 完整中文界面
- **英文 (en)** - 完整英文界面
- **自动检测 (auto)** - 基于系统 `LANG` 环境变量自动选择

### 语言检测逻辑

- 英文环境 (`en-*`) → 自动使用英文界面
- 其他环境(包括 `zh-*`、未设置等) → 自动使用中文界面
- 用户可随时手动覆盖语言设置

## 📋 系统要求

- **Node.js** >= 16.0.0
- **Claude Code** 已安装并支持 settings.json
- **操作系统**: Linux, macOS, Windows (WSL)
- **包管理器**: npm, pnpm, yarn(推荐 pnpm)

## 🔍 故障排除

### 供应商配置未生效

```bash
# 1. 检查当前供应商信息
ccman ls --current

# 2. 重新应用配置
ccman use <provider-id>

# 3. 检查 Claude 配置文件
cat ~/.claude/settings.json | grep ANTHROPIC
```

### 语言切换问题

```bash
# 查看当前语言设置
ccman lang

# 强制设置为中文
ccman lang set zh

# 重置到首次运行状态(重新选择语言)
ccman lang reset
ccman
```

### 配置文件损坏

```bash
# 删除所有配置(会要求确认)
ccman clear

# 重新开始配置
ccman
```

## 📚 开发文档

- [开发指南 (中文)](./docs/DEVELOPMENT.md)
- [Development Guide (English)](./docs/DEVELOPMENT_en.md)
- [版本发布指南](./docs/release-guide.md)
- [脚本使用指南](./docs/scripts-guide.md)

## 🤝 贡献

我们欢迎各种形式的贡献!

### 如何贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 报告问题

如果你发现了 bug 或有新功能建议,请在 [GitHub Issues](https://github.com/2ue/ccman/issues) 中提交。

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 👤 作者

**2ue**
- 📧 Email: jie746635835@163.com
- 🐙 GitHub: [@2ue](https://github.com/2ue)

## 🙏 致谢

感谢所有为本项目做出贡献的开发者!

感谢以下开源项目:
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

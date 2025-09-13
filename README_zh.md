# CCM - Claude Code Manager v2.0

基于 TypeScript 的命令行工具，通过**直接 settings.json 集成**和**智能语言支持**管理多个 Claude Code API 供应商配置。

> [English Documentation](./README.md) | **中文文档**

## ✨ v2.0 新特性

🌍 **智能语言支持** - 自动检测系统语言或引导首次运行设置  
🔧 **直接 Claude 集成** - 直接修改 `~/.claude/settings.json`，无需 shell 变量  
📁 **供应商管理** - 存储和切换多个 API 供应商配置  
🎯 **交互式菜单系统** - 支持连续操作的导航选项  
⚡ **零配置体验** - 开箱即用的智能默认设置  

## 🚀 快速开始

### 安装

```bash
# 从 NPM 安装
npm install -g ccman

# 或者开发环境安装依赖
npm install && npm run build
```

### 首次运行体验

```bash
# 启动 CCM（首次运行）
ccman

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

### 基本用法

```bash
# 交互式主菜单（推荐）
ccman

# 列出所有供应商
ccman ls

# 直接添加供应商  
ccman add <id> <name> <baseUrl> [apiKey]

# 切换供应商
ccman use <id>

# 删除供应商
ccman rm <id>
```

## 🌐 语言管理

### 语言命令
```bash
ccman lang                    # 显示当前语言设置
ccman lang set zh             # 设置为中文
ccman lang set en             # 设置为英文  
ccman lang set auto           # 基于系统自动检测
ccman lang reset              # 重置为首次运行状态
```

### 支持的语言
- **中文 (zh)** - 完整中文界面
- **英文 (en)** - Full English interface
- **自动检测** - 基于系统 `LANG` 环境变量

### 语言检测逻辑
- 英文环境 (`en-*`) → 英文界面
- 其他环境（包括 `zh-*`、未设置等）→ 中文界面
- 随时可手动覆盖

## 📖 命令参考

### 核心供应商管理
```bash
ccman                              # 交互式菜单（默认）
ccman add <id> <name> <url> [key]  # 添加新供应商
ccman use <id>                     # 切换到供应商
ccman ls                           # 列出所有供应商
ccman ls --current                 # 显示当前供应商详情
ccman ls --brief                   # 简洁供应商列表
ccman rm <id>                      # 删除供应商
ccman clear                        # 删除所有供应商（危险操作）
```

### 语言管理
```bash
ccman lang                         # 显示当前语言
ccman lang set <zh|en|auto>        # 设置语言偏好
ccman lang reset                   # 重置为首次运行状态
```

## 🎯 交互式体验

### 主菜单导航
```bash
$ ccman

? 您想要执行什么操作？
❯ 切换供应商
  添加新供应商
  更新供应商  
  删除供应商
  显示详细状态
  退出

# 每次操作后：
? 是否要执行其他操作？ (Y/n)
```

### 供应商添加流程
```bash
$ ccman add

? 供应商ID（唯一标识符）: my-provider
? 供应商名称: 我的自定义API
? 描述: 我的自定义Claude API
? 基础URL: https://api.mycustom.com
? API密钥: ****************

✓ 供应商添加成功
? 将"我的自定义API"设为当前供应商？ (Y/n)
✓ 供应商切换成功
Claude Code 配置已成功更新！
```

## 🔧 架构概览

### 直接 Claude 集成
CCM v2.0 直接修改您的 Claude Code 设置文件：

**修改前（CCM 管理）**：
```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "old-token",
    "ANTHROPIC_BASE_URL": "https://old-api.com"
  }
}
```

**修改后（CCM 更新）**：
```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "new-token", 
    "ANTHROPIC_BASE_URL": "https://new-api.com",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
  },
  "permissions": {
    "allow": [],
    "deny": []
  },
  "apiKeyHelper": "echo 'new-token'"
}
```

### 供应商存储结构
供应商存储在 `~/.ccman/providers/`：

```
~/.ccman/
├── config.json          # CCM 主配置
├── providers/            # 单独的供应商配置
│   ├── anthropic.json
│   ├── my-provider.json
│   └── staging.json
```

### 配置合并
CCM 只更新 Claude 相关的键，保留您的现有设置：
- ✅ 保留：`mcpServers`、`model`、`customUserConfig` 等
- 🔄 更新：`env.ANTHROPIC_*`、`permissions`、`apiKeyHelper`

## 📊 供应商配置

### 供应商结构
```json
{
  "name": "Anthropic Official",
  "description": "Anthropic 官方 API 配置", 
  "config": {
    "env": {
      "ANTHROPIC_AUTH_TOKEN": "your-token",
      "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
      "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
    },
    "permissions": { "allow": [], "deny": [] },
    "apiKeyHelper": "echo 'your-token'"
  },
  "metadata": {
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z", 
    "usageCount": 5
  }
}
```

### 主配置
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
    "version": "2.0.0",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

## 💡 使用示例

### 完整首次设置
```bash
# 首次运行 - 语言选择
ccman
# → 语言选择向导
# → 未找到供应商，引导创建
# → 自动更新 Claude 设置

# 添加其他供应商
ccman add staging "测试API" https://staging-api.com
ccman add dev "开发环境" https://dev-api.com

# 在供应商间切换
ccman use staging
ccman use dev
ccman use anthropic
```

### 多供应商工作流
```bash
# 列出所有供应商的详情
ccman ls
# * Anthropic Official (anthropic) - https://api.anthropic.com
#   测试API (staging) - https://staging-api.com  
#   开发环境 (dev) - https://dev-api.com

# 切换到测试环境
ccman use staging
# ✓ 供应商切换成功
# ✓ Claude Code 配置已成功更新！

# 检查当前供应商
ccman ls --current
# 当前供应商: 测试API (staging)
# 基础URL: https://staging-api.com
# 使用次数: 3 次
# 最后更新: 2025-01-15 10:30:15
```

### 语言切换
```bash
# 检查当前语言
ccman lang
# 当前语言： 中文 (Chinese)

# 切换到英文
ccman lang set en
# ✓ 语言切换成功
# Current language: English

# 设置自动检测
ccman lang set auto
# ✓ 语言切换成功  
# 当前语言： 自动检测 (Auto-detect)
# 自动检测结果: English
```

## 🛠️ 开发设置

### 开发环境
CCM 支持隔离的开发环境：

```bash
# 设置开发路径
export CCM_CONFIG_DIR=".ccman-dev"
export CLAUDE_CONFIG_PATH="$HOME/.claude/settings-dev.json"

# 使用开发模式
npm run dev

# 生产环境构建
npm run build

# 测试构建版本
npm start
```

### 开发命令
```bash
npm run dev                 # 使用 tsx 的开发模式
npm run build              # TypeScript 编译  
npm run start              # 运行构建后的 CLI
npm run clean              # 删除 dist/ 目录
npm run lint               # ESLint TypeScript 文件检查
npm test                   # 运行测试（passWithNoTests）
```

## 🔍 故障排除

### 供应商问题
```bash
# 供应商不工作？
ccman ls --current         # 检查当前供应商详情
ccman use <供应商id>        # 重新应用供应商配置

# 设置未应用？
# 检查 ~/.claude/settings.json 的更新
cat ~/.claude/settings.json | grep ANTHROPIC
```

### 语言问题  
```bash
# 语言未切换？
ccman lang                 # 检查当前设置
ccman lang set zh          # 强制中文
ccman lang set en          # 强制英文

# 首次运行问题？
ccman lang reset           # 重置为首次运行状态
ccman                      # 重新启动进行语言选择
```

### 配置问题
```bash  
# 配置损坏？
ccman clear                # 删除所有（需确认）
ccman                      # 重新开始

# 开发环境隔离
export CCM_CONFIG_DIR=".ccman-dev"  # 独立开发配置
```

## 📋 要求

- **Node.js** >= 16.0.0
- **Claude Code** 已安装且支持 settings.json
- **操作系统**: Linux, macOS, Windows (WSL)

## 📄 许可证

MIT 许可证 - 详见 LICENSE 文件。

---

## 🚀 从 v1.x 迁移

CCM v2.0 使用完全不同的架构：

### v1.x（Shell 集成）
- 修改 shell 配置文件
- 使用环境变量
- 复杂的 shell 集成

### v2.0（直接集成）  
- 直接修改 `~/.claude/settings.json`
- 基于供应商的配置
- 语言支持
- 简化、更安全的方法

**迁移**：v1.x 和 v2.x 不兼容。如果升级，请使用 `ccman clear` 重新开始。

---

*CCM v2.0 - 智能、多语言、无缝的 Claude Code 供应商管理。*
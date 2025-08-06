# CCM - Claude Code Manager

基于 TypeScript 的命令行工具，通过**独立配置文件进行安全的 Shell 集成**，管理 Claude Code API 配置。

> [English Documentation](./README.md) | **中文文档**

## ✨ 特性

✅ **环境组管理** - 添加、删除、切换 Claude Code 环境  
✅ **安全的 Shell 集成** - 使用独立的 `~/.ccman/.ccmanrc` 文件避免修改用户配置  
✅ **交互式 Source 控制** - 选择手动或自动 source，附带风险警告  
✅ **类型安全** - 完整的 TypeScript 实现，严格类型检查  
✅ **交互式 CLI** - 用户友好的命令，彩色输出和 inquirer 提示  
✅ **多 Shell 支持** - 支持 bash、zsh 和 fish  
✅ **完整工作流** - 从设置到使用的无缝流程  

## 🚀 快速开始

### 安装

```bash
# 从 NPM 安装
npm install -g cc-manager

# 或者开发环境安装依赖
npm install && npm run build
```

### 基本用法

```bash
# 交互式设置（推荐）
ccman config

# 或直接添加环境
ccman add default https://api.anthropic.com your-api-key

# 列出所有环境
ccman ls

# 切换环境（支持 source 选项）
ccman use default

# 显示当前环境
ccman current
```

## 📖 命令参考

### 核心环境管理
```bash
ccman add <name> <baseUrl> [apiKey]     # 添加环境（未提供 API key 时交互输入）
ccman remove <name>                     # 删除环境组
ccman use <name>                        # 切换环境（支持 source 交互）
ccman list|ls                           # 列出所有环境（* = 当前环境）
ccman current                           # 显示当前环境详情
ccman clear|clearall                    # 清除所有环境和 Shell 集成（危险操作）
```

### 交互式配置
```bash
ccman config                            # 完整交互式配置向导
                                     # - 添加/切换/编辑/删除环境
                                     # - 无环境时引导设置
                                     # - 完整菜单驱动界面
```

### 高级操作
```bash
ccman status                            # 显示详细 CCM 统计信息
ccman test [name]                       # 测试环境配置
ccman env                               # 生成 shell 导出脚本
```

### Shell 集成选项
```bash
# 禁用自动 shell 写入
ccman add <name> <url> --no-auto-write  
ccman use <name> --no-auto-write        

# 强制自动 source（有风险）
ccman use <name> --auto-source          
```

## 🔧 交互式工作流

### 1. 添加环境的智能使用流程

```bash
$ ccman add myenv https://api.example.com
? 输入 API Key: ****************
✓ 已添加环境组 "myenv"
  Base URL: https://api.example.com
  创建时间: 2025-08-06 11:45:30

? 将 "myenv" 设为当前环境? 是
✓ 环境变量已写入 /home/user/.ccman/.ccmanrc

? 如何应用环境变量?
❯ 手动 - 我将重启终端或手动 source（推荐）
  自动 source - 尝试自动 source（可能在某些环境下不工作）

> 手动
要应用更改，请重启终端或运行:
source ~/.bashrc (或 ~/.zshrc)
```

### 2. 交互式配置菜单

```bash
$ ccman config
? 你想做什么?
❯ 切换环境
  添加新环境  
  编辑环境
  删除环境
  显示当前状态

> 添加新环境
? 环境名称: staging
? Base URL: https://staging-api.example.com
? API Key: ****************
✓ 已添加环境 "staging"
```

### 3. 环境切换与 Source 控制

```bash
$ ccman use production  
✓ 已切换到环境 "production"
  Base URL: https://api.anthropic.com
✓ 环境变量已写入 /home/user/.ccman/.ccmanrc

? 如何应用环境变量?
  手动 - 我将重启终端或手动 source（推荐）
❯ 自动 source - 尝试自动 source（可能在某些环境下不工作）

> 自动 source
⚠️  尝试自动 source - 这可能在某些终端环境下不工作
✓ Shell 配置已成功 source
```

## 🛡️ 安全的 Shell 集成架构

### 工作原理

CCM 使用**双层架构**进行安全的 shell 集成：

1. **独立配置文件**：`~/.ccman/.ccmanrc`
   ```bash
   # CCM (Claude Code Manager) Environment Variables - Auto Generated
   # Generated at: 2025-08-06 11:45:30
   # Environment: production
   export ANTHROPIC_BASE_URL="https://api.anthropic.com"
   export ANTHROPIC_AUTH_TOKEN="your-api-key"
   # End CCM Environment Variables
   ```

2. **最小 Shell 引用**：在 `.bashrc`/`.zshrc` 中添加一行引用
   ```bash
   # CCM (Claude Code Manager) - Auto Generated Reference
   [ -f "/home/user/.ccman/.ccmanrc" ] && source "/home/user/.ccman/.ccmanrc"
   # End CCM Reference
   ```

### 优势
- ✅ **非侵入性**：只在 shell 配置中添加一行引用
- ✅ **安全**：用户现有的 shell 配置保持不变
- ✅ **清洁**：易于完全移除
- ✅ **隔离**：所有 CCM 变量在单独文件中

### 管理的环境变量
- `ANTHROPIC_BASE_URL` - API 基础 URL
- `ANTHROPIC_AUTH_TOKEN` - API 认证令牌

## 📊 配置结构

CCM 在 `~/.ccman/config.json` 中存储配置：

```json
{
  "current": "production",
  "environments": {
    "production": {
      "name": "production",
      "baseUrl": "https://api.anthropic.com",
      "apiKey": "your-key",
      "createdAt": "2025-08-06T03:45:30.000Z",
      "lastUsed": "2025-08-06T03:50:15.000Z"
    },
    "staging": {
      "name": "staging", 
      "baseUrl": "https://staging-api.example.com",
      "apiKey": "staging-key",
      "createdAt": "2025-08-06T03:46:00.000Z"
    }
  },
  "settings": {
    "autoWriteShell": true,
    "preferredShell": "auto",
    "shellConfigPath": null
  }
}
```

## 💡 使用示例

### 完整设置工作流
```bash
# 从交互式设置开始
ccman config
# → 引导添加第一个环境
# → 自动提示设为当前环境
# → 选择 source 方法（手动/自动）

# 添加更多环境
ccman add staging https://staging.example.com
ccman add dev https://dev.example.com

# 完整交互切换
ccman use dev
# → 写入到 ~/.ccman/.ccmanrc
# → 询问 source 方法
# → 提供清晰指导

# 检查状态
ccman status
# CCM 状态:
# 总环境数: 3
# 当前环境: dev
# Shell 集成: 已启用
```

### 手动环境变量设置
```bash
# 如果你偏好手动控制
ccman use prod --no-auto-write
ccman env  # 显示导出脚本
source <(ccman env)  # 手动应用
```

### 高级用法
```bash
# 测试环境连接性
ccman test production

# 强制自动 source（有风险警告）
ccman use staging --auto-source

# 编辑现有环境
ccman config  # → 编辑环境 → 选择 → 更新值

# 完全重置（删除所有内容 - 环境、shell 配置）
ccman clear   # 需要交互确认
```

## ⚙️ 开发

```bash
# 开发模式（文件监听）
npm run dev

# 构建 TypeScript
npm run build

# 清理构建产物  
npm run clean

# 运行构建后的 CLI
npm start
```

## 🎯 命令行选项

### 全局选项
所有命令都支持标准 CLI 约定：
- `-h, --help` - 显示命令帮助
- `-V, --version` - 显示版本

### Add 命令选项
```bash
ccman add <name> <baseUrl> [apiKey] [选项]

选项:
  --no-auto-write    不自动写入 shell 配置
```

### Use 命令选项  
```bash
ccman use <name> [选项]

选项:
  --no-auto-write    不自动写入 shell 配置
  --auto-source      自动 source shell 配置（有风险）
```

## 🔍 故障排除

### 环境变量未应用
```bash
# 检查 .ccmanrc 是否存在
ls -la ~/.ccman/.ccmanrc

# 检查 shell 引用
grep "ccman" ~/.bashrc ~/.zshrc

# 手动应用
source ~/.ccman/.ccmanrc

# 或重新生成
ccman use <当前环境>
```

### Shell 集成问题
```bash
# 检查 shell 类型检测
ccman status

# 强制手动设置
ccman use <环境> --no-auto-write
source <(ccman env)
```

## 📋 要求

- Node.js >= 16.0.0  
- TypeScript 5.0+
- 支持的 shell: bash, zsh, fish
- 操作系统: Linux, macOS, Windows (WSL)

## 📄 许可证

MIT 许可证 - 详见 LICENSE 文件。

---

## 🚀 从设置到使用 - 完整流程

```bash
# 1. 交互式首次设置
ccman config
  → 无环境？引导创建
  → 设为当前环境？是
  → Source 方法？手动/自动

# 2. 添加更多环境  
ccman add dev https://dev.api.com
  → 交互式 API key 输入
  → 设为当前环境？是/否
  → 如选是则完整 source 交互

# 3. 随时切换，完全控制
ccman use production
  → 安全 .ccmanrc 更新
  → Source 方法选择
  → 清晰指导

# 4. 一切正常工作！ ✨
```

*CCM - 让 Claude Code API 配置管理变得安全、交互式且用户友好。*
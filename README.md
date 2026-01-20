# ccman

> Codex、Claude Code、Gemini CLI 和 MCP 的配置管理工具，一键切换 API 服务商配置和管理 MCP 服务器。

---

## 🎉 Desktop 版本现已支持

- ☁️ **WebDAV 云同步**：将配置同步到你的 WebDAV 服务器（iCloud/Dropbox/坚果云等）
  - 智能合并：自动合并本地和云端配置，避免冲突
  - 加密传输：API Key 使用密码加密后上传
  - 自动备份：下载前自动备份本地配置
- 💾 **配置导入导出**：本地备份和迁移配置
  - 导出配置到本地文件夹
  - 从本地文件夹导入配置
  - 自动备份防止误操作

👉 从 [GitHub Releases](https://github.com/2ue/ccman/releases) 下载 Desktop 版本体验完整功能

---

## 📸 界面预览

<div align="center">
  <img src="./docs/screenshoot/ccman.png" alt="ccman 主界面" width="800">
  <p><em>ccman Desktop 主界面</em></p>
</div>

👉 [查看更多截图](./docs/Screenshots.md) - 包含所有功能界面展示

---

## ✨ 核心特性

- 🔄 **一键切换**：一条命令切换服务商，自动修改配置文件
- 📦 **内置预设**：提供官方与 GMN 预设（Claude: 1 个，Gemini: 2 个，Codex: 2 个，MCP: 多个），只需填写 API Key
- 🛠️ **自定义配置**：支持添加任意第三方服务商
- 🔐 **零破坏性**：只修改管理的字段，写入前备份，失败回滚
- 🎯 **多工具支持**：同时管理 Codex、Claude Code、Gemini CLI 和 MCP 服务器
- 📱 **双界面**：提供 CLI（命令行）和 Desktop（图形界面）
- 🔁 **克隆功能**：快速复制配置，管理多个 API Key
- 🔒 **无第三方上传**：不会上传到我们的服务器，配置权限 `0600`
- 🎨 **交互式菜单**：无需记忆命令，跟随提示操作

---

## 也许你不需要 ccman

ccman 的核心功能是自动化配置文件的切换。如果你更喜欢手动编辑配置文件，或者只使用一个服务商从不切换，可能不需要这个工具。

📖 详细了解：[也许你不需要 ccman](./docs/也许你不需要ccman.md) - 包含手动配置方式、对比分析和适用场景

---

## 安装

### CLI

```bash
npm install -g ccman
```

**要求**：Node.js >= 18.0.0

### Desktop

从 [GitHub Releases](https://github.com/2ue/ccman/releases) 下载：

- **macOS**:
  - Intel: `ccman-VERSION-macos-x64.dmg`
  - Apple Silicon: `ccman-VERSION-macos-arm64.dmg`
  - Universal: `ccman-VERSION-macos-universal.dmg`
- **Windows**: `ccman-VERSION-windows-x64.exe`

---

## 快速开始

### 查看帮助

```bash
$ ccman --help

Usage: ccman [options] [command]

Codex/Claude Code API 服务商配置管理工具

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  cx              管理 Codex 服务商
  cc              管理 Claude 服务商
  gm              管理 Gemini CLI 服务商
  mcp             管理 MCP 服务器
  sync            WebDAV 同步配置
  export [dir]    导出配置
  import [dir]    导入配置
  help [command]  display help for command
```

### 管理 Codex 服务商

```bash
ccman cx           # 进入交互式菜单
ccman cx add       # 添加服务商
ccman cx use       # 切换服务商
ccman cx list      # 查看所有服务商
```

**示例输出**：

```bash
$ ccman cx list

📋 Codex 服务商 (2 个)

  ●  OpenAI Official [当前]
     https://api.openai.com/v1

  ○  GMN
     https://gmn.chuangzuoli.cn/openai
```

```bash
$ ccman cx current

📍 当前 Codex 服务商

  OpenAI Official
  ID: codex-1760178741529-hbgbad
  URL: https://api.openai.com/v1
  最后使用: 2025/10/11 18:32:25
```

### 管理 Claude Code 服务商

```bash
ccman cc           # 进入交互式菜单
ccman cc add       # 添加服务商
ccman cc use       # 切换服务商
ccman cc list      # 查看所有服务商
```

**示例输出**：

```bash
$ ccman cc list

📋 Claude Code 服务商 (1 个)

  ●  Anthropic Official [当前]
     https://api.anthropic.com
```

```bash
$ ccman cc current

📍 当前 Claude Code 服务商

  Anthropic Official
  ID: claude-1760182672751-unh2bp
  URL: https://api.anthropic.com
  最后使用: 2025/10/11 20:14:08
```

### 管理 Gemini CLI 服务商

```bash
ccman gm           # 进入交互式菜单
ccman gm add       # 添加服务商
ccman gm use       # 切换服务商
ccman gm list      # 查看所有服务商
```

### 管理 MCP 服务器

```bash
ccman mcp add      # 添加 MCP 服务器
ccman mcp list     # 查看所有 MCP 服务器
ccman mcp edit     # 编辑 MCP 服务器
ccman mcp remove   # 删除 MCP 服务器
```

**注意**：MCP 服务器可以在 Claude Code 和 Gemini CLI 中启用。使用 Desktop 版本可以方便地管理 MCP 在不同工具中的启用状态。

---

## 完整命令

| 命令 | 说明 |
|------|------|
| `ccman` | 主菜单（选择 Codex、Claude Code 或 Gemini CLI） |
| **Codex 管理** | |
| `ccman cx` | Codex 交互式菜单 |
| `ccman cx add` | 添加 Codex 服务商（支持预设模板和自定义） |
| `ccman cx list` | 列出所有 Codex 服务商 |
| `ccman cx use [name]` | 切换 Codex 服务商 |
| `ccman cx current` | 查看当前 Codex 服务商 |
| `ccman cx edit [name]` | 编辑 Codex 服务商 |
| `ccman cx remove [name]` | 删除 Codex 服务商 |
| `ccman cx clone [source]` | 克隆 Codex 服务商（复制配置，改名称和 Key） |
| **Claude Code 管理** | |
| `ccman cc` | Claude Code 交互式菜单 |
| `ccman cc add` | 添加 Claude Code 服务商 |
| `ccman cc list` | 列出所有 Claude Code 服务商 |
| `ccman cc use [name]` | 切换 Claude Code 服务商 |
| `ccman cc current` | 查看当前 Claude Code 服务商 |
| `ccman cc edit [name]` | 编辑 Claude Code 服务商 |
| `ccman cc remove [name]` | 删除 Claude Code 服务商 |
| `ccman cc clone [source]` | 克隆 Claude Code 服务商 |
| **Gemini CLI 管理** | |
| `ccman gm` | Gemini CLI 交互式菜单 |
| `ccman gm add` | 添加 Gemini CLI 服务商 |
| `ccman gm list` | 列出所有 Gemini CLI 服务商 |
| `ccman gm use [name]` | 切换 Gemini CLI 服务商 |
| `ccman gm current` | 查看当前 Gemini CLI 服务商 |
| `ccman gm edit [name]` | 编辑 Gemini CLI 服务商 |
| `ccman gm remove [name]` | 删除 Gemini CLI 服务商 |
| `ccman gm clone [source]` | 克隆 Gemini CLI 服务商 |
| **MCP 服务器管理** | |
| `ccman mcp add` | 添加 MCP 服务器 |
| `ccman mcp list` | 列出所有 MCP 服务器 |
| `ccman mcp edit [name]` | 编辑 MCP 服务器 |
| `ccman mcp remove [name]` | 删除 MCP 服务器 |
| **配置同步和导入导出** | |
| `ccman sync` | WebDAV 同步配置（备份/恢复/合并） |
| `ccman export [dir]` | 导出配置到本地目录 |
| `ccman import [dir]` | 从本地目录导入配置 |

---

## 内置预设

添加服务商时可以选择"使用预设模板"，只需填写 API Key：

### Claude Code 预设（1 个）

| 预设名称 | Base URL |
|---------|----------|
| Anthropic Official | `https://api.anthropic.com` |

### Gemini CLI 预设（2 个）

| 预设名称 | Base URL |
|---------|----------|
| Google Gemini (API Key) | 官方默认 |
| GMN | `https://gmn.chuangzuoli.cn/openai` |

### Codex 预设（2 个）

| 预设名称 | Base URL |
|---------|----------|
| OpenAI Official | `https://api.openai.com/v1` |
| GMN | `https://gmn.chuangzuoli.cn/openai` |

### MCP 预设（多个）

MCP 服务器预设包括：filesystem、github、postgres、brave-search、fetch、memory 等多个常用 MCP 服务器模板。

也可以选择"自定义配置"，手动填写 Base URL。

---

## 完整使用示例

### 场景 1：添加并切换服务商

```bash
# 1. 查看当前列表
$ ccman cx list

📋 Codex 服务商 (1 个)

  ●  OpenAI Official [当前]
     https://api.openai.com/v1

# 2. 添加 GMN（交互式）
$ ccman cx add
? 选择配置方式 › 使用预设模板
? 选择预设 › GMN
? 服务商名称 › GMN
? API Key › ••••••••••••••••••••
✅ 添加成功！
💡 切换到此服务商: ccman cx use GMN

# 3. 切换到 GMN
$ ccman cx use GMN
✅ 已切换到: GMN

# 4. 确认当前服务商
$ ccman cx current

📍 当前 Codex 服务商

  GMN
  ID: codex-1760178741529-abc123
  URL: https://gmn.chuangzuoli.cn/openai
  最后使用: 2025/10/11 18:32:25
```

### 场景 2：克隆服务商（管理多个 Key）

```bash
# 1. 添加生产配置
$ ccman cc add
? 选择配置方式 › 自定义配置
? 服务商名称 › Claude Production
? Base URL › https://api.anthropic.com
? API Key › ••••••••••••••••••••
✅ 添加成功！

# 2. 克隆创建测试配置
$ ccman cc clone
? 选择要克隆的服务商 › Claude Production
? 新服务商名称 › Claude Test
? API Key › ••••••••••••••••••••
✅ 克隆成功！
💡 切换到此服务商: ccman cc use "Claude Test"

# 3. 查看列表
$ ccman cc list

📋 Claude Code 服务商 (2 个)

  ●  Claude Production [当前]
     https://api.anthropic.com

  ○  Claude Test
     https://api.anthropic.com

# 4. 快速切换
$ ccman cc use "Claude Test"
✅ 已切换到: Claude Test
```

---

## 配置文件

**ccman 配置**：
- `~/.ccman/codex.json` - Codex 服务商配置
- `~/.ccman/claude.json` - Claude Code 服务商配置
- `~/.ccman/gemini.json` - Gemini CLI 服务商配置
- `~/.ccman/mcp.json` - MCP 服务器配置

**工具配置**（ccman 会自动修改）：
- **Codex**: `~/.codex/config.toml`
- **Claude Code**: `~/.claude/settings.json`
- **Gemini CLI**: `~/.gemini/settings.json` 和 `~/.gemini/.env`

**零破坏性承诺**：
- 只修改管理的字段，保留其他所有配置
- 写入前备份，失败时自动回滚
- API Key 存储在本地，权限 `0600`

---

## 常见问题

**Q: 支持配置导入/导出吗？**
A: **Desktop 版本支持**完整的导入/导出功能：
- 导出配置到本地文件夹（包含 API Key）
- 从本地文件夹导入配置（自动备份当前配置）
- CLI 版本暂不支持，可手动复制 `~/.ccman/` 目录

**Q: WebDAV 同步是什么？**
A: **Desktop 版本支持** WebDAV 云同步功能：
- 同步配置到你的 WebDAV 服务器（iCloud/Dropbox/坚果云等）
- 智能合并：自动合并本地和云端配置，避免冲突
- 加密传输：API Key 使用密码加密后上传
- CLI 版本提供基础同步命令：`ccman sync --help`

---

## 许可证

MIT

---

## 相关链接

- [GitHub 仓库](https://github.com/2ue/ccman)
- [问题反馈](https://github.com/2ue/ccman/issues)
- [更新日志](https://github.com/2ue/ccman/blob/main/CHANGELOG.md)

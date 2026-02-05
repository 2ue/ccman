# ccman

> Codex、Claude Code、Gemini CLI、OpenCode 和 MCP 的配置管理工具，一键切换 API 服务商配置和管理 MCP 服务器。

---

## ✨ 核心特性

- 🔄 **一键切换**：一条命令切换服务商，自动修改配置文件
- 📦 **内置预设**：提供常用预设（Claude: 1 个，Gemini: 2 个，Codex: 2 个，OpenCode: 1 个，MCP: 多个），只需填写 API Key
- 🛠️ **自定义配置**：支持添加任意第三方服务商
- 🔐 **安全写入**：写入前备份；Codex 的 `config.toml/auth.json` 备份后覆盖写入，其他工具尽量保留用户字段
- 🎯 **多工具支持**：同时管理 Codex、Claude Code、Gemini CLI、OpenCode 和 MCP 服务器
- 📱 **双界面**：提供 CLI（命令行）和 Desktop（图形界面）
- 🔁 **克隆功能**：快速复制配置，管理多个 API Key
- ☁️ **WebDAV 同步**（可选）：同步配置到你自己的 WebDAV 服务器（iCloud/Dropbox）
- 🔒 **无第三方上传**：不会上传到我们的服务器，配置权限 `0600`
- 🎨 **交互式菜单**：无需记忆命令，跟随提示操作

---

## 也许你不需要 ccman

ccman 的核心功能是自动化配置文件的切换：

- **Codex**：自动修改 `~/.codex/config.toml`
- **Claude Code**：自动修改 `~/.claude/settings.json`
- **Gemini CLI**：自动修改 `~/.gemini/settings.json` 和 `~/.gemini/.env`
- **OpenCode**：自动修改 `~/.config/opencode/opencode.json`
- **MCP**：管理 MCP 服务器配置，并同步到 Claude Code 和 Gemini CLI
- **备份机制**：写入前自动备份，失败时自动回滚

如果你更喜欢手动编辑配置文件，或者只使用一个服务商从不切换，可能不需要这个工具。

📖 更多信息：[GitHub 仓库](https://github.com/2ue/ccman) - 包含手动配置方式和详细对比分析

---

## 安装

```bash
npm install -g ccman
```

**要求**：Node.js >= 18.0.0

**Desktop 版本**：如果你更喜欢图形界面，可以从 [GitHub Releases](https://github.com/2ue/ccman/releases) 下载 Desktop 应用（macOS/Windows/Linux）。

---

## 快速开始

### 查看帮助

```bash
$ ccman --help

Usage: ccman [options] [command]

Codex/Claude Code/Gemini/OpenCode API 服务商配置管理工具

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  cx              管理 Codex 服务商
  cc              管理 Claude 服务商
  gm              管理 Gemini CLI 服务商
  oc              管理 OpenCode 服务商
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
     https://gmn.chuangzuoli.com
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

### 管理 OpenCode 服务商

```bash
ccman oc           # 进入交互式菜单
ccman oc add       # 添加服务商
ccman oc use       # 切换服务商
ccman oc list      # 查看所有服务商
```

### 管理 MCP 服务器

```bash
ccman mcp add      # 添加 MCP 服务器
ccman mcp list     # 查看所有 MCP 服务器
ccman mcp edit     # 编辑 MCP 服务器
ccman mcp remove   # 删除 MCP 服务器
```

---

## 完整命令

| 命令 | 说明 |
|------|------|
| `ccman` | 主菜单（选择 Codex、Claude Code、Gemini CLI 或 OpenCode） |
| **Codex 管理** | |
| `ccman cx` | Codex 交互式菜单 |
| `ccman cx add` | 添加 Codex 服务商（支持预设模板和自定义） |
| `ccman cx list` | 列出所有 Codex 服务商 |
| `ccman cx use [name]` | 切换 Codex 服务商 |
| `ccman cx current` | 查看当前 Codex 服务商 |
| `ccman cx edit [name]` | 编辑 Codex 服务商 |
| `ccman cx remove [name]` | 删除 Codex 服务商 |
| `ccman cx clone [source]` | 克隆 Codex 服务商 |
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
| **OpenCode 管理** | |
| `ccman oc` | OpenCode 交互式菜单 |
| `ccman oc add` | 添加 OpenCode 服务商 |
| `ccman oc list` | 列出所有 OpenCode 服务商 |
| `ccman oc use [name]` | 切换 OpenCode 服务商 |
| `ccman oc current` | 查看当前 OpenCode 服务商 |
| `ccman oc edit [name]` | 编辑 OpenCode 服务商 |
| `ccman oc remove [name]` | 删除 OpenCode 服务商 |
| `ccman oc clone [source]` | 克隆 OpenCode 服务商 |
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

### Claude Code 预设（2 个）

| 预设名称 | Base URL |
|---------|----------|
| Anthropic Official | `https://api.anthropic.com` |
| GMN | `https://gmn.chuangzuoli.com/api` |

### Gemini CLI 预设（2 个）

| 预设名称 | Base URL |
|---------|----------|
| Google Gemini (API Key) | 官方默认 |
| GMN | `https://gmn.chuangzuoli.com` |

### Codex 预设（2 个）

| 预设名称 | Base URL |
|---------|----------|
| OpenAI Official | `https://api.openai.com/v1` |
| GMN | `https://gmn.chuangzuoli.com` |

### OpenCode 预设（1 个）

| 预设名称 | Base URL |
|---------|----------|
| GMN | `https://gmn.chuangzuoli.com` |

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
  URL: https://gmn.chuangzuoli.com
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
- `~/.ccman/opencode.json` - OpenCode 服务商配置
- `~/.ccman/mcp.json` - MCP 服务器配置

**工具配置**（ccman 会自动修改）：
- **Codex**: `~/.codex/config.toml`
- **Claude Code**: `~/.claude/settings.json`
- **Gemini CLI**: `~/.gemini/settings.json` 和 `~/.gemini/.env`
- **OpenCode**: `~/.config/opencode/opencode.json`

**安全写入承诺**：
- 写入前备份（`.bak`），失败时自动回滚
- Codex 的 `config.toml/auth.json` 采用备份后覆盖写入（避免遗留字段导致报错/告警）
- API Key 存储在本地，权限 `0600`

---

## 常见问题

**Q: 支持配置导入/导出吗？**
A: 当前版本不支持。如需备份，手动复制 `~/.ccman/` 目录。

**Q: WebDAV 同步是什么？**
A: 将 ccman 配置同步到 WebDAV 服务器（如 iCloud/Dropbox），多设备共享配置。详见 `ccman sync --help`。

---

## 许可证

MIT

---

## 相关链接

- [GitHub 仓库](https://github.com/2ue/ccman)
- [问题反馈](https://github.com/2ue/ccman/issues)
- [更新日志](https://github.com/2ue/ccman/blob/main/CHANGELOG.md)
- [Desktop 版本](https://github.com/2ue/ccman/releases)（图形界面）

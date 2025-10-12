# ccman

> Codex 和 Claude Code 的 API 服务商配置管理工具，一键切换 Codex 和 Claude Code 的 API 服务商配置。

---

## ✨ 核心特性

- 🔄 **一键切换**：一条命令切换服务商，自动修改配置文件
- 📦 **内置预设**：7 个常用服务商模板，只需填写 API Key
- 🛠️ **自定义配置**：支持添加任意第三方服务商
- 🔐 **零破坏性**：只修改管理的字段，写入前备份，失败回滚
- 🎯 **双工具支持**：同时管理 Codex 和 Claude Code
- 📱 **双界面**：提供 CLI（命令行）和 Desktop（图形界面）
- 🔁 **克隆功能**：快速复制配置，管理多个 API Key
- ☁️ **WebDAV 同步**（可选）：同步配置到你自己的 WebDAV 服务器（iCloud/Dropbox）
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

从 [GitHub Releases](https://github.com/2ue/ccm/releases) 下载：

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
  sync            WebDAV 同步配置
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

  ●  Anthropic Official [当前]
     https://api.anthropic.com

  ○  88Code
     https://www.88code.org/api
```

```bash
$ ccman cx current

📍 当前 Codex 服务商

  Anthropic Official
  ID: codex-1760178741529-hbgbad
  URL: https://api.anthropic.com
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

📋 Claude Code 服务商 (2 个)

  ○  AnyRouter
     https://anyrouter.top

  ●  PackyCode [当前]
     https://api.packycode.com
```

```bash
$ ccman cc current

📍 当前 Claude Code 服务商

  PackyCode
  ID: claude-1760182672751-unh2bp
  URL: https://api.packycode.com
  最后使用: 2025/10/11 20:14:08
```

---

## 完整命令

| 命令 | 说明 |
|------|------|
| `ccman` | 主菜单（选择 Codex 或 Claude Code） |
| `ccman cx` | Codex 交互式菜单 |
| `ccman cx add` | 添加 Codex 服务商（支持预设模板和自定义） |
| `ccman cx list` | 列出所有 Codex 服务商 |
| `ccman cx use [name]` | 切换 Codex 服务商 |
| `ccman cx current` | 查看当前 Codex 服务商 |
| `ccman cx edit [name]` | 编辑 Codex 服务商 |
| `ccman cx remove [name]` | 删除 Codex 服务商 |
| `ccman cx clone [source]` | 克隆 Codex 服务商（复制配置，改名称和 Key） |
| `ccman cc` | Claude Code 交互式菜单 |
| `ccman cc add` | 添加 Claude Code 服务商 |
| `ccman cc list` | 列出所有 Claude Code 服务商 |
| `ccman cc use [name]` | 切换 Claude Code 服务商 |
| `ccman cc current` | 查看当前 Claude Code 服务商 |
| `ccman cc edit [name]` | 编辑 Claude Code 服务商 |
| `ccman cc remove [name]` | 删除 Claude Code 服务商 |
| `ccman cc clone [source]` | 克隆 Claude Code 服务商 |
| `ccman sync` | WebDAV 同步配置（备份/恢复/合并） |

---

## 内置预设

添加服务商时可以选择"使用预设模板"，只需填写 API Key：

| 预设名称 | Base URL |
|---------|----------|
| Anthropic Official | `https://api.anthropic.com` |
| AnyRouter | `https://anyrouter.top` |
| PackyCode | `https://api.packycode.com` |
| CoordCode | `https://api.coordcode.com/api` |
| 88Code | `https://www.88code.org/api` |
| BigModel | `https://open.bigmodel.cn/api/anthropic` |
| ModelScope | `https://api-inference.modelscope.cn/v1/chat/completions` |

也可以选择"自定义配置"，手动填写 Base URL。

---

## 完整使用示例

### 场景 1：添加并切换服务商

```bash
# 1. 查看当前列表
$ ccman cx list

📋 Codex 服务商 (1 个)

  ●  Anthropic Official [当前]
     https://api.anthropic.com

# 2. 添加 PackyCode（交互式）
$ ccman cx add
? 选择配置方式 › 使用预设模板
? 选择预设 › PackyCode
? 服务商名称 › PackyCode
? API Key › ••••••••••••••••••••
✅ 添加成功！
💡 切换到此服务商: ccman cx use PackyCode

# 3. 切换到 PackyCode
$ ccman cx use PackyCode
✅ 已切换到: PackyCode

# 4. 确认当前服务商
$ ccman cx current

📍 当前 Codex 服务商

  PackyCode
  ID: codex-1760178741529-abc123
  URL: https://api.packycode.com
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

**ccman 配置**：`~/.ccman/config.json`

**Codex 配置**（ccman 会自动修改）：
- `~/.codex/config.toml`
- `~/.codex/auth.json`

**Claude Code 配置**（ccman 会自动修改）：
- `~/.claude/settings.json`

**零破坏性承诺**：
- 只修改管理的字段，保留其他所有配置
- 写入前备份，失败时自动回滚
- API Key 存储在本地，权限 `0600`

---

## 常见问题

**Q: 切换服务商后需要重启工具吗？**
A: 不需要。ccman 直接修改配置文件，工具会自动重新加载。

**Q: 删除服务商后还能恢复吗？**
A: 不能。删除操作不可逆。

**Q: 支持配置导入/导出吗？**
A: 当前版本不支持。如需备份，手动复制 `~/.ccman/` 目录。

**Q: WebDAV 同步是什么？**
A: 将 ccman 配置同步到 WebDAV 服务器（如 iCloud/Dropbox），多设备共享配置。详见 `ccman sync --help`。

---

## 许可证

MIT

---

## 相关链接

- [GitHub 仓库](https://github.com/2ue/ccm)
- [问题反馈](https://github.com/2ue/ccm/issues)
- [更新日志](https://github.com/2ue/ccm/blob/main/CHANGELOG.md)

# ccman

> Codex 和 Claude Code 的 API 服务商配置管理工具

## ✨ 特性

- 🔄 **快速切换**：一键切换不同的 API 服务商
- 📦 **预设模板**：内置 7 个常用服务商模板，只需填写 API Key
- 🛠️ **灵活配置**：支持自定义服务商配置
- 🔒 **安全存储**：API Key 只存储在本地，权限保护
- 🎯 **双工具支持**：同时管理 Codex 和 Claude Code

## 📦 安装

```bash
npm install -g ccman
```

**系统要求**：Node.js >= 18.0.0

## 🚀 快速开始

### 管理 Codex 服务商

```bash
# 1. 添加服务商（交互式）
ccman cx add

# 2. 查看所有服务商
ccman cx list

# 3. 切换服务商
ccman cx use

# 4. 查看当前服务商
ccman cx current
```

### 管理 Claude Code 服务商

```bash
# 1. 添加服务商（交互式）
ccman cc add

# 2. 查看所有服务商
ccman cc list

# 3. 切换服务商
ccman cc use

# 4. 查看当前服务商
ccman cc current
```

### 交互式菜单

直接运行 `ccman` 进入交互式主菜单：

```bash
ccman         # 主菜单（选择 Codex 或 Claude Code）
ccman cx      # Codex 菜单
ccman cc      # Claude Code 菜单
```

## 📚 命令详解

### Codex 命令（`ccman cx`）

#### `ccman cx add`

添加新的 Codex 服务商。

**交互流程**：

```bash
$ ccman cx add

? 选择配置方式 ›
❯ 使用预设模板
  自定义配置

# 选择 "使用预设模板"
? 选择预设 ›
❯ Anthropic Official
  AnyRouter
  PackyCode
  CoordCode
  88Code
  BigModel
  ModelScope

# 填写信息
? 服务商名称 › Anthropic Official
? API Key › sk-ant-••••••••••••••••••••••

✅ 添加成功！
💡 切换到此服务商: ccman cx use "Anthropic Official"
```

#### `ccman cx list`

列出所有 Codex 服务商，`●` 表示当前使用的服务商。

```bash
$ ccman cx list

📋 Codex 服务商列表 (共 2 个)

● Anthropic Official
  https://api.anthropic.com

○ PackyCode
  https://api.packycode.com
```

#### `ccman cx use [name]`

切换 Codex 服务商。如果不提供名称，会显示交互式选择器。

```bash
# 交互式选择
$ ccman cx use

? 选择要使用的服务商 ›
  Anthropic Official (当前)
❯ PackyCode

✅ 已切换到: PackyCode

# 直接指定名称
$ ccman cx use PackyCode
✅ 已切换到: PackyCode
```

**说明**：切换后会自动更新 `~/.codex/` 中的配置文件，无需重启 Codex。

#### `ccman cx current`

显示当前使用的 Codex 服务商。

```bash
$ ccman cx current

✅ 当前 Codex 服务商

名称: PackyCode
Base URL: https://api.packycode.com
API Key: sk-••••••••••••••••••••••••••••••••
```

#### `ccman cx edit [name]`

编辑 Codex 服务商配置。

```bash
$ ccman cx edit

? 选择要编辑的服务商 ›
❯ Anthropic Official
  PackyCode

# 选择后可以修改
? 服务商名称 › Anthropic Official
? Base URL › https://api.anthropic.com
? API Key › (留空保持不变)

✅ 编辑成功！
```

#### `ccman cx remove [name]`

删除 Codex 服务商。

```bash
$ ccman cx remove

? 选择要删除的服务商 ›
  Anthropic Official (当前使用中)
❯ PackyCode

? 确认删除 "PackyCode"? › (y/N)

✅ 已删除: PackyCode
```

#### `ccman cx clone [source]`

克隆 Codex 服务商配置（复制 Base URL，修改名称和 API Key）。

```bash
$ ccman cx clone

? 选择要克隆的服务商 ›
❯ Anthropic Official
  PackyCode

? 新服务商名称 › Anthropic Test
? API Key › sk-ant-test-••••••••••••••••••

✅ 克隆成功！
💡 切换到此服务商: ccman cx use "Anthropic Test"
```

**使用场景**：
- 同一服务商有多个 API Key（测试/生产环境）
- 快速创建类似配置的服务商

### Claude Code 命令（`ccman cc`）

Claude Code 的命令与 Codex 完全相同：

- `ccman cc add` - 添加服务商
- `ccman cc list` - 列出服务商
- `ccman cc use [name]` - 切换服务商
- `ccman cc current` - 查看当前服务商
- `ccman cc edit [name]` - 编辑服务商
- `ccman cc remove [name]` - 删除服务商
- `ccman cc clone [source]` - 克隆服务商

**说明**：切换后会自动更新 `~/.claude/settings.json`，无需重启 Claude Code。

## 🎨 内置预设模板

两个工具都支持以下预设（只需填写 API Key）：

| 预设名称 | Base URL | 说明 |
|---------|----------|------|
| Anthropic Official | `https://api.anthropic.com` | Anthropic 官方 API |
| AnyRouter | `https://anyrouter.top` | AnyRouter API 服务 |
| PackyCode | `https://api.packycode.com` | PackyCode API 服务 |
| CoordCode | `https://api.coordcode.com/api` | CoordCode API 服务 |
| 88Code | `https://www.88code.org/api` | 88Code API 服务 |
| BigModel | `https://open.bigmodel.cn/api/anthropic` | 智谱 BigModel API |
| ModelScope | `https://api-inference.modelscope.cn/v1/chat/completions` | 阿里云 ModelScope API |

## 💡 使用示例

### 示例 1：添加并切换到新服务商

```bash
# 1. 添加 PackyCode
$ ccman cx add
# 选择 "使用预设模板" → "PackyCode" → 输入 API Key

# 2. 切换到 PackyCode
$ ccman cx use PackyCode
✅ 已切换到: PackyCode

# 3. 确认
$ ccman cx current
✅ 当前 Codex 服务商
名称: PackyCode
```

### 示例 2：管理多个 API Key

```bash
# 场景：同一服务商有测试和生产两个 API Key

# 1. 添加生产配置
$ ccman cc add
# 名称: Claude Production
# API Key: sk-ant-prod-xxx

# 2. 克隆创建测试配置
$ ccman cc clone
# 选择 "Claude Production"
# 新名称: Claude Test
# API Key: sk-ant-test-xxx

# 3. 查看列表
$ ccman cc list
📋 Claude Code 服务商列表 (共 2 个)
● Claude Production (当前)
○ Claude Test

# 4. 快速切换
$ ccman cc use "Claude Test"
✅ 已切换到: Claude Test
```

### 示例 3：自定义服务商配置

```bash
$ ccman cx add

? 选择配置方式 › 自定义配置
? 服务商名称 › My Custom Provider
? Base URL › https://api.example.com/v1
? API Key › my-secret-key

✅ 添加成功！
```

## 📂 配置文件

### ccman 配置

**位置**：`~/.ccman/config.json`

**结构**：

```json
{
  "providers": [
    {
      "id": "codex-1234567890-abc123",
      "name": "PackyCode",
      "type": "codex",
      "baseUrl": "https://api.packycode.com",
      "apiKey": "sk-xxx",
      "createdAt": 1234567890000,
      "lastUsedAt": 1234567900000
    }
  ],
  "currentCodexProvider": "codex-1234567890-abc123",
  "currentClaudeProvider": null
}
```

### Codex 配置

ccman 会自动修改以下文件：

- `~/.codex/config.toml` - Codex 主配置
- `~/.codex/auth.json` - 认证信息

### Claude Code 配置

ccman 会自动修改以下文件：

- `~/.claude/settings.json` - Claude Code 设置（只修改 `env.ANTHROPIC_AUTH_TOKEN` 和 `env.ANTHROPIC_BASE_URL`，不影响其他配置）

## 🔒 安全性

- ✅ API Key 只存储在本地，不会联网上传
- ✅ 配置文件设置为 `0600` 权限（仅当前用户可读写）
- ✅ 终端输入 API Key 时自动隐藏（显示为 `••••`）
- ✅ 列表显示时 API Key 自动脱敏

## ❓ 常见问题

### Q: 如何切换回之前的服务商？

A: 使用 `ccman cx use` 或 `ccman cc use` 选择之前的服务商即可。

### Q: 删除服务商后还能恢复吗？

A: 不能。删除操作不可逆，建议删除前确认。

### Q: 可以同时使用 CLI 和 Desktop 吗？

A: 可以。未来会推出 Desktop 应用，CLI 和 Desktop 共享同一套配置文件（`~/.ccman/`），修改会实时同步。

### Q: 切换服务商后需要重启 Codex/Claude Code 吗？

A: 不需要。ccman 会直接修改配置文件，工具会自动重新加载配置。

### Q: 支持导入/导出配置吗？

A: 当前版本不支持。如需备份配置，可以手动复制 `~/.ccman/` 目录。

## 📄 许可证

MIT © [2ue](https://github.com/2ue)

## 🔗 相关链接

- [GitHub 仓库](https://github.com/2ue/ccm)
- [问题反馈](https://github.com/2ue/ccm/issues)
- [更新日志](https://github.com/2ue/ccm/blob/main/CHANGELOG.md)

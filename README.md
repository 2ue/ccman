# ccman

像 NVM 管理 Node 版本一样管理 Codex 和 Claude Code 的 API 服务商配置。

## 💡 功能说明

ccman 是一个 API 服务商配置管理工具，主要功能：

- **统一管理**：在一个地方管理所有 API 服务商配置
- **快速切换**：一键切换不同的 API 提供商（如从 OpenAI 切换到 DeepSeek）
- **预设模板**：内置常用服务商模板，只需填写 API Key
- **双界面**：提供 CLI（命令行）和 Desktop（图形界面）两种使用方式
- **配置安全**：API Key 只存储在本地，权限保护

**支持的工具**：
- **Codex**：一个流行的 AI 编程辅助工具
- **Claude Code**：Anthropic 官方的 AI 编码助手

## 📦 安装

### CLI

```bash
npm install -g ccman
```

### Desktop

从 [GitHub Releases](https://github.com/2ue/ccm/releases) 下载对应平台的安装包：

- **macOS**:
  - Intel: `ccman-VERSION-macos-x64.dmg`
  - Apple Silicon: `ccman-VERSION-macos-arm64.dmg`
  - Universal: `ccman-VERSION-macos-universal.dmg`
- **Windows**: `ccman-VERSION-windows-x64.exe`

## 🚀 使用指南

### CLI 使用

#### 1. 查看帮助

```bash
# 查看主命令帮助
ccman --help

# 查看 Codex 子命令帮助
ccman cx --help

# 查看 Claude Code 子命令帮助
ccman cc --help
```

#### 2. 列出服务商

**作用**：查看所有已添加的服务商，以及当前正在使用的服务商。

**Codex 示例**：

```bash
$ ccman cx list

📋 Codex 服务商列表 (共 2 个)

● DeepSeek                         # ● 表示当前使用
  ID: codex-1759838018103-abc123
  URL: https://api.deepseek.com/v1

○ OpenAI
  ID: codex-1759838018104-def456
  URL: https://api.openai.com/v1
```

**Claude Code 示例**：

```bash
$ ccman cc list

📋 Claude Code 服务商列表 (共 1 个)

● Claude Official
  ID: claudecode-1759838018105-xyz789
  URL: https://api.anthropic.com
```

**空列表**：

```bash
$ ccman cc list

⚠️  暂无 Claude Code 服务商

💡 添加服务商: ccman cc add
```

#### 3. 查看当前服务商

**作用**：显示当前正在使用的服务商详细信息。

**示例**：

```bash
$ ccman cx current

✅ 当前 Codex 服务商

名称: DeepSeek
Base URL: https://api.deepseek.com/v1
API Key: sk-••••••••••••••••••••••••••••••••
```

**未选择时**：

```bash
$ ccman cx current

⚠️  未选择任何 Codex 服务商

💡 选择服务商: ccman cx use
```

#### 4. 添加服务商

**作用**：添加新的 API 服务商配置。

**交互流程**：

```bash
$ ccman cx add

? 选择配置方式 ›
❯ 使用预设模板
  自定义配置

# 选择 "使用预设模板"
? 选择预设 ›
❯ Claude (Anthropic)
  DeepSeek
  OpenAI
  Gemini (Google)
  Grok (xAI)

# 选择 "DeepSeek"
? 服务商名称 › DeepSeek
? API Key › sk-••••••••••••••••••••••

✅ 添加成功！

💡 切换到此服务商: ccman cx use DeepSeek
```

**自定义配置**：

```bash
$ ccman cx add

? 选择配置方式 › 自定义配置
? 服务商名称 › My Custom Provider
? Base URL › https://api.example.com/v1
? API Key › sk-••••••••••••••••••••••

✅ 添加成功！
```

#### 5. 切换服务商

**作用**：切换到另一个服务商。ccman 会自动修改 Codex/Claude Code 的配置文件。

**示例**：

```bash
$ ccman cx use

? 选择要使用的服务商 ›
  DeepSeek (当前)
❯ OpenAI
  Claude

# 选择 "OpenAI" 后
✅ 已切换到: OpenAI
```

**直接指定名称**：

```bash
$ ccman cx use OpenAI

✅ 已切换到: OpenAI
```

**说明**：
- 切换后，Codex/Claude Code 会自动使用新的配置
- 无需重启 Codex/Claude Code

#### 6. 编辑服务商

**作用**：修改已有服务商的配置（名称、Base URL、API Key）。

**示例**：

```bash
$ ccman cx edit

? 选择要编辑的服务商 ›
❯ DeepSeek
  OpenAI

# 选择 "DeepSeek"
? 服务商名称 › DeepSeek Pro
? Base URL › https://api.deepseek.com/v1
? API Key › sk-••••••••••••••••••••••

✅ 编辑成功！
```

#### 7. 删除服务商

**作用**：删除不再使用的服务商。

**示例**：

```bash
$ ccman cx remove

? 选择要删除的服务商 ›
  DeepSeek (当前使用中)
❯ OpenAI

# 选择 "OpenAI"
? 确认删除 "OpenAI"? › (y/N)

✅ 已删除: OpenAI
```

**说明**：
- 正在使用的服务商可以删除，但会标记"当前使用中"
- 删除后需要重新选择服务商

#### 8. 克隆服务商

**作用**：基于现有服务商快速创建新配置（只需改名称和 API Key）。

**使用场景**：
- 同一服务商有多个 API Key（测试/生产）
- 创建类似配置的服务商

**示例**：

```bash
$ ccman cx clone

? 选择要克隆的服务商 ›
❯ DeepSeek
  OpenAI

# 选择 "DeepSeek"
? 新服务商名称 › DeepSeek Test
? API Key › sk-••••••••••••••••••••••

✅ 克隆成功！

💡 切换到此服务商: ccman cx use "DeepSeek Test"
```

#### 9. 内置预设模板

**Codex 预设**：
- **Claude (Anthropic)**: `https://api.anthropic.com`
- **DeepSeek**: `https://api.deepseek.com/v1`
- **OpenAI**: `https://api.openai.com/v1`
- **Gemini (Google)**: `https://generativelanguage.googleapis.com/v1beta`
- **Grok (xAI)**: `https://api.x.ai/v1`

**Claude Code 预设**：
- **Claude (Anthropic)**: `https://api.anthropic.com`
- **DeepSeek**: `https://api.deepseek.com`
- **OpenRouter**: `https://openrouter.ai/api/v1`

### 完整使用示例

#### 示例 1：从 OpenAI 切换到 DeepSeek

```bash
# 1. 添加 DeepSeek
$ ccman cx add
# 选择 "使用预设模板" → "DeepSeek" → 输入 API Key

# 2. 查看列表
$ ccman cx list
📋 Codex 服务商列表 (共 2 个)
● OpenAI (当前)
○ DeepSeek

# 3. 切换到 DeepSeek
$ ccman cx use DeepSeek
✅ 已切换到: DeepSeek

# 4. 确认
$ ccman cx current
✅ 当前 Codex 服务商
名称: DeepSeek
```

#### 示例 2：管理多个 API Key

```bash
# 场景：有一个测试 Key 和一个生产 Key

# 1. 添加生产 Key
$ ccman cc add
# 自定义名称: "Claude Production"
# API Key: sk-ant-prod-xxx

# 2. 克隆创建测试配置
$ ccman cc clone
# 选择 "Claude Production"
# 新名称: "Claude Test"
# API Key: sk-ant-test-xxx

# 3. 查看列表
$ ccman cc list
📋 Claude Code 服务商列表 (共 2 个)
● Claude Production (当前)
○ Claude Test

# 4. 快速切换
$ ccman cc use "Claude Test"
```

### Desktop 使用

#### 启动应用

双击安装后的 ccman 应用。

#### 界面说明

- **顶部 Tab**：
  - `Codex`: 管理 Codex 服务商
  - `Claude`: 管理 Claude Code 服务商
  - `View Configs`: 查看原始配置文件

- **服务商列表**：
  - 绿色 `Current` 标签：当前使用的服务商
  - `Use` 按钮：切换到该服务商
  - `Edit` 按钮：编辑配置
  - `Clone` 按钮：克隆配置
  - `Remove` 按钮：删除配置

#### 基本操作

**1. 添加服务商**

- 点击左上角 `Add Provider` 按钮
- 选择预设模板或自定义配置
- 填写配置后点击 `Save`

**2. 切换服务商**

- 找到目标服务商
- 点击 `Use` 按钮
- 该服务商会显示绿色 `Current` 标签

**3. 编辑服务商**

- 点击服务商右侧的 `Edit` 按钮
- 修改配置
- 点击 `Save` 保存

**4. 克隆服务商**

- 点击 `Clone` 按钮
- 输入新名称
- 修改 API Key
- 点击 `Save`

**5. 查看配置文件**

- 点击顶部 `View Configs` 按钮
- 查看 Codex/Claude Code 的原始配置文件
- **注意**：建议使用界面操作，直接编辑可能导致格式错误

## 💡 常见问题

### 配置文件存储在哪里？

- ccman 配置：`~/.ccman/`
- Codex 配置：`~/.codex/`
- Claude Code 配置：`~/.claude/`

### 切换服务商后需要重启工具吗？

不需要。ccman 直接修改 Codex/Claude Code 的配置文件，工具会自动重新加载。

### 可以同时使用 CLI 和 Desktop 吗？

可以。CLI 和 Desktop 共享同一套配置文件（`~/.ccman/`），修改会实时同步。

### API Key 安全吗？

是的。API Key 只存储在本地配置文件中，文件权限为 `0600`（仅所有者可读写）。

### 如何删除所有配置？

```bash
rm -rf ~/.ccman ~/.codex/.ccman.json ~/.claude/.ccman.json
```

**注意**：这不会删除 Codex/Claude Code 的原始配置，只删除 ccman 的管理数据。

### 预设模板和自定义配置有什么区别？

- **预设模板**：Base URL 已预填，只需填写 API Key，快速添加常用服务商
- **自定义配置**：完全自定义，适合使用非内置服务商

## 📄 许可证

MIT

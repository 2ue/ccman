# ccman

像 NVM 管理 Node 版本一样管理 Codex 和 Claude Code 的 API 服务商配置。

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

## 🚀 使用

### CLI 使用

#### 交互式菜单

最简单的使用方式，运行后选择对应功能：

```bash
# 进入主菜单
ccman

# 进入 Codex 管理菜单
ccman cx

# 进入 Claude Code 管理菜单
ccman cc
```

#### Codex 命令

```bash
# 添加服务商
ccman cx add
# 根据提示输入：
#   - 服务商名称（如：DeepSeek）
#   - Base URL（如：https://api.deepseek.com/v1）
#   - API Key

# 列出所有服务商
ccman cx list
# 显示：
#   ID              Name        Base URL                        Current
#   codex-xxx-abc   DeepSeek    https://api.deepseek.com/v1    ✓

# 切换服务商
ccman cx use
# 选择要切换的服务商（使用方向键选择）

# 查看当前服务商
ccman cx current
# 显示当前正在使用的服务商信息

# 编辑服务商
ccman cx edit
# 选择要编辑的服务商，然后修改配置

# 删除服务商
ccman cx remove
# 选择要删除的服务商（会要求确认）

# 克隆服务商
ccman cx clone
# 选择要克隆的服务商，输入新名称
# 用于快速创建相似配置
```

#### Claude Code 命令

```bash
# 添加服务商
ccman cc add
# 根据提示输入：
#   - 服务商名称（如：Claude API）
#   - Base URL（如：https://api.anthropic.com）
#   - API Key（sk-ant-xxx）

# 列出所有服务商
ccman cc list

# 切换服务商
ccman cc use

# 查看当前服务商
ccman cc current

# 编辑服务商
ccman cc edit

# 删除服务商
ccman cc remove

# 克隆服务商
ccman cc clone
```

#### 使用预设模板

添加服务商时可以选择预设模板，快速配置常用服务商：

```bash
ccman cx add
# 选择 "Use Preset Template"
# 选择预设（如：Claude）
# 只需输入 API Key，Base URL 自动填充
```

**内置预设模板**：

- **Codex**:
  - Claude (Anthropic)
  - DeepSeek
  - OpenAI
  - Gemini (Google)
  - Grok (xAI)

- **Claude Code**:
  - Claude (Anthropic)
  - DeepSeek
  - OpenRouter

### Desktop 使用

#### 启动应用

双击安装后的 ccman 应用。

#### 基本操作

1. **添加服务商**
   - 点击左上角 "Add Provider" 按钮
   - 选择预设模板或自定义配置
   - 填写 API Key（Base URL 可选，预设会自动填充）
   - 点击 "Save" 保存

2. **切换服务商**
   - 在服务商列表中找到目标服务商
   - 点击 "Use" 按钮
   - 当前服务商会显示绿色 "Current" 标签

3. **编辑服务商**
   - 点击服务商右侧的 "Edit" 按钮
   - 修改配置（名称、Base URL、API Key）
   - 点击 "Save" 保存

4. **删除服务商**
   - 点击服务商右侧的 "Remove" 按钮
   - 确认删除

5. **克隆服务商**
   - 点击服务商右侧的 "Clone" 按钮
   - 输入新名称
   - 快速创建相似配置

6. **查看配置文件**
   - 点击顶部 "View Configs" 按钮
   - 查看和编辑 Codex/Claude Code 的原始配置文件
   - **注意**：直接编辑配置文件可能导致格式错误，建议使用界面操作

#### 切换工具

顶部有两个 Tab：
- **Codex**: 管理 Codex 服务商
- **Claude**: 管理 Claude Code 服务商

点击对应 Tab 切换管理界面。

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

## 📄 许可证

MIT

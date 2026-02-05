# 如何手动配置 Codex

## 前言

**ccman** 工具已经将 Codex 的配置切换过程完全自动化，只需一条命令即可完成服务商的切换：

```bash
ccman cx
```

但如果你想了解底层原理，或者需要手动配置 Codex（例如在 ccman 不可用的情况下），本文将详细讲解手动配置的完整流程。

---

## 配置原理

Codex 通过读取用户目录下的两个配置文件来获取 API 认证信息和服务地址：

1. **`~/.codex/config.toml`**：服务商配置和模型设置
2. **`~/.codex/auth.json`**：API 认证密钥

当你运行 Codex 时，它会：
1. 从 `config.toml` 读取当前使用的服务商名称（`model_provider`）
2. 从 `config.toml` 读取该服务商的 `base_url` 等配置
3. 从 `auth.json` 读取 API 密钥

---

## 手动配置步骤

### 第 1 步：创建配置目录

首先，确保 `.codex` 目录存在（Codex 安装后通常会自动创建，但某些情况下可能需要手动创建）：

```bash
# macOS/Linux
mkdir -p ~/.codex

# Windows (PowerShell)
mkdir $env:USERPROFILE\.codex
```

### 第 2 步：配置服务商信息（config.toml）

在 `.codex` 目录下创建或编辑 `config.toml` 文件：

```bash
# macOS/Linux
nano ~/.codex/config.toml

# 或使用你喜欢的编辑器
code ~/.codex/config.toml
```

填写以下内容（根据你的服务商信息修改）：

```toml
model_provider = "serverA"
model = "gpt-5.2-codex"
model_reasoning_effort = "high"
network_access = "enabled"
disable_response_storage = true
windows_wsl_setup_acknowledged = true
model_verbosity = "high"

[model_providers.serverA]
name = "serverA"
base_url = "https://serverA.com/v1"
wire_api = "responses"
requires_openai_auth = true
```

**关键配置项说明**：

| 字段 | 说明 | 必填 |
|------|------|------|
| `model_provider` | 当前使用的服务商名称（必须与 `[model_providers.xxx]` 中的名称一致） | ✅ 必填 |
| `model` | 使用的模型名称（如 `gpt-5.2-codex`） | ✅ 必填 |
| `model_reasoning_effort` | 模型推理强度（可选，建议保留） | ❌ 可选 |
| `network_access` | 联网能力（按 Codex 新版配置） | ❌ 可选（建议保留） |
| `disable_response_storage` | 禁用响应存储（可选，建议保留） | ❌ 可选 |
| `windows_wsl_setup_acknowledged` | Windows/WSL 初始化提示确认（建议保留） | ❌ 可选（建议保留） |
| `model_verbosity` | 输出详细度（可选，建议保留） | ❌ 可选 |
| `[model_providers.xxx]` | 服务商配置块，`xxx` 为服务商名称 | ✅ 必填 |
| `name` | 服务商名称（必须与 `model_provider` 一致） | ✅ 必填 |
| `base_url` | 服务商的 API 基础地址 | ✅ 必填 |
| `wire_api` | API 协议类型（通常为 `responses`） | ✅ 必填 |
| `requires_openai_auth` | 是否需要 OpenAI 格式认证（通常为 `true`） | ✅ 必填 |

### 第 3 步：配置 API 密钥（auth.json）

在 `.codex` 目录下创建或编辑 `auth.json` 文件：

```bash
# macOS/Linux
nano ~/.codex/auth.json
```

填写以下内容（替换为你的真实 API 密钥）：

```json
{
  "OPENAI_API_KEY": "sk-xxx"
}
```

**重要提示**：
- `OPENAI_API_KEY` 的值必须替换为服务商提供的真实 API 密钥
- 密钥格式通常为 `sk-xxx` 或 `sk-proj-xxx`

### 第 4 步：验证配置

保存文件后，重新启动 Codex 即可生效。你可以通过以下命令验证配置是否正确：

```bash
codex --version
```

---

## 配置示例

### 示例 1：使用 serverA 服务商

**config.toml**：
```toml
model_provider = "serverA"
model = "gpt-5.2-codex"
model_reasoning_effort = "high"
network_access = "enabled"
disable_response_storage = true
windows_wsl_setup_acknowledged = true
model_verbosity = "high"

[model_providers.serverA]
name = "serverA"
base_url = "https://codex-api.serverA.com/v1"
wire_api = "responses"
requires_openai_auth = true
```

**auth.json**：
```json
{
  "OPENAI_API_KEY": "sk-proj-abc123xyz456..."
}
```

### 示例 2：使用 OpenAI 官方 API

**config.toml**：
```toml
model_provider = "openai"
model = "gpt-5.2-codex"
model_reasoning_effort = "high"
network_access = "enabled"
disable_response_storage = true
windows_wsl_setup_acknowledged = true
model_verbosity = "high"

[model_providers.openai]
name = "openai"
base_url = "https://api.openai.com/v1"
wire_api = "responses"
requires_openai_auth = true
```

**auth.json**：
```json
{
  "OPENAI_API_KEY": "sk-Ov7xJ9K3..."
}
```

---

## 配置文件结构详解

### config.toml 文件详解

Codex 使用 TOML 格式存储配置（比 JSON 更易读）：

#### 1. 全局配置

```toml
model_provider = "serverA"  # 当前使用的服务商名称
model = "gpt-5.2-codex"        # 使用的模型
model_reasoning_effort = "high" # 推理强度（可选）
network_access = "enabled"      # 联网能力（可选）
disable_response_storage = true # 禁用响应存储（可选）
windows_wsl_setup_acknowledged = true # WSL 提示确认（Windows 可选）
model_verbosity = "high"        # 输出详细度（可选）
```

#### 2. 服务商配置块

```toml
[model_providers.serverA]  # 服务商名称（必须与 model_provider 一致）
name = "serverA"           # 服务商显示名称
base_url = "https://serverA.com/v1"  # API 地址
wire_api = "responses"       # API 协议
requires_openai_auth = true  # 认证方式
```

**重要特性**：
- 你可以在同一个 `config.toml` 中配置**多个服务商**
- 通过修改 `model_provider` 的值来切换服务商

### auth.json 文件详解

```json
{
  "OPENAI_API_KEY": "你的 API 密钥"
}
```

**注意**：
- 这个文件只包含一个字段：`OPENAI_API_KEY`
- 密钥必须是服务商提供的有效密钥
- 文件格式为 JSON

---

## 配置多个服务商

Codex 支持在同一个 `config.toml` 中配置多个服务商，切换服务商只需修改 `model_provider` 的值。

### 示例：配置三个服务商

**config.toml**：
```toml
# 当前使用的服务商
model_provider = "serverA"
model = "gpt-5.2-codex"
model_reasoning_effort = "high"
network_access = "enabled"
disable_response_storage = true
windows_wsl_setup_acknowledged = true
model_verbosity = "high"

# 服务商 A：serverA
[model_providers.serverA]
name = "serverA"
base_url = "https://codex-api.serverA.com/v1"
wire_api = "responses"
requires_openai_auth = true

# 服务商 B：openai
[model_providers.openai]
name = "openai"
base_url = "https://api.openai.com/v1"
wire_api = "responses"
requires_openai_auth = true

# 服务商 C：custom
[model_providers.custom]
name = "custom"
base_url = "https://api.custom.com/v1"
wire_api = "responses"
requires_openai_auth = true
```

### 切换服务商

1. **切换到 openai**：
   ```toml
   model_provider = "openai"  # 修改这一行
   ```

2. **切换到 custom**：
   ```toml
   model_provider = "custom"  # 修改这一行
   ```

3. **更新 API 密钥**（auth.json）：
   ```json
   {
     "OPENAI_API_KEY": "新服务商的密钥"
   }
   ```

4. **重启 Codex** 使配置生效

---

## 常见问题

### 1. 配置文件不存在怎么办？

**解决方法**：手动创建配置目录和文件：

```bash
# macOS/Linux
mkdir -p ~/.codex
touch ~/.codex/config.toml
touch ~/.codex/auth.json
```

然后按照上述步骤填写配置内容。

---

### 2. TOML 格式错误？

**常见错误**：
- 字符串未使用引号（`base_url = https://...` ❌）
- 配置块名称写错（`[model_provider.xxx]` ❌，应为 `[model_providers.xxx]`）
- 布尔值写错（`requires_openai_auth = "true"` ❌，应为 `true`）

**正确示例**：
```toml
model_provider = "serverA"  # ✅ 字符串需要引号
requires_openai_auth = true   # ✅ 布尔值不需要引号
```

**验证工具**：使用 [TOML Lint](https://www.toml-lint.com/) 检查格式。

---

### 3. 修改配置后不生效？

**可能原因**：
- Codex 进程未重启
- `model_provider` 名称与服务商配置块名称不匹配
- `auth.json` 中的密钥错误

**解决方法**：
1. 完全退出 Codex
2. 检查 `model_provider` 是否与 `[model_providers.xxx]` 中的名称一致
3. 检查 `auth.json` 中的密钥是否正确
4. 重新启动 Codex

---

### 4. 如何验证当前使用的服务商?

**方法 1**：检查配置文件

```bash
# macOS/Linux
cat ~/.codex/config.toml | grep model_provider
```

**方法 2**：使用 ccman 工具（如果已安装）

```bash
ccman cx current
```

---

### 5. 配置文件权限问题

如果遇到权限错误，请确保配置文件的权限正确：

```bash
# macOS/Linux
chmod 600 ~/.codex/config.toml
chmod 600 ~/.codex/auth.json
```

---

### 6. 切换服务商后需要修改 auth.json 吗？

**是的！** 不同服务商的 API 密钥通常是不同的。

切换服务商的完整步骤：
1. 修改 `config.toml` 中的 `model_provider`
2. 修改 `auth.json` 中的 `OPENAI_API_KEY`
3. 重启 Codex

如果使用 **ccman**，这个过程会自动完成。

---

## 为什么推荐使用 ccman？

手动配置虽然可行，但存在以下问题：

| 手动配置 | 使用 ccman |
|---------|-----------|
| ❌ 需要记住两个配置文件路径 | ✅ 一条命令搞定 |
| ❌ 需要同时修改 TOML 和 JSON | ✅ 自动同步更新 |
| ❌ 容易写错 TOML 格式 | ✅ 自动生成正确配置 |
| ❌ 切换服务商需要改两个文件 | ✅ `ccman cx use <id>` 即可 |
| ❌ 无法管理多个服务商 | ✅ 统一管理所有服务商 |
| ❌ 容易破坏现有配置 | ✅ 零破坏性写入 |

---

## 使用 ccman 快速配置

如果你已经安装了 **ccman**，只需以下步骤：

### 1. 添加服务商

```bash
ccman cx add
```

按提示输入服务商信息：
- 名称（如 `serverA`）
- Base URL（如 `https://codex-api.serverA.com/v1`）
- API Key（如 `sk-xxx`）

### 2. 切换服务商

```bash
ccman cx use <服务商ID>
```

ccman 会自动：
- 更新 `config.toml` 中的 `model_provider` 和服务商配置块
- 备份 `auth.json` 为 `auth.json.bak`，并覆盖写入仅包含 `OPENAI_API_KEY` 的 `auth.json`
- 备份原有配置（如果出错会自动回滚）

### 3. 查看当前服务商

```bash
ccman cx current
```

就是这么简单！

---

## 总结

- **手动配置**：适合了解底层原理，或在特殊环境下使用
- **使用 ccman**：一行命令搞定，零出错，推荐日常使用

```bash
npm install -g ccman
```

更多信息请参考：[ccman 官方文档](https://github.com/2ue/ccman)

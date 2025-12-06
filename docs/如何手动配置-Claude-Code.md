# 如何手动配置 Claude Code

## 前言

**ccman** 工具已经将 Claude Code 的配置切换过程完全自动化，只需一条命令即可完成服务商的切换：

```bash
ccman cc
```

但如果你想了解底层原理，或者需要手动配置 Claude Code（例如在 ccman 不可用的情况下），本文将详细讲解手动配置的完整流程。

---

## 配置原理

Claude Code 通过读取用户目录下的配置文件来获取 API 认证信息和服务地址。配置文件位于：

```
~/.claude/settings.json
```

当你运行 Claude Code 时，它会自动读取此文件中的环境变量配置，包括：
- API 认证令牌（ANTHROPIC_AUTH_TOKEN）
- API 基础地址（ANTHROPIC_BASE_URL）
- 其他可选配置项

---

## 手动配置步骤

### 第 1 步：创建配置目录

首先，确保 `.claude` 目录存在（Claude Code 安装后通常会自动创建，但某些情况下可能需要手动创建）：

```bash
# macOS/Linux
mkdir -p ~/.claude

# Windows (PowerShell)
mkdir $env:USERPROFILE\.claude
```

### 第 2 步：创建或编辑配置文件

在 `.claude` 目录下创建或编辑 `settings.json` 文件：

```bash
# macOS/Linux
nano ~/.claude/settings.json

# 或使用你喜欢的编辑器
code ~/.claude/settings.json
```

### 第 3 步：填写配置内容

将以下内容复制到 `settings.json` 文件中，并根据你的服务商信息修改相应字段：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-ant-xxx",
    "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1,
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": 32000
  },
  "permissions": {
    "allow": [],
    "deny": []
  }
}
```

**关键配置项说明**：

| 字段 | 说明 | 必填 |
|------|------|------|
| `ANTHROPIC_AUTH_TOKEN` | API 认证令牌，由服务商提供（格式通常为 `sk-ant-xxx`） | ✅ 必填 |
| `ANTHROPIC_BASE_URL` | API 基础地址，由服务商提供 | ✅ 必填 |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | 禁用非必要流量（可选，建议保留） | ❌ 可选 |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | 最大输出令牌数（可选，建议保留） | ❌ 可选 |

### 第 4 步：验证配置

保存文件后，重新启动 Claude Code 即可生效。你可以通过以下命令验证配置是否正确：

```bash
claude --version
```

---

## 配置示例

### 示例 1：使用官方 Anthropic API

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-ant-api03-Ov7xJ9K3...",
    "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1,
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": 32000
  },
  "permissions": {
    "allow": [],
    "deny": []
  }
}
```

---

## 切换服务商

如果你需要在多个服务商之间切换，只需修改 `settings.json` 中的两个字段：

1. **修改前（服务商 A）**：
   ```json
   {
     "env": {
       "ANTHROPIC_AUTH_TOKEN": "sk-ant-xxx-service-a",
       "ANTHROPIC_BASE_URL": "https://api.service-a.com"
     }
   }
   ```

2. **修改后（服务商 B）**：
   ```json
   {
     "env": {
       "ANTHROPIC_AUTH_TOKEN": "sk-ant-yyy-service-b",
       "ANTHROPIC_BASE_URL": "https://api.service-b.com"
     }
   }
   ```

3. **重启 Claude Code** 使配置生效

---

## 常见问题

### 1. 配置文件不存在怎么办？

**解决方法**：手动创建配置目录和文件：

```bash
# macOS/Linux
mkdir -p ~/.claude
touch ~/.claude/settings.json
```

然后按照上述步骤填写配置内容。

---

### 2. 修改配置后不生效？

**可能原因**：
- Claude Code 进程未重启
- 配置文件格式错误（JSON 语法错误）

**解决方法**：
1. 完全退出 Claude Code
2. 检查 JSON 格式是否正确（可使用 [JSONLint](https://jsonlint.com/) 验证）
3. 重新启动 Claude Code

---

### 3. 如何验证当前使用的服务商？

**方法 1**：检查配置文件

```bash
cat ~/.claude/settings.json
```

**方法 2**：使用 ccman 工具（如果已安装）

```bash
ccman current
```

---

### 4. 配置文件权限问题

如果遇到权限错误，请确保配置文件的权限正确：

```bash
# macOS/Linux
chmod 600 ~/.claude/settings.json
```

---

## 为什么推荐使用 ccman？

手动配置虽然可行，但存在以下问题：

| 手动配置 | 使用 ccman |
|---------|-----------|
| ❌ 需要记住配置文件路径 | ✅ 一条命令搞定 |
| ❌ 容易写错 JSON 格式 | ✅ 自动生成正确配置 |
| ❌ 切换服务商麻烦 | ✅ `ccman use <id>` 即可 |
| ❌ 无法管理多个服务商 | ✅ 统一管理所有服务商 |
| ❌ 容易破坏现有配置 | ✅ 零破坏性写入 |

---

## 使用 ccman 快速配置

如果你已经安装了 **ccman**，只需以下步骤：

### 1. 添加服务商

```bash
ccman add
```

按提示输入服务商信息（名称、baseUrl、apiKey）。

### 2. 切换服务商

```bash
ccman use <服务商ID>
```

### 3. 查看当前服务商

```bash
ccman current
```

就是这么简单！ccman 会自动处理配置文件的读写、备份和回滚，确保零破坏性。

---

## 总结

- **手动配置**：适合了解底层原理，或在特殊环境下使用
- **使用 ccman**：一行命令搞定，零出错，推荐日常使用

如果你需要频繁切换服务商，强烈建议安装 ccman：

```bash
npm install -g ccman
```

更多信息请参考：[ccman 官方文档](https://github.com/2ue/ccman)

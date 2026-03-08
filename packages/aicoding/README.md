# @2ue/aicoding

一键配置 GMN 到 AI 编程工具（Codex、OpenCode、OpenClaw）

## 特性

- ✅ **轻量依赖**：使用 inquirer 提供清晰的交互式选择
- ✅ **一键配置**：支持同时配置多个工具（默认 Codex + OpenCode）
- ✅ **两种模式**：保护模式（默认）+ 全覆盖模式
- ✅ **自动测速选线**：启动时测试多条 GMN 线路，默认选中当前机器延迟最低地址
- ✅ **配置保护**：保留用户现有配置，只更新认证字段
- ✅ **原子性写入**：使用临时文件 + rename，确保安全

## 安装

### 方式 1：npx（推荐，无需安装）

```bash
npx @2ue/aicoding
```

### 方式 2：全局安装

```bash
npm install -g @2ue/aicoding
aicoding
```

### 方式 3：curl 一键运行（无需安装）

```bash
curl -fsSL https://raw.githubusercontent.com/2ue/ccman/main/scripts/aicoding.sh | bash
```

说明：脚本会自动调用 `npx --yes @2ue/aicoding` 并保持交互式输入。
未显式传入 `--openai-base-url` / `--base-url` 时，会先测速候选 GMN 域名并允许手动切换。

传参示例（将参数传给 aicoding）：

```bash
curl -fsSL https://raw.githubusercontent.com/2ue/ccman/main/scripts/aicoding.sh | bash -s -- --openai-base-url https://gmn.chuangzuoli.com
```

更多用法示例：

```bash
# 直接传入 API Key
curl -fsSL https://raw.githubusercontent.com/2ue/ccman/main/scripts/aicoding.sh | bash -s -- sk-ant-xxx

# 仅配置 Codex + OpenCode
curl -fsSL https://raw.githubusercontent.com/2ue/ccman/main/scripts/aicoding.sh | bash -s -- -p codex,opencode

# 包含 OpenClaw（默认不选中）
curl -fsSL https://raw.githubusercontent.com/2ue/ccman/main/scripts/aicoding.sh | bash -s -- -p codex,opencode,openclaw

# 全覆盖模式
curl -fsSL https://raw.githubusercontent.com/2ue/ccman/main/scripts/aicoding.sh | bash -s -- --overwrite

# 指定 Codex/OpenCode 的 OpenAI Base URL
curl -fsSL https://raw.githubusercontent.com/2ue/ccman/main/scripts/aicoding.sh | bash -s -- --openai-base-url https://gmn.chuangzuoli.com
```

加速地址（任选其一，部分镜像可能随时不可用）：

```bash
# jsDelivr
curl -fsSL https://cdn.jsdelivr.net/gh/2ue/ccman@main/scripts/aicoding.sh | bash

# jsDelivr 备用域名（遇到 DNS 污染可尝试）
curl -fsSL https://fastly.jsdelivr.net/gh/2ue/ccman@main/scripts/aicoding.sh | bash
curl -fsSL https://gcore.jsdelivr.net/gh/2ue/ccman@main/scripts/aicoding.sh | bash
curl -fsSL https://testingcf.jsdelivr.net/gh/2ue/ccman@main/scripts/aicoding.sh | bash
curl -fsSL https://test1.jsdelivr.net/gh/2ue/ccman@main/scripts/aicoding.sh | bash

# ghproxy（raw 代理）
curl -fsSL https://ghproxy.com/https://raw.githubusercontent.com/2ue/ccman/main/scripts/aicoding.sh | bash
curl -fsSL https://mirror.ghproxy.com/https://raw.githubusercontent.com/2ue/ccman/main/scripts/aicoding.sh | bash

# raw 镜像
curl -fsSL https://raw.staticdn.net/2ue/ccman/main/scripts/aicoding.sh | bash
```

## 使用方式

### 保护模式（默认，推荐）

保护模式会尽量保留你的现有配置，只更新认证字段（所有已存在目标文件都会先备份，再写入）。

```bash
# 交互式输入
npx @2ue/aicoding

# 直接传入 API Key
npx @2ue/aicoding sk-ant-xxx
```

交互式流程会提示选择平台（OpenClaw 可选但默认不选中）；如需自定义 Codex/OpenCode 的 OpenAI Base URL，可通过参数指定。

**可选：指定 Codex/OpenCode 的 OpenAI Base URL**

```bash
# 使用指定 Base URL（仅影响 Codex/OpenCode）
npx @2ue/aicoding sk-ant-xxx --openai-base-url https://gmn.chuangzuoli.com
```

**保护的配置**：

- **OpenCode**: 其他 provider 配置
- **Codex**: `config.toml/auth.json` 会先备份为 `.bak`，再覆盖写入（不保留手动修改）
- **OpenCode**: 写入前会备份 `opencode.json`
- **OpenClaw**: `openclaw.json/models.json` 写入前会备份为 `.bak`，再覆盖写入

### 全覆盖模式（慎用）

全覆盖模式会使用默认配置覆盖所有字段（认证字段除外），需要手动确认。

```bash
# 交互式输入
npx @2ue/aicoding --overwrite

# 直接传入 API Key
npx @2ue/aicoding sk-ant-xxx --overwrite
```

**警告**：全覆盖模式会丢失你的自定义配置，只在以下情况使用：

- 配置文件损坏
- 需要重置为默认配置
- 确认要丢弃现有配置

## 配置的工具

| 工具         | 配置文件                                                                   | 说明                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Codex**    | `~/.codex/config.toml`<br>`~/.codex/auth.json`                             | `config.toml/auth.json` 会先备份为 `.bak` 再覆盖写入；`auth.json` 仅保留 `OPENAI_API_KEY`；`config.toml` 仅保留一个 `model_providers` |
| **OpenCode** | `~/.config/opencode/opencode.json`                                         | 更新 `provider.gmn` 配置                                                                                                              |
| **OpenClaw** | `~/.openclaw/openclaw.json`<br>`~/.openclaw/agents/main/agent/models.json` | 写入前会备份为 `.bak`，然后覆盖写入；端点使用 `https://gmn.chuangzuoli.com/v1`                                                        |

## 示例

### 首次配置

```bash
$ npx @2ue/aicoding
请输入 GMN API Key: sk-ant-xxx

🚀 开始配置...

✅ 保护模式：尽量保留现有配置；认证字段强制更新（Codex 会先备份再覆盖写入）

✅ Codex
✅ OpenCode
✅ OpenClaw（若已选择）

🎉 配置完成！
```

### 更新 API Key

```bash
$ npx @2ue/aicoding sk-ant-new-key

🚀 开始配置...

✅ 保护模式：将保留现有配置，只更新认证字段

✅ Codex
✅ OpenCode
✅ OpenClaw（若已选择）

🎉 配置完成！
```

### 重置配置（全覆盖模式）

```bash
$ npx @2ue/aicoding --overwrite
请输入 GMN API Key: sk-ant-xxx

⚠️  全覆盖模式：将使用默认配置覆盖所有字段（认证字段除外）
确认继续？(y/N): y

🚀 开始配置...

✅ Codex
✅ OpenCode

🎉 配置完成！
```

## 与 ccman 的区别

| 特性         | aicoding             | ccman                     |
| ------------ | -------------------- | ------------------------- |
| **用途**     | 一键配置 GMN         | 完整的服务商管理工具      |
| **依赖**     | 轻量依赖（inquirer） | 需要安装 ccman            |
| **功能**     | 只配置 GMN           | 管理多个服务商、CRUD 操作 |
| **使用场景** | 快速配置、临时使用   | 日常管理、频繁切换        |
| **命令**     | `npx @2ue/aicoding`  | `ccman gmn <apiKey>`      |

**推荐**：

- ✅ 使用 `@2ue/aicoding`：如果你只想快速配置 GMN
- ✅ 使用 `ccman`：如果你需要管理多个服务商

## 配置原理

### 保护模式（默认）

1. 读取现有配置文件（写入前会先备份已存在文件）
2. OpenCode：深度合并默认配置和用户配置
3. 强制更新认证字段（API Key、Base URL）
4. 使用原子性写入（临时文件 + rename）

### 全覆盖模式

1. 不读取现有配置文件
2. 使用默认配置覆盖所有字段
3. 只保留认证字段（API Key、Base URL）
4. 需要手动确认
5. 使用原子性写入（临时文件 + rename）

## 系统要求

- Node.js >= 18.0.0
- 支持的操作系统：macOS、Linux、Windows

## 故障排除

### 权限错误

如果遇到权限错误，确保配置目录有写入权限：

```bash
chmod 700 ~/.codex ~/.config/opencode ~/.openclaw
```

### 配置未生效

配置完成后，请重启对应的工具以使配置生效。

### 配置损坏

如果配置文件损坏，使用全覆盖模式重置：

```bash
npx @2ue/aicoding --overwrite
```

## 许可证

MIT

## 相关项目

- [ccman](https://github.com/your-username/ccman) - 完整的 AI 编程工具服务商管理工具

# @2ue/aicoding

一键配置 GMN 到 AI 编程工具（Codex、OpenCode、OpenClaw）。

## 当前行为

- **快捷配置入口**：默认按**覆盖写入**处理
- **默认平台**：`codex` + `opencode`
- **可选平台**：`openclaw`（默认不选中）
- **测速选线**：启动时自动测速 GMN 候选线路，可手动切换
- **写前备份**：已有目标文件会先备份，再覆盖写入

这和 `ccman gmn` / `ccman gmn1` / `ccman gmncode` 的快捷配置语义保持一致。

## 安装

### `npx`

```bash
npx @2ue/aicoding
```

### 全局安装

```bash
npm install -g @2ue/aicoding
aicoding
```

### `curl`

```bash
curl -fsSL https://raw.githubusercontent.com/2ue/ccman/main/scripts/aicoding.sh | bash
```

## 使用

### 交互式

```bash
npx @2ue/aicoding
```

### 直接传入 API Key

```bash
npx @2ue/aicoding sk-ant-xxx
```

### 指定平台

```bash
# 仅配置 Codex + OpenCode
npx @2ue/aicoding sk-ant-xxx -p codex,opencode

# 包含 OpenClaw
npx @2ue/aicoding sk-ant-xxx -p codex,opencode,openclaw

# 所有支持平台
npx @2ue/aicoding sk-ant-xxx -p all
```

### 指定 OpenAI Base URL

```bash
npx @2ue/aicoding sk-ant-xxx --openai-base-url https://gmn.chuangzuoli.com
```

### 兼容旧参数

```bash
npx @2ue/aicoding sk-ant-xxx --overwrite
```

`--overwrite` 仍可使用，但当前版本的快捷入口本身就采用覆盖写入，因此该参数只是兼容旧用法。

## 写入规则

### Codex

- 写入 `~/.codex/config.toml`
- 写入 `~/.codex/auth.json`
- 覆盖托管配置，写前备份已有文件

### OpenCode

- 写入 `~/.config/opencode/opencode.json`
- 覆盖 `provider.gmn` 及快捷配置管理的相关结构
- 写前备份已有文件

### OpenClaw

- 写入 `~/.openclaw/openclaw.json`
- 写入 `~/.openclaw/agents/main/agent/models.json`
- 端点固定为选中 OpenAI Base URL 的 `/v1`
- 写前备份已有文件

## 配置文件

| 工具 | 文件 |
| --- | --- |
| Codex | `~/.codex/config.toml` / `~/.codex/auth.json` |
| OpenCode | `~/.config/opencode/opencode.json` |
| OpenClaw | `~/.openclaw/openclaw.json` / `~/.openclaw/agents/main/agent/models.json` |

## 与 `ccman` 的区别

| 特性 | `@2ue/aicoding` | `ccman` |
| --- | --- | --- |
| 用途 | 快捷配置 GMN | 完整 provider 管理 |
| 写入语义 | 快捷覆盖 | 常规管理增量，快捷命令覆盖 |
| 适用场景 | 快速落配置 | 日常维护、切换 provider |

## 建议

- 只想快速把 GMN 落到工具配置里：用 `@2ue/aicoding`
- 需要长期维护多个 provider：用 `ccman`

# GMN 一键配置脚本（Claude Code / Codex / Gemini CLI / OpenCode）

本文档分两部分：
1) 说明 ccman 当前是如何配置四个工具的；
2) 给出一个“一键脚本”方案，用于快速把 GMN 服务商写入并切换到指定平台。

> 适用版本：仓库当前实现（以 `packages/core/src/writers/*.ts` 为准）。

---

## 一、当前项目如何配置四个工具（代码级分析）

### 1) 统一 Provider 抽象与配置落地

- **统一数据模型**：所有工具共用同一份 Provider 结构（`id/name/desc/baseUrl/apiKey/model`）。
- **统一数据源**：各工具的 Provider 列表保存在 `~/.ccman/{tool}.json`。
- **统一写入入口**：切换服务商时通过 `ToolManager.switch()` 调用对应 writer，写入各工具的官方配置文件。

对应代码：
- `packages/core/src/tool-manager.ts`
- `packages/core/src/tool-manager.types.ts`
- `packages/core/src/paths.ts`

### 2) Claude Code

- **配置路径**：`~/.claude/settings.json`
- **写入逻辑**：`packages/core/src/writers/claude.ts`
  - 读取模板（优先 `packages/core/templates/claude/settings.json`）
  - 替换 `{{apiKey}}` / `{{baseUrl}}`
  - 与用户现有配置深度合并
  - 强制覆盖认证字段：
    - `env.ANTHROPIC_AUTH_TOKEN = provider.apiKey`
    - `env.ANTHROPIC_BASE_URL = provider.baseUrl`

### 3) Codex

- **配置路径**：
  - `~/.codex/config.toml`
  - `~/.codex/auth.json`
- **写入逻辑**：`packages/core/src/writers/codex.ts`
  - 读取并深度合并模板 + 用户配置
  - 设置：
    - `model_provider = provider.name`
    - `model = provider.model || existing || 'gpt-5-codex'`
    - `model_providers[provider.name] = { base_url, wire_api, requires_openai_auth }`
  - 更新 `auth.json`：`OPENAI_API_KEY = provider.apiKey`

### 4) Gemini CLI

- **配置路径**：
  - `~/.gemini/settings.json`
  - `~/.gemini/.env`
- **写入逻辑**：`packages/core/src/writers/gemini.ts`
  - `settings.json`：确保 `ide.enabled = true`，默认 `security.auth.selectedType = gemini-api-key`
  - `.env`：
    - `provider.baseUrl` -> `GOOGLE_GEMINI_BASE_URL`
    - `provider.apiKey` -> `GEMINI_API_KEY`
    - `provider.model` -> `GEMINI_MODEL`（或 JSON 元数据写入更多 env）

### 5) OpenCode

- **配置路径**：`~/.config/opencode/opencode.json`
- **写入逻辑**：`packages/core/src/writers/opencode.ts`
  - 写入 `$schema = https://opencode.ai/config.json`
  - provider key = 由 `provider.name` 规整化得到
  - `options.baseURL = provider.baseUrl`
  - `options.apiKey = provider.apiKey`
  - `npm` 默认 `@ai-sdk/openai`（可通过 `provider.model` JSON 元数据覆盖）
  - `models` 默认包含 `gpt-5.2-codex` 变体

### 6) GMN 预设来源

GMN 的默认 baseUrl 已在内置预设中出现：
- `packages/core/src/presets/codex.ts`
- `packages/core/src/presets/gemini.ts`
- `packages/core/src/presets/opencode.ts`

统一地址：
```
https://gmn.chuangzuoli.cn/openai
```

---

## 二、一键脚本方案（需求落地）

目标：
- 只输入一次 **API Key**；
- 选择要配置的平台（可选，不输入则默认全部）；
- 自动创建/更新名为 `GMN` 的 Provider，并切换为当前生效；
- 通过现有 `@ccman/core` 的写入逻辑，确保格式与策略一致。

核心思路：
1. 使用 `createClaudeManager/createCodexManager/createGeminiManager/createOpenCodeManager`；
2. 查找是否已有名为 `GMN` 的 Provider；
3. 没有就新增，有就更新；
4. 调用 `switch()` 写入官方配置。

---

## 三、脚本实现（Node.js，零依赖）

脚本已内置在仓库：`scripts/setup-gmn.mjs`（以该文件为准）。

参数说明：
- `-k, --key <apiKey>`：GMN API Key（或使用环境变量 `GMN_API_KEY`）
- `-p, --tools <list>`：平台列表（`claude,codex,gemini,opencode` 或别名 `cc,cx,gm,oc`；也可用 `GMN_TOOLS`）
- `-h, --help`：查看帮助

---

## 四、运行方式

交互式（默认全平台）：
```
node scripts/setup-gmn.mjs
```

指定平台（逗号分隔，支持别名 `cc/cx/gm/oc`）：
```
node scripts/setup-gmn.mjs --tools codex,gemini
```

非交互（环境变量传入 Key）：
```
GMN_API_KEY=sk-xxx node scripts/setup-gmn.mjs --tools claude,opencode
```

非交互（环境变量传入 Key + 平台）：
```
GMN_API_KEY=sk-xxx GMN_TOOLS=claude,opencode node scripts/setup-gmn.mjs
```

查看帮助：
```
node scripts/setup-gmn.mjs --help
```

---

## 五、脚本影响的配置文件

执行后会写入/更新：
- `~/.ccman/codex.json`
- `~/.ccman/claude.json`
- `~/.ccman/gemini.json`
- `~/.ccman/opencode.json`
- `~/.codex/config.toml`
- `~/.codex/auth.json`
- `~/.claude/settings.json`
- `~/.gemini/settings.json`
- `~/.gemini/.env`
- `~/.config/opencode/opencode.json`

---

## 六、后续可选增强

如果希望把该脚本正式纳入项目（例如 `ccman gmn setup` 子命令），建议先走 OpenSpec 变更流程，然后把脚本内逻辑合并进 CLI。

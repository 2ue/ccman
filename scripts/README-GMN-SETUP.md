# GMN 配置脚本使用说明（更新版）

本目录包含两个 GMN 快速配置脚本，分别适用于不同场景。

---

## 📦 脚本 1：setup-gmn.mjs（基于 ccman）

### 特点
- ✅ 使用 ccman 的 ToolManager API
- ✅ 配置会被 ccman 管理（可通过 `ccman list` 查看）
- ✅ 支持后续通过 ccman 切换服务商
- ✅ 代码简洁（74 行）
- ✅ **默认保护模式**：保留用户现有配置

### 依赖
需要先构建 core 包：
```bash
pnpm build
```

### 使用方法

**交互式输入**：
```bash
node scripts/setup-gmn.mjs
```

**直接传入 API Key**：
```bash
node scripts/setup-gmn.mjs sk-ant-xxx
```

### 配置策略

**保护模式（默认）**：
- ✅ 深度合并现有配置
- ✅ 只更新认证字段（apiKey, baseUrl）
- ✅ 保留用户的其他配置（permissions, features 等）

---

## 🔧 脚本 2：setup-gmn-standalone.mjs（独立版本）

### 特点
- ✅ 零依赖（只使用 Node.js 内置 API）
- ✅ 不需要构建 ccman
- ✅ 直接修改工具配置文件
- ✅ **支持两种模式**：保护模式（默认）和全覆盖模式
- ❌ 配置不会被 ccman 管理
- ⚠️ 代码较长（436 行，包含所有 Writer 逻辑）

### 依赖
无需任何依赖，直接运行。

### 使用方法

#### 保护模式（默认，推荐）

**交互式输入**：
```bash
node scripts/setup-gmn-standalone.mjs
```

**直接传入 API Key**：
```bash
node scripts/setup-gmn-standalone.mjs sk-ant-xxx
```

**输出示例**：
```
🚀 GMN 快速配置工具（独立版本）

✅ 保护模式：将保留现有配置，只更新认证字段

开始配置...

✅ Claude Code
✅ Codex
✅ Gemini CLI
✅ OpenCode

🎉 GMN 配置完成！
```

#### 全覆盖模式（慎用）

**交互式输入**：
```bash
node scripts/setup-gmn-standalone.mjs --overwrite
```

**直接传入 API Key**：
```bash
node scripts/setup-gmn-standalone.mjs sk-ant-xxx --overwrite
```

**输出示例**：
```
🚀 GMN 快速配置工具（独立版本）

⚠️  全覆盖模式：将使用默认配置覆盖所有字段（认证字段除外）
确认继续？(y/N): y

开始配置...

✅ Claude Code
✅ Codex
✅ Gemini CLI
✅ OpenCode

🎉 GMN 配置完成！
```

### 两种模式对比

| 特性 | 保护模式（默认） | 全覆盖模式 |
|------|-----------------|-----------|
| **现有配置** | ✅ 保留 | ❌ 覆盖 |
| **认证字段** | ✅ 更新 | ✅ 更新 |
| **其他字段** | ✅ 保留 | ❌ 使用默认值 |
| **适用场景** | 日常使用 | 配置损坏/重置 |
| **安全性** | ✅ 高 | ⚠️ 低（需确认） |

### 配置策略详解

#### 保护模式（默认）

**Claude Code**：
```javascript
// 读取现有配置
let userConfig = JSON.parse(fs.readFileSync('~/.claude/settings.json'))

// 深度合并：默认配置为基础，用户配置覆盖
let finalConfig = deepMerge(defaultConfig, userConfig)

// 强制更新认证字段
finalConfig.env.ANTHROPIC_AUTH_TOKEN = apiKey
finalConfig.env.ANTHROPIC_BASE_URL = GMN_BASE_URL

// 保留：permissions, 其他 env 变量
```

**Codex**：
```javascript
// 读取现有 config.toml
let tomlContent = fs.readFileSync('~/.codex/config.toml')

// 只更新 model_provider 和 [model_providers.gmn]
// 保留：model_reasoning_effort, features, profiles 等

// 读取现有 auth.json
let auth = JSON.parse(fs.readFileSync('~/.codex/auth.json'))

// 只更新 OPENAI_API_KEY
// 保留：其他认证字段
```

**Gemini CLI**：
```javascript
// 读取现有 settings.json
let settings = JSON.parse(fs.readFileSync('~/.gemini/settings.json'))

// 确保 ide.enabled = true
// 保留：其他 settings 字段

// 读取现有 .env
let env = loadEnvFile('~/.gemini/.env')

// 更新：GEMINI_API_KEY, GOOGLE_GEMINI_BASE_URL, GEMINI_MODEL
// 保留：其他环境变量
```

**OpenCode**：
```javascript
// 读取现有 opencode.json
let config = JSON.parse(fs.readFileSync('~/.config/opencode/opencode.json'))

// 只更新 provider.gmn
// 保留：其他 provider 配置
```

#### 全覆盖模式

**Claude Code**：
```javascript
// 使用默认配置，不读取现有配置
let finalConfig = {
  env: {
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_BASE_URL: GMN_BASE_URL,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
    CLAUDE_CODE_MAX_OUTPUT_TOKENS: 32000,
  },
  permissions: { allow: [], deny: [] },
}

// 丢失：用户的 permissions 配置、其他 env 变量
```

**Codex**：
```javascript
// 不读取现有 config.toml，创建新配置
// 只包含：model_provider 和 [model_providers.gmn]

// 不读取现有 auth.json，创建新配置
// 只包含：OPENAI_API_KEY

// 丢失：所有用户自定义配置
```

**Gemini CLI**：
```javascript
// 不读取现有 settings.json，创建新配置
// 只包含：ide.enabled, security.auth.selectedType

// 不读取现有 .env，创建新配置
// 只包含：GEMINI_API_KEY, GOOGLE_GEMINI_BASE_URL, GEMINI_MODEL

// 丢失：所有用户自定义配置
```

**OpenCode**：
```javascript
// 不读取现有 opencode.json，创建新配置
// 只包含：provider.gmn

// 丢失：其他 provider 配置
```

---

## 🤔 如何选择

### 使用 setup-gmn.mjs（推荐）

**适用场景**：
- ✅ 你已经安装了 ccman
- ✅ 你希望通过 ccman 统一管理服务商
- ✅ 你需要频繁切换服务商

**优势**：
- 配置被 ccman 管理，可以随时切换
- 代码简洁，易于维护
- 符合项目设计理念
- 默认保护模式，安全可靠

### 使用 setup-gmn-standalone.mjs（保护模式）

**适用场景**：
- ✅ 你没有安装 ccman（或不想安装）
- ✅ 你只需要一次性配置 GMN
- ✅ 你希望脚本完全独立运行
- ✅ 你希望保留现有配置

**优势**：
- 零依赖，开箱即用
- 不需要构建 ccman
- 可以单独分发给其他用户
- 保护模式保证配置安全

### 使用 setup-gmn-standalone.mjs（全覆盖模式）

**适用场景**：
- ⚠️ 你的配置文件损坏
- ⚠️ 你想重置为默认配置
- ⚠️ 你确认要丢弃现有配置

**警告**：
- ❌ 会丢失所有用户自定义配置
- ❌ 需要手动确认才能执行
- ❌ 不推荐日常使用

---

## 📊 完整对比表

| 特性 | setup-gmn.mjs | setup-gmn-standalone.mjs<br>（保护模式） | setup-gmn-standalone.mjs<br>（全覆盖模式） |
|------|---------------|----------------------------------------|------------------------------------------|
| **依赖** | 需要 ccman core | 零依赖 | 零依赖 |
| **代码量** | 74 行 | 436 行 | 436 行 |
| **构建要求** | 需要 `pnpm build` | 无 | 无 |
| **ccman 管理** | ✅ 支持 | ❌ 不支持 | ❌ 不支持 |
| **后续切换** | ✅ 通过 ccman | ❌ 手动修改 | ❌ 手动修改 |
| **保留配置** | ✅ 是 | ✅ 是 | ❌ 否 |
| **安全性** | ✅ 高 | ✅ 高 | ⚠️ 低（需确认） |
| **适用场景** | ccman 用户 | 非 ccman 用户 | 配置重置 |

---

## ⚠️ 注意事项

### 1. 配置保护

**两个脚本的保护模式都会**：
- ✅ 保留用户的其他配置（深度合并）
- ✅ 强制覆盖认证字段（apiKey, baseUrl）
- ✅ 使用原子性写入（临时文件 + rename）

**不会丢失**：
- Claude Code 的 `permissions` 配置
- Codex 的 `features` 配置
- Gemini CLI 的其他环境变量
- OpenCode 的其他 provider 配置

**全覆盖模式会丢失**：
- ❌ 所有用户自定义配置
- ❌ 只保留默认配置 + 认证字段

### 2. 配置冲突

**如果同时使用两个脚本**：
- `setup-gmn.mjs` 会创建 ccman 配置 + 工具配置
- `setup-gmn-standalone.mjs` 只修改工具配置

**结果**：
- ccman 认为当前服务商是 GMN
- 工具配置也是 GMN
- 没有冲突，但 ccman 配置可能与工具配置不同步

**建议**：
- 选择一个脚本使用，不要混用
- 如果使用 ccman，统一通过 ccman 管理

### 3. 工具重启

**配置完成后，需要重启工具**：
- Claude Code：重启 VS Code 或重新加载窗口
- Codex：重启终端或重新运行 `codex`
- Gemini CLI：重启终端或重新运行 `gemini`
- OpenCode：重启 VS Code 或重新加载窗口

### 4. 全覆盖模式警告

**使用全覆盖模式前，请确认**：
- ❌ 你确认要丢弃所有现有配置
- ❌ 你已经备份了重要配置
- ❌ 你理解这是不可逆操作

**脚本会要求确认**：
```
⚠️  全覆盖模式：将使用默认配置覆盖所有字段（认证字段除外）
确认继续？(y/N):
```

**只有输入 `y` 才会继续执行。**

---

## 🚀 快速开始

### 场景 1：我是 ccman 用户

```bash
# 1. 构建 core 包（如果还没构建）
pnpm build

# 2. 运行脚本
node scripts/setup-gmn.mjs

# 3. 输入 API Key
请输入 GMN API Key: sk-ant-xxx

# 4. 完成！
✅ Claude Code
✅ Codex
✅ Gemini CLI
✅ OpenCode

# 5. 验证配置
ccman claude current
```

### 场景 2：我不是 ccman 用户（保护模式）

```bash
# 1. 直接运行脚本（无需构建）
node scripts/setup-gmn-standalone.mjs

# 2. 输入 API Key
请输入 GMN API Key: sk-ant-xxx

# 3. 完成！
✅ 保护模式：将保留现有配置，只更新认证字段

✅ Claude Code
✅ Codex
✅ Gemini CLI
✅ OpenCode

# 4. 验证配置
cat ~/.claude/settings.json
cat ~/.codex/config.toml
```

### 场景 3：配置损坏，需要重置（全覆盖模式）

```bash
# 1. 运行脚本（全覆盖模式）
node scripts/setup-gmn-standalone.mjs --overwrite

# 2. 输入 API Key
请输入 GMN API Key: sk-ant-xxx

# 3. 确认操作
⚠️  全覆盖模式：将使用默认配置覆盖所有字段（认证字段除外）
确认继续？(y/N): y

# 4. 完成！
✅ Claude Code
✅ Codex
✅ Gemini CLI
✅ OpenCode
```

---

## 📝 总结

**推荐使用 setup-gmn.mjs**：
- 如果你是 ccman 用户
- 如果你需要管理多个服务商
- 如果你希望代码简洁易维护

**使用 setup-gmn-standalone.mjs（保护模式）**：
- 如果你不想安装 ccman
- 如果你只需要一次性配置
- 如果你需要分发给其他用户
- 如果你希望保留现有配置

**使用 setup-gmn-standalone.mjs（全覆盖模式）**：
- 如果你的配置文件损坏
- 如果你想重置为默认配置
- 如果你确认要丢弃现有配置

**两个脚本都遵循**：
- ✅ 简洁至上（没有别名、环境变量、复杂参数）
- ✅ 零破坏性（保护模式保留用户配置）
- ✅ 直接清晰（一眼看懂在做什么）
- ✅ 原子性写入（临时文件 + rename）

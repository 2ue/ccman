# ccman 项目开发规范

## 项目简介

ccman 是一个 API 服务商配置管理工具，用于管理 Codex 和 Claude Code 的服务商配置。

**核心价值**：像 NVM 管理 Node 版本一样管理 AI 服务商配置。

**交付形式**：
- CLI：命令行工具（快速切换，可脚本化）
- Desktop：Electron 图形界面（可视化管理，直观）

**目标用户**：使用 Codex/Claude Code 的开发者。

## 核心设计原则

### 1. 简洁至上（Simplicity First）

> "If you need more than 3 levels of indentation, you're screwed, and should fix your program." - Linus Torvalds

- **每个函数**：只做一件事，代码量 < 50 行
- **每个文件**：单一职责，代码量 < 300 行
- **整个项目**：Phase 1 总代码量目标 < 800 行（含注释）

### 2. 数据结构优先（Data Structures First）

> "Bad programmers worry about the code. Good programmers worry about data structures and their relationships." - Linus Torvalds

- 先设计数据结构（`types.ts`），再实现逻辑
- 数据结构正确了，代码自然简洁
- 参考：`docs/技术架构.md` 中的核心数据结构

### 3. 零破坏性（Never Break Userspace）

- 只修改我们管理的配置字段
- 保留用户的其他自定义配置
- 写入前备份，失败时回滚
- 参考：`docs/技术架构.md` 中的 Writers 模块实现

### 4. 实用主义（Pragmatism Over Perfection）

- 解决当前问题，不为假想的未来过度设计
- 先做 CLI，证明需求后再做 GUI
- 直接硬编码 2 个函数，不搞抽象层
- YAGNI（You Aren't Gonna Need It）原则

### 5. 直接硬编码（No Premature Abstraction）

- 只有 2 个目标工具（Codex 和 Claude），直接写 2 个函数
- 不需要"抽象写入层"或"策略模式"
- 如果有第 3 个工具，再加 1 个函数（成本低）
- 参考：`docs/需求分析.md` 中的批判

## 明确禁止的事情

### ❌ 禁止 1：抽象写入层

**错误示例**：
```typescript
// ❌ 不要这样做
interface ConfigWriter {
  write(provider: Provider): void
}

class CodexWriter implements ConfigWriter { ... }
class ClaudeWriter implements ConfigWriter { ... }
```

**正确做法**：
```typescript
// ✅ 直接硬编码
export function writeCodexConfig(provider: Provider) { ... }
export function writeClaudeConfig(provider: Provider) { ... }
```

### ❌ 禁止 2：胶水层（如果做 GUI）

**错误示例**：
```typescript
// ❌ 不要为了"可能迁移 Tauri"搞胶水层
interface PlatformAdapter {
  readFile(path: string): string
  writeFile(path: string, content: string): void
}
```

**正确做法**：
```typescript
// ✅ Desktop 直接依赖 core，直接用 Electron IPC
import { switchProvider } from '@ccman/core'

ipcMain.handle('switch-provider', async (event, id) => {
  switchProvider(id)
})
```

### ❌ 禁止 3：复杂的配置格式

- **禁止**：YAML、TOML、XML 用于 ccman 自身配置
- **允许**：只用 JSON（零依赖、标准化）
- **例外**：TOML 仅用于解析 Codex 配置（必需）

### ❌ 禁止 4：过度的错误处理

**错误示例**：
```typescript
// ❌ 不要为每个可能的错误创建类
class InvalidBaseUrlError extends Error { ... }
class InvalidApiKeyError extends Error { ... }
class InvalidProviderTypeError extends Error { ... }
```

**正确做法**：
```typescript
// ✅ 只为关键错误创建类，其他用普通 Error
export class ConfigNotFoundError extends Error { ... }
export class ProviderNotFoundError extends Error { ... }

// 其他错误直接 throw new Error('xxx')
if (!isValidUrl(baseUrl)) {
  throw new Error(`Invalid baseUrl: ${baseUrl}`)
}
```

### ❌ 禁止 5：不必要的依赖

**禁止引入**：
- lodash（用原生 JS）
- axios（不需要 HTTP 请求）
- fs-extra（内置 fs 够用）
- moment/date-fns（只需要 `Date.now()`）
- dotenv（直接读取配置文件）

**允许的依赖**：参考 `docs/技术选型.md`

### ❌ 禁止 6：异步 I/O（配置文件读写）

**错误示例**：
```typescript
// ❌ 不要用异步
export async function loadConfig(): Promise<Config> {
  const content = await fs.promises.readFile(configPath, 'utf-8')
  return JSON.parse(content)
}
```

**正确做法**：
```typescript
// ✅ 用同步（配置文件小，< 1ms）
export function loadConfig(): Config {
  const content = fs.readFileSync(configPath, 'utf-8')
  return JSON.parse(content)
}
```

**理由**：
- 配置文件 < 50KB，同步读取 < 1ms
- 同步代码更简单，没有 Promise/async/await 复杂性
- CLI 工具不需要高并发

### ❌ 禁止 7：复杂的状态管理（如果做 GUI）

**错误示例**：
```typescript
// ❌ 不要引入 Zustand/Redux
import create from 'zustand'

const useStore = create((set) => ({ ... }))
```

**正确做法**：
```typescript
// ✅ 用 React state（功能简单，够用）
const [providers, setProviders] = useState<Provider[]>([])
```

## 代码规范

### 文件组织

```
packages/core/src/
├── types.ts          # 所有类型定义（单一来源）
├── config.ts         # 配置文件读写
├── providers.ts      # 服务商 CRUD
├── presets.ts        # 预设模板（硬编码）
├── writers/
│   ├── codex.ts     # 硬编码 Codex 写入逻辑
│   └── claude.ts    # 硬编码 Claude 写入逻辑
└── utils/
    ├── file.ts      # 文件操作（备份、回滚）
    └── validator.ts # 格式验证（URL、API Key）
```

### 命名规范

**文件名**：
- 小写 + 中划线：`config-manager.ts`（如果需要多个单词）
- 优先单个单词：`config.ts`、`providers.ts`

**函数名**：
- 动词开头：`loadConfig()`、`saveConfig()`、`addProvider()`
- 布尔函数：`isValidUrl()`、`hasProvider()`

**类型名**：
- PascalCase：`Provider`、`Config`、`ToolType`
- 接口不需要 `I` 前缀（TypeScript 惯例）

### 注释规范

**只为复杂逻辑添加注释**：

```typescript
// ✅ 好注释（解释为什么）
// 使用 rename 而不是 write，保证原子性
fs.renameSync(tempPath, configPath)

// ❌ 坏注释（重复代码）
// 读取配置文件
const config = loadConfig()
```

**不需要 JSDoc**（除非发布 npm 包）：
- TypeScript 类型已经是最好的文档
- 过度的 JSDoc 增加维护成本

### 错误处理

**三层错误处理**：

1. **Core 层**：抛出结构化错误
   ```typescript
   export class ProviderNotFoundError extends Error {
     constructor(id: string) {
       super(`Provider not found: ${id}`)
       this.name = 'ProviderNotFoundError'
     }
   }
   ```

2. **CLI 层**：捕获错误，友好提示
   ```typescript
   try {
     switchProvider(id)
     console.log(chalk.green('✅ 切换成功'))
   } catch (error) {
     if (error instanceof ProviderNotFoundError) {
       console.error(chalk.red(`❌ ${error.message}`))
       console.log(chalk.blue('💡 查看所有服务商: ccman list'))
     } else {
       console.error(chalk.red(`❌ ${error.message}`))
     }
     process.exit(1)
   }
   ```

3. **文件操作**：备份 + 回滚
   ```typescript
   const backupPath = `${configPath}.bak`
   fs.copyFileSync(configPath, backupPath)

   try {
     fs.writeFileSync(tempPath, content)
     fs.renameSync(tempPath, configPath)
   } catch (error) {
     fs.copyFileSync(backupPath, configPath)
     throw error
   }
   ```

### 测试规范

**测试覆盖率目标**：> 80%

#### 环境保护规则（重要！）

**禁止改动生产环境**：
- ❌ **绝对禁止**删除或修改 `~/.ccman`（正式环境配置）
- ❌ **绝对禁止**删除或修改 `~/.codex`（正式环境配置）
- ❌ **绝对禁止**删除或修改 `~/.claude`（正式环境配置）
- ❌ **绝对禁止**在测试中使用 `rm -rf ~` 开头的命令

**使用开发环境测试**：
- ✅ CLI/Desktop 手动测试时使用 `NODE_ENV=development`
- ✅ 开发环境路径：`/var/folders/.../ccman-dev/.ccman`
- ✅ 测试前清理：`rm -rf /var/folders/.../ccman-dev/.ccman`
- ✅ 获取开发路径：
  ```typescript
  import { getCcmanDir } from '@ccman/core'
  // NODE_ENV=development 时自动返回开发路径
  ```

**使用测试环境（自动）**：
- ✅ 单元测试（Vitest）自动使用独立的测试目录
- ✅ 每个测试进程有独立的配置目录（基于 PID）
- ✅ 测试路径：`/tmp/ccman-test-{PID}/.ccman`
- ✅ 测试结束后自动清理（可选）

**测试前检查清单**：
```bash
# ❌ 错误示例 - 会破坏生产环境
rm -rf ~/.ccman
pnpm dev list

# ✅ 正确示例 - 使用开发环境
rm -rf /var/folders/.../ccman-dev/.ccman
NODE_ENV=development pnpm dev list

# ✅ 正确示例 - 运行单元测试（自动隔离）
pnpm test
```

#### 单元测试规范

**必须测试**：
- Core 模块所有公开函数
- 边界情况（配置文件不存在、格式错误、权限错误）

**不需要测试**：
- CLI 交互式输入（手动测试）
- 文件系统操作（集成测试）

**示例**：
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { addProvider, getProvider } from './providers'

describe('providers', () => {
  beforeEach(() => {
    // 重置配置（自动使用测试环境）
  })

  it('should add provider with auto-generated id', () => {
    const provider = addProvider({
      name: 'Test',
      type: 'claude',
      baseUrl: 'https://api.test.com',
      apiKey: 'sk-ant-test',
    })

    expect(provider.id).toMatch(/^claude-\d+-[a-z0-9]+$/)
    expect(provider.createdAt).toBeGreaterThan(0)
  })
})
```

## 关键技术约束

### 1. Node.js 版本

- **最低要求**：Node.js >= 18.0.0
- **理由**：LTS 版本、原生 ESM 支持

### 2. 配置文件路径

```typescript
// 使用 os.homedir() 而不是硬编码
import os from 'os'
import path from 'path'

const CCMAN_DIR = path.join(os.homedir(), '.ccman')
const CODEX_DIR = path.join(os.homedir(), '.codex')
const CLAUDE_DIR = path.join(os.homedir(), '.claude')
```

### 3. 文件权限

```typescript
// 初始化时设置权限
fs.mkdirSync(configDir, { recursive: true, mode: 0o700 })
fs.writeFileSync(configPath, content, { mode: 0o600 })
```

### 4. 原子性写入

```typescript
// 写入临时文件 → rename（原子操作）
const tempPath = `${configPath}.tmp`
fs.writeFileSync(tempPath, content)
fs.renameSync(tempPath, configPath)
```

### 5. 零破坏性写入

**Codex 配置**：
```typescript
// ✅ 只更新管理的字段
config.model_provider = provider.name
config.model_providers[provider.name] = { ... }

// ✅ 保留其他字段
// - model_reasoning_effort
// - disable_response_storage
// - 其他用户自定义配置
```

**Claude 配置**：
```typescript
// ✅ 只更新 env 中的两个字段
settings.env.ANTHROPIC_AUTH_TOKEN = provider.apiKey
settings.env.ANTHROPIC_BASE_URL = provider.baseUrl

// ✅ 保留其他字段
// - permissions
// - CLAUDE_CODE_MAX_OUTPUT_TOKENS
// - 其他用户自定义配置
```

## 开发流程

### 并行开发计划（6周）

**Week 1：Core 基础**
- [ ] 初始化 Monorepo（pnpm workspace）
- [ ] 实现 `types.ts`（数据结构定义）
- [ ] 实现 `config.ts`（配置读写）
- [ ] 实现 `providers.ts`（基础 CRUD）
- [ ] 实现 `writers/codex.ts`
- [ ] 实现 `writers/claude.ts`
- [ ] 单元测试
- **里程碑**：core 模块可独立测试

**Week 2：Core 完善 + CLI 开始**
- [ ] 完善 core（`utils/validator.ts`, `utils/file.ts`）
- [ ] 错误处理和边界情况
- [ ] CLI 框架搭建（Commander.js）
- [ ] 实现 CLI 基本命令（`add`, `list`, `use`, `current`）
- **里程碑**：CLI 基本可用，可发布 alpha 版本

**Week 3：CLI 完善 + Desktop 开始**
- [ ] CLI 所有命令（`edit`, `remove`, `init`）
- [ ] CLI 测试和文档
- [ ] Desktop 框架搭建
  - [ ] Electron 窗口配置
  - [ ] IPC 处理器（直接调用 core）
  - [ ] Preload script（安全桥接）
- [ ] Desktop 基本界面（列表显示）
- **里程碑**：CLI 功能完整，Desktop 能启动

**Week 4-5：并行完善**
- **CLI 方向**：
  - [ ] 优化交互体验
  - [ ] 完善错误提示
  - [ ] 打包（npm）
  - [ ] 编写用户文档

- **Desktop 方向**：
  - [ ] 实现所有 UI 组件
    - [ ] ProviderList
    - [ ] ProviderForm
    - [ ] CurrentStatus
    - [ ] Header
  - [ ] 实现所有交互逻辑
  - [ ] 样式美化
- **里程碑**：CLI 和 Desktop 功能完整

**Week 6：集成测试和发布**
- [ ] 集成测试（CLI + Desktop 共享 core）
- [ ] 跨平台测试（macOS/Windows/Linux）
- [ ] 打包
  - [ ] CLI: npm publish
  - [ ] Desktop: dmg/exe/AppImage
- [ ] 编写发布说明
- **里程碑**：正式发布 v1.0.0

### 模块开发优先级

**优先级 P0（必须）**：
1. Core 模块（基础）
2. CLI 核心命令
3. Desktop 主界面和基本操作

**优先级 P1（重要）**：
1. CLI 高级命令（edit, validate）
2. Desktop 设置页面
3. 错误处理完善

**优先级 P2（可选）**：
1. 系统托盘（Desktop）
2. 自动更新（Desktop）
3. 配置导入/导出

### Desktop 开发规范

#### Electron 安全最佳实践

**必须遵守**：
```typescript
// ✅ 主进程窗口配置
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,       // 必须：隔离上下文
    nodeIntegration: false,         // 必须：禁用 Node 集成
    preload: path.join(__dirname, 'preload.js'),
  }
})

// ✅ Preload script
contextBridge.exposeInMainWorld('electronAPI', {
  // 只暴露必要的 API，不暴露整个 ipcRenderer
  switchProvider: (id: string) => ipcRenderer.invoke('switch-provider', id),
})
```

#### 不需要的抽象层

**❌ 错误**：
```typescript
// 不要搞 API 抽象层
interface DesktopAPI {
  switchProvider(id: string): Promise<void>
}
class ElectronAPI implements DesktopAPI { ... }
```

**✅ 正确**：
```typescript
// Desktop 主进程直接调用 core
import { switchProvider } from '@ccman/core'
ipcMain.handle('switch-provider', (e, id) => switchProvider(id))
```

#### React 组件规范

- **状态管理**：使用 React `useState`（不需要 Redux/Zustand）
- **UI 组件**：自己写（不需要 Ant Design/MUI）
- **样式**：简单 CSS 或 Tailwind（不需要 CSS-in-JS）
- **路由**：不需要（单页应用）

## 提交规范

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**：
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 重构（不改变功能）
- `docs`: 文档更新
- `test`: 测试
- `chore`: 构建/工具

**示例**：
```
feat(core): add provider management

- Add addProvider, getProvider, removeProvider functions
- Implement provider ID generation
- Add validation for baseUrl and apiKey

Closes #1
```

### 提交策略

- **小步提交**：每个功能完成后立即提交
- **不要累积**：不要等多个功能完成后一起提交
- **清晰描述**：说明做了什么、为什么做

## 发布规范

### 版本号

遵循语义化版本（Semantic Versioning）：

- **Major (x.0.0)**：破坏性变更（如配置文件格式变更）
- **Minor (0.x.0)**：新功能（如添加新命令）
- **Patch (0.0.x)**：Bug 修复

### 发布流程

1. 更新 CHANGELOG.md
2. 更新 package.json 版本号
3. 运行测试：`pnpm test`
4. 构建：`pnpm build`
5. 发布：`pnpm publish`

## 常见问题

### Q: 为什么不用抽象写入层？

**A**: 只有 2 个目标工具，抽象层会增加 50% 复杂度，收益低。直接硬编码 2 个函数更简单。参考 `docs/需求分析.md`。

### Q: 为什么配置文件用 JSON 而不是 YAML？

**A**: JSON 零依赖、标准化、可编程。YAML 缩进地狱、需要依赖库。参考 `docs/技术选型.md`。

### Q: 为什么不立即做 GUI？

**A**: 先验证需求。CLI 开发周期 2 周，Electron 开发周期 4-6 周。先做 CLI 证明价值。参考 `docs/需求分析.md`。

### Q: 如果要支持第 3 个工具（如 Cursor）怎么办？

**A**:
1. 在 `writers/` 添加 `cursor.ts`
2. 实现 `writeCursorConfig()`
3. 在 `switchProvider()` 添加分支
4. 成本：~50 行代码，不需要重构

### Q: 为什么用同步 I/O？

**A**: 配置文件小（< 50KB），同步读取 < 1ms。同步代码更简单，没有 Promise/async/await 复杂性。CLI 工具不需要高并发。

## 开发忠实性规则

### 🔒 强制规则：防止需求偏移

**当会话超长被压缩或新会话开始时，必须执行以下检查流程：**

#### 1. 开发前强制阅读（MUST READ）

```bash
# 每次开始开发前，必须先阅读这些文档
1. docs/需求分析.md      # 理解核心问题和设计决策
2. docs/功能清单.md      # 确认功能范围和禁止项
3. docs/技术选型.md      # 确认技术栈和拒绝项
4. docs/技术架构.md      # 理解模块设计和数据流
5. CLAUDE.md            # 本文件，开发规范
```

**强制检查清单**：
- [ ] 是否阅读了所有 4 个文档？
- [ ] 是否理解了"拒绝的需求"和原因？
- [ ] 是否确认了当前任务在功能清单中？
- [ ] 是否遵守技术选型中的"禁止项"？

#### 2. 开发决策验证流程

**每当要做技术决策时，按此流程验证：**

```
问题：我需要使用 XXX 库/模式/架构

Step 1: 检查 docs/技术选型.md 中的"不选择的技术"
└─> 如果在拒绝列表中 → ❌ 停止，使用文档中的正确方案

Step 2: 检查 docs/需求分析.md 中的"过度设计的需求"
└─> 如果属于被批判的设计 → ❌ 停止，重新思考

Step 3: 问自己 Linus 的三个问题
├─> 这是真问题还是臆想出来的？
├─> 有更简单的方法吗？
└─> 会破坏什么吗？

Step 4: 检查依赖必要性
└─> 能用原生 API 实现吗？
    └─> 能 → ❌ 不引入依赖
    └─> 不能 → 继续 Step 5

Step 5: 检查代码复杂度
└─> 这个方案增加了多少代码？
    └─> > 50 行 → 重新设计
    └─> < 50 行 → ✅ 可以继续
```

#### 3. 禁止项快速检查表

**在写任何代码前，检查是否违反以下禁止项：**

| 禁止项 | 说明 | 文档位置 |
|--------|------|----------|
| ❌ fs-extra | 省 1 行代码，引入 4 个依赖 | `docs/技术选型.md:126-160` |
| ❌ dotenv | NODE_ENV 零依赖零配置 | `docs/技术选型.md:192-264` |
| ❌ 配置文件分离 | 性能慢 17 倍，复杂度 +3 倍 | `docs/技术选型.md:315-380` |
| ❌ 抽象写入层 | 只有 2 个工具，YAGNI | `docs/需求分析.md:40-55` |
| ❌ Electron 胶水层 | UI 简单，抽象层占比 40% | `docs/需求分析.md:56-71` |
| ❌ validate/backup/restore 命令 | 无实际价值 | `docs/功能清单.md:44-54` |
| ❌ 预设管理仅 UI 支持 | 违反功能对等原则 | `docs/需求分析.md:84-100` |
| ❌ 异步 I/O（配置读写） | 配置小，同步更简单 | `CLAUDE.md:136-160` |
| ❌ Zustand/Redux | React state 够用 | `CLAUDE.md:161-176` |

#### 4. 功能开发验证清单

**开发任何功能前，确认：**

```typescript
// ✅ 在开始编码前，回答这些问题：

1. 这个功能在 docs/功能清单.md 中吗？
   └─> 否 → ❌ 停止，可能是需求偏移

2. 这个功能是否在"不需要的功能"列表中？
   └─> 是 → ❌ 停止，已被明确拒绝

3. 实现方式是否符合 docs/技术架构.md？
   └─> 否 → ❌ 停止，重新理解架构

4. 使用的库是否在 docs/技术选型.md 的允许列表中？
   └─> 否 → ❌ 停止，检查是否在拒绝列表

5. 代码是否 < 50 行/函数，< 300 行/文件？
   └─> 否 → ❌ 停止，重新设计

6. 是否引入了新的依赖？
   └─> 是 → 必须在 docs/技术选型.md 中找到明确允许
```

#### 5. 压缩会话恢复协议

**当会话被压缩或开始新会话时，必须执行：**

```bash
# 第一步：重新建立上下文
1. 阅读 docs/需求分析.md - 理解"拒绝的需求"
2. 阅读 docs/功能清单.md - 确认功能边界
3. 阅读 docs/技术选型.md - 确认技术约束
4. 阅读 docs/技术架构.md - 理解模块设计

# 第二步：检查当前任务
5. 当前任务是什么？
6. 这个任务在功能清单中吗？
7. 实现方式符合技术架构吗？

# 第三步：验证决策
8. 如果要引入新依赖 → 检查技术选型文档
9. 如果要添加新功能 → 检查功能清单文档
10. 如果要修改架构 → 必须先更新架构文档

# 第四步：输出确认
向用户确认：
"我已阅读所有设计文档，当前任务是 [XXX]，
实现方式遵循 [文档章节]，不违反任何禁止项。"
```

#### 6. 代码审查自检表

**写完代码后，必须自我审查：**

```typescript
// ✅ 代码提交前的自检清单

□ 是否引入了被拒绝的依赖？
  └─> 检查 docs/技术选型.md 的"不选择的技术"

□ 是否实现了被拒绝的功能？
  └─> 检查 docs/功能清单.md 的"不需要的功能"

□ 是否使用了被拒绝的架构模式？
  └─> 检查 docs/需求分析.md 的"过度设计的需求"

□ 函数是否 > 50 行？文件是否 > 300 行？
  └─> 是 → 重构

□ 是否有超过 3 层的缩进？
  └─> 是 → 重新设计

□ 是否破坏了用户现有配置？
  └─> 检查是否使用了"读取-合并-写入"模式

□ 是否所有路径都是跨平台的？
  └─> 检查是否使用了 path.join() 而不是硬编码 /
```

#### 7. 紧急停止信号

**如果发现以下情况，立即停止并重读文档：**

- 正在写 `interface XXXAdapter`
- 正在写 `abstract class XXXWriter`
- 正在安装 fs-extra/dotenv/lodash
- 正在实现 backup/restore/validate 命令
- 正在分离配置文件到多个文件
- 正在使用异步 I/O 读写配置
- 正在引入 Redux/Zustand
- 正在使用 UI 组件库
- 代码文件超过 300 行
- 函数超过 50 行

**停止后的操作**：
1. 重新阅读对应的设计文档
2. 理解为什么这个方案被拒绝
3. 找到文档中推荐的正确方案
4. 重新实现

### 🎯 核心原则记忆口诀

```
读文档 → 查清单 → 问 Linus → 写代码 → 再检查

1. 读文档：开发前必读 4 个设计文档
2. 查清单：检查功能清单和禁止项
3. 问 Linus：真问题？更简单？会破坏吗？
4. 写代码：< 50 行/函数，< 300 行/文件
5. 再检查：提交前再次检查禁止项
```

### 📋 会话恢复模板

**新会话开始时，使用此模板：**

```markdown
# 会话恢复检查

## 1. 文档阅读确认
- [ ] docs/需求分析.md - 已阅读，理解拒绝的需求
- [ ] docs/功能清单.md - 已阅读，确认功能边界
- [ ] docs/技术选型.md - 已阅读，确认技术约束
- [ ] docs/技术架构.md - 已阅读，理解模块设计

## 2. 当前任务确认
- 任务：[描述当前任务]
- 功能清单位置：[引用文档章节]
- 实现依据：[引用架构文档]

## 3. 禁止项检查
- [ ] 不使用 fs-extra
- [ ] 不使用 dotenv
- [ ] 不分离配置文件
- [ ] 不做抽象写入层
- [ ] 不做 Electron 胶水层
- [ ] 不实现 validate/backup/restore
- [ ] 不使用异步 I/O（配置读写）
- [ ] 不使用状态管理库

## 4. 开始开发
✅ 所有检查通过，开始编码
```

---

## 参考文档

**必读文档**（开发前强制阅读）：
1. **需求分析**：`docs/需求分析.md` - 理解核心问题和拒绝的需求
2. **功能清单**：`docs/功能清单.md` - 确认功能范围和禁止项
3. **技术选型**：`docs/技术选型.md` - 确认技术栈和拒绝项
4. **技术架构**：`docs/技术架构.md` - 理解模块设计和数据流

**快速索引**：
- 拒绝的依赖：`docs/技术选型.md:755-765`
- 拒绝的架构：`docs/技术选型.md:767-774`
- 拒绝的需求：`docs/需求分析.md:38-100`
- 不需要的功能：`docs/功能清单.md:44-54`

## 核心价值观

1. **简洁胜于复杂**：如果代码超过 3 层缩进，重新设计
2. **数据结构优先**：先设计数据，代码自然简洁
3. **零破坏性**：永远不破坏用户现有配置
4. **实用主义**：解决当前问题，不为未来过度设计
5. **直接硬编码**：2 个工具不需要抽象层
6. **忠实于文档**：所有决策必须在设计文档中有依据

---

**最后提醒**：

1. **开发前必读文档**：不读文档 = 需求偏移的开始
2. **每个决策查文档**：如果文档中拒绝了，就不要做
3. **代码提交前自检**：检查是否违反禁止项
4. **会话压缩后重读**：恢复上下文，防止偏移
5. **发现违反立即停止**：重读文档，找正确方案

**如果发现自己在写复杂的抽象层、工厂模式、策略模式，或者引入被拒绝的依赖，立即停止，重新阅读设计文档。这个工具的本质是"文件内容替换器"，不是企业级框架。**

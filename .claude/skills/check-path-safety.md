# 路径安全检查 (Path Safety Check)

检查代码中的文件路径操作，确保开发/测试环境不会修改生产环境的配置文件。

## 🎯 何时使用

在以下情况下运行此 skill：

1. **添加新的文件操作代码**
   - 新增读取或写入配置文件的函数
   - 新增访问用户主目录的代码
   - 新增操作 `~/.ccman`、`~/.codex`、`~/.claude` 的代码

2. **修改现有文件操作**
   - 重构文件读写逻辑
   - 修改路径生成方式
   - 添加新的配置文件

3. **发现路径相关 bug**
   - 测试环境修改了生产文件
   - 开发环境影响了真实配置

## 📋 检查规则

### ❌ 禁止模式

**绝对禁止直接使用 `os.homedir()`：**

```typescript
// ❌ 错误：绕过环境隔离
import * as os from 'os'
const configPath = path.join(os.homedir(), '.claude.json')

// ❌ 错误：硬编码路径
const ccmanDir = path.join(os.homedir(), '.ccman')
```

**绝对禁止硬编码绝对路径：**

```typescript
// ❌ 错误：硬编码用户路径
const configPath = '/Users/username/.ccman/config.json'

// ❌ 错误：硬编码 HOME 变量
const home = process.env.HOME
```

### ✅ 正确模式

**始终使用 `packages/core/src/paths.ts` 中的函数：**

```typescript
// ✅ 正确：使用统一的路径函数
import { getClaudeJsonPath, getCcmanDir } from './paths.js'

const configPath = getClaudeJsonPath()  // 自动根据环境切换
const ccmanDir = getCcmanDir()          // 自动隔离
```

## 🔍 检查流程

执行以下检查步骤：

### 1. 搜索危险模式

```bash
# 检查是否有直接使用 os.homedir()
grep -rn "os\.homedir()" packages/core/src/ packages/cli/src/ packages/desktop/src/

# 检查是否有硬编码路径
grep -rn "'/Users/" packages/
grep -rn '"\~/\.' packages/
```

### 2. 验证导入来源

**检查所有文件操作是否从 paths.ts 导入：**

```typescript
// 在每个需要路径的文件中，检查是否有：
import { getCcmanDir, getClaudeDir, ... } from './paths.js'
// 或
import { getCcmanDir, getClaudeDir, ... } from '@ccman/core'
```

### 3. 环境隔离测试

**验证 paths.ts 的环境切换逻辑：**

```typescript
// 检查 paths.ts 中是否有统一的 rootDir
let rootDir: string
if (isTest) {
  rootDir = path.join(os.tmpdir(), `ccman-test-${process.pid}`)
} else if (isDev) {
  rootDir = path.join(os.tmpdir(), 'ccman-dev')
} else {
  rootDir = os.homedir()
}

// 所有路径函数应该基于 rootDir 或派生变量
```

### 4. 检查文件列表

**确保以下文件使用了正确的路径函数：**

- [ ] `packages/core/src/claude-clean.ts` - 使用 `getClaudeJsonPath()`
- [ ] `packages/core/src/writers/claude.ts` - 使用 `getClaudeDir()`, `getClaudeConfigPath()`
- [ ] `packages/core/src/writers/mcp.ts` - 使用 `getClaudeDir()`, `getCcmanDir()`
- [ ] `packages/core/src/tool-manager.ts` - 使用 `getCcmanDir()`
- [ ] `packages/desktop/src/main/index.ts` - 使用 `getCcmanDir()` (日志路径)

## 🚨 常见错误及修复

### 错误 1：自定义路径函数

```typescript
// ❌ 错误
function getClaudeJsonPath(): string {
  return path.join(os.homedir(), '.claude.json')
}

// ✅ 修复：使用 paths.ts 的函数
import { getClaudeJsonPath } from './paths.js'
// 直接使用，不要重新定义
```

### 错误 2：部分使用 paths.ts

```typescript
// ❌ 错误：混用路径来源
import { getCcmanDir } from './paths.js'
const logDir = path.join(os.homedir(), '.ccman', 'logs')  // ← 错误！

// ✅ 修复：统一使用 paths.ts
import { getCcmanDir } from './paths.js'
const logDir = path.join(getCcmanDir(), 'logs')
```

### 错误 3：重复环境判断

```typescript
// ❌ 错误：在多个地方重复判断环境
export function getPath1(): string {
  if (process.env.NODE_ENV === 'test') return '/tmp/test'
  return os.homedir()
}

export function getPath2(): string {
  if (process.env.NODE_ENV === 'test') return '/tmp/test'  // 重复！
  return os.homedir()
}

// ✅ 修复：在 paths.ts 中统一判断一次
let rootDir: string
if (isTest) rootDir = '/tmp/test'
else rootDir = os.homedir()

export function getPath1() { return path.join(rootDir, 'path1') }
export function getPath2() { return path.join(rootDir, 'path2') }
```

## 📊 paths.ts 设计原则

### 核心思想

> "如果你发现自己在多个地方重复同样的 if-else，说明你的数据结构设计错了。提取变量，问题自然消失。" - Linus Torvalds

### 正确的设计

```typescript
// 1. 环境判断只做一次
let rootDir: string
if (isTest) {
  rootDir = path.join(os.tmpdir(), `ccman-test-${process.pid}`)
} else if (isDev) {
  rootDir = path.join(os.tmpdir(), 'ccman-dev')
} else {
  rootDir = os.homedir()
}

// 2. 基于 rootDir 派生所有路径（零判断）
let ccmanDir = path.join(rootDir, '.ccman')
let codexDir = path.join(rootDir, '.codex')
let claudeDir = path.join(rootDir, '.claude')

// 3. 导出函数直接返回（零判断）
export function getCcmanDir(): string {
  return ccmanDir
}

export function getClaudeJsonPath(): string {
  return path.join(rootDir, '.claude.json')
}
```

### 为什么这样设计？

- ✅ **单一数据源**：环境只判断一次，结果存储在 `rootDir`
- ✅ **消除重复**：所有路径函数都是纯数据操作，无条件分支
- ✅ **易于扩展**：添加新路径只需一行 `path.join(rootDir, ...)`
- ✅ **零破坏性**：新环境（如 staging）只需修改 `rootDir` 判断

## 🎯 环境隔离验证

### 生产环境

```bash
NODE_ENV=production
~/.claude.json  # ✅ 正确的生产路径
```

### 开发环境

```bash
NODE_ENV=development
/tmp/ccman-dev/.claude.json  # ✅ 隔离，不影响生产
```

### 测试环境

```bash
NODE_ENV=test
/tmp/ccman-test-12345/.claude.json  # ✅ 每个进程独立隔离
```

## ✅ 检查清单

执行此 skill 时，按顺序完成以下检查：

- [ ] **全局搜索**：运行 `grep -rn "os\.homedir()" packages/` 无结果
- [ ] **导入检查**：所有路径操作都从 `paths.ts` 导入
- [ ] **paths.ts 结构**：确认有统一的 `rootDir` 变量
- [ ] **零重复判断**：paths.ts 以外的文件不包含环境判断
- [ ] **新增路径函数**：如果新增了路径，在 `paths.ts` 中添加导出函数
- [ ] **导出更新**：在 `packages/core/src/index.ts` 中导出新函数
- [ ] **手动测试**：分别在开发/测试环境运行，确认路径隔离

## 🔧 添加新路径的流程

如果需要添加新的配置文件路径，按以下步骤操作：

### 1. 在 paths.ts 中添加函数

```typescript
// packages/core/src/paths.ts

/**
 * 获取新配置文件路径
 */
export function getNewConfigPath(): string {
  return path.join(rootDir, '.new-config.json')
  // 或基于现有目录
  // return path.join(ccmanDir, 'new-config.json')
}
```

### 2. 在 index.ts 中导出

```typescript
// packages/core/src/index.ts

export {
  getCcmanDir,
  // ... 其他函数
  getNewConfigPath,  // ← 添加这里
} from './paths.js'
```

### 3. 在业务代码中使用

```typescript
// packages/core/src/your-module.ts

import { getNewConfigPath } from './paths.js'

export function loadNewConfig() {
  const configPath = getNewConfigPath()  // ✅ 自动环境隔离
  // ... 读取配置
}
```

### 4. 运行安全检查

```bash
# 确认没有直接使用 os.homedir()
grep -rn "os\.homedir()" packages/core/src/your-module.ts
```

## 💡 最佳实践

1. **永远不要**在 `paths.ts` 以外的地方调用 `os.homedir()`
2. **永远不要**在业务代码中判断 `NODE_ENV` 来切换路径
3. **永远使用** `paths.ts` 提供的路径函数
4. **提交前**运行此 skill 检查路径安全性
5. **代码审查**时关注路径操作是否符合规范

## 📚 相关文档

- `packages/core/src/paths.ts` - 路径管理核心模块
- `CLAUDE.md` - 开发规范（包含环境保护规则）
- `docs/技术架构.md` - 架构设计说明

---

**使用方法**：在 Claude Code 中输入 `/check-path-safety` 触发此检查。

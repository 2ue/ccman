---
description: 检查代码中的文件路径操作，确保开发/测试环境不会修改生产环境文件
---

# 路径安全检查

执行以下检查步骤，确保所有文件路径操作都正确使用了环境隔离机制。

## 1. 搜索危险模式

首先运行以下命令检查是否有直接使用 `os.homedir()` 的代码：

```bash
grep -rn "os\.homedir()" packages/core/src/ packages/cli/src/ packages/desktop/src/
```

**预期结果**：
- ✅ 应该只在 `packages/core/src/paths.ts` 中出现（在 rootDir 初始化部分）
- ❌ 如果在其他文件中出现，说明存在安全隐患

## 2. 检查硬编码路径

```bash
grep -rn "'/Users/" packages/
grep -rn '"/Users/' packages/
```

**预期结果**：应该没有任何匹配

## 3. 验证导入来源

检查所有涉及文件路径的文件，确保它们从 `paths.ts` 导入：

**必须检查的文件清单**：

```typescript
// packages/core/src/claude-clean.ts
import { getClaudeJsonPath } from './paths.js'  // ✅

// packages/core/src/writers/claude.ts
import { getClaudeDir, getClaudeConfigPath } from '../paths.js'  // ✅

// packages/core/src/writers/mcp.ts
import { getClaudeConfigPath, getCcmanDir, getClaudeDir } from '../paths.js'  // ✅

// packages/core/src/tool-manager.ts
import { getCcmanDir } from './paths.js'  // ✅

// packages/desktop/src/main/index.ts
import { getCcmanDir } from '@ccman/core'  // ✅
```

## 4. 验证 paths.ts 结构

打开 `packages/core/src/paths.ts`，确认以下结构：

```typescript
// ✅ 应该有统一的 rootDir 变量
let rootDir: string
if (isTest) {
  rootDir = path.join(os.tmpdir(), `ccman-test-${process.pid}`)
} else if (isDev) {
  rootDir = path.join(os.tmpdir(), 'ccman-dev')
} else {
  rootDir = os.homedir()
}

// ✅ 所有目录基于 rootDir
let ccmanDir = path.join(rootDir, '.ccman')
let codexDir = path.join(rootDir, '.codex')
let claudeDir = path.join(rootDir, '.claude')

// ✅ 所有路径函数直接返回，无条件判断
export function getClaudeJsonPath(): string {
  return path.join(rootDir, '.claude.json')
}
```

**检查要点**：
- [ ] 有统一的 `rootDir` 变量
- [ ] 环境判断只做一次（在 rootDir 初始化时）
- [ ] 所有路径函数都基于 `rootDir` 或派生变量（ccmanDir/codexDir/claudeDir）
- [ ] 路径函数内部没有 if-else 条件判断

## 5. 环境隔离验证

理论验证完成后，进行实际测试：

```bash
# 开发环境测试
NODE_ENV=development node -e "
const { getClaudeJsonPath } = require('./packages/core/dist/index.js');
console.log('开发环境:', getClaudeJsonPath());
"

# 测试环境
NODE_ENV=test node -e "
const { getClaudeJsonPath } = require('./packages/core/dist/index.js');
console.log('测试环境:', getClaudeJsonPath());
"

# 生产环境
NODE_ENV=production node -e "
const { getClaudeJsonPath } = require('./packages/core/dist/index.js');
console.log('生产环境:', getClaudeJsonPath());
"
```

**预期输出**：
- 开发环境: `/tmp/ccman-dev/.claude.json`
- 测试环境: `/tmp/ccman-test-{PID}/.claude.json`
- 生产环境: `~/.claude.json`

## 6. 如果发现问题

### 问题 1：在非 paths.ts 文件中使用了 os.homedir()

**修复步骤**：

1. 确认需要的路径类型
2. 在 `paths.ts` 中添加对应的函数（如果不存在）
3. 在 `packages/core/src/index.ts` 中导出该函数
4. 修改问题文件，使用 paths.ts 的函数

**示例**：

```typescript
// ❌ 错误
import * as os from 'os'
const configPath = path.join(os.homedir(), '.new-config.json')

// ✅ 修复
import { getNewConfigPath } from './paths.js'
const configPath = getNewConfigPath()
```

### 问题 2：paths.ts 中有重复的环境判断

**错误模式**：
```typescript
// ❌ 重复判断
export function getPath1() {
  if (isTest) return '/tmp/test/path1'
  return os.homedir() + '/path1'
}

export function getPath2() {
  if (isTest) return '/tmp/test/path2'  // 重复！
  return os.homedir() + '/path2'
}
```

**修复方法**：
```typescript
// ✅ 提取 rootDir，消除重复
let rootDir: string
if (isTest) rootDir = '/tmp/test'
else rootDir = os.homedir()

export function getPath1() {
  return path.join(rootDir, 'path1')
}

export function getPath2() {
  return path.join(rootDir, 'path2')
}
```

## 检查完成清单

- [ ] 运行 grep 搜索，无危险模式
- [ ] 所有文件操作都使用 paths.ts 函数
- [ ] paths.ts 结构符合设计原则
- [ ] 环境隔离测试通过
- [ ] 无重复的环境判断

## 参考文档

详细的设计原则和最佳实践，请查看：
- `.claude/skills/check-path-safety.md` - 完整的路径安全规范
- `packages/core/src/paths.ts` - 路径管理实现
- `CLAUDE.md` - 项目开发规范

---

检查完成后，如果发现问题请立即修复。如果一切正常，可以继续开发。

# GMN 快速配置脚本

> **设计原则**：简洁至上，30 行代码解决问题，不做过度设计。

---

## 一、问题定义

**需求**：快速将 GMN 服务商配置到 Claude Code、Codex、Gemini CLI、OpenCode 四个工具。

**本质**：把同一个 API Key 和 Base URL 写入 4 个配置文件。

**数据流**：
```
API Key (输入)
  ↓
ToolManager.add/edit() → Provider
  ↓
ToolManager.switch() → Writer
  ↓
配置文件 (输出)
```

---

## 二、脚本实现

### 完整代码（50 行）

保存为 `scripts/setup-gmn.mjs`：

```javascript
#!/usr/bin/env node
/**
 * GMN 快速配置脚本
 *
 * 功能：将 GMN 服务商配置到所有 AI 编程工具
 *
 * 用法：
 *   node scripts/setup-gmn.mjs              # 交互式输入
 *   node scripts/setup-gmn.mjs sk-ant-xxx   # 直接传入 API Key
 */

import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import {
  createClaudeManager,
  createCodexManager,
  createGeminiManager,
  createOpenCodeManager,
} from '../packages/core/src/index.js'

const GMN_BASE_URL = 'https://gmn.chuangzuoli.cn/openai'
const PROVIDER_NAME = 'GMN'

const tools = [
  { name: 'Claude Code', manager: createClaudeManager() },
  { name: 'Codex', manager: createCodexManager() },
  { name: 'Gemini CLI', manager: createGeminiManager() },
  { name: 'OpenCode', manager: createOpenCodeManager() },
]

async function main() {
  // 1. 获取 API Key
  let apiKey = process.argv[2]

  if (!apiKey) {
    const rl = createInterface({ input: stdin, output: stdout })
    apiKey = await rl.question('GMN API Key: ')
    rl.close()
  }

  if (!apiKey?.trim()) {
    throw new Error('API Key 不能为空')
  }

  // 2. 配置所有工具
  for (const { name, manager } of tools) {
    const existing = manager.findByName(PROVIDER_NAME)

    const provider = existing
      ? manager.edit(existing.id, { baseUrl: GMN_BASE_URL, apiKey })
      : manager.add({ name: PROVIDER_NAME, baseUrl: GMN_BASE_URL, apiKey })

    manager.switch(provider.id)
    console.log(`✅ ${name}`)
  }

  console.log('\n🎉 GMN 配置完成！')
}

main().catch((err) => {
  console.error(`❌ 错误: ${err.message}`)
  process.exit(1)
})
```

---

## 三、使用方法

### 方式 1：交互式输入（推荐）

```bash
node scripts/setup-gmn.mjs
```

输出：
```
GMN API Key: sk-ant-xxx
✅ Claude Code
✅ Codex
✅ Gemini CLI
✅ OpenCode

🎉 GMN 配置完成！
```

### 方式 2：直接传入 API Key

```bash
node scripts/setup-gmn.mjs sk-ant-xxx
```

---

## 四、脚本行为

### 1. 对于每个工具

**如果 GMN Provider 不存在**：
```javascript
manager.add({
  name: 'GMN',
  baseUrl: 'https://gmn.chuangzuoli.cn/openai',
  apiKey: 'sk-ant-xxx',
})
```

**如果 GMN Provider 已存在**：
```javascript
manager.edit(existingId, {
  baseUrl: 'https://gmn.chuangzuoli.cn/openai',
  apiKey: 'sk-ant-xxx',
})
```

**然后切换为当前生效**：
```javascript
manager.switch(provider.id)
```

### 2. 影响的配置文件

执行后会创建/更新以下文件：

**ccman 配置**（Provider 数据）：
- `~/.ccman/claude.json`
- `~/.ccman/codex.json`
- `~/.ccman/gemini.json`
- `~/.ccman/opencode.json`

**工具官方配置**（实际生效）：
- `~/.claude/settings.json`
- `~/.codex/config.toml`
- `~/.codex/auth.json`
- `~/.gemini/settings.json`
- `~/.gemini/.env`
- `~/.config/opencode/opencode.json`

---

## 五、设计原则

### 1. 简洁至上

**代码量**：50 行（含注释和空行）

**复杂度**：
- 0 层嵌套（只有 1 个 for 循环）
- 0 个特殊情况（统一处理所有工具）
- 0 个外部依赖（只用 Node.js 内置 API）

### 2. 零破坏性

**使用现有 API**：
- `manager.findByName()` - 查找现有 Provider
- `manager.add()` / `manager.edit()` - 创建/更新 Provider
- `manager.switch()` - 切换为当前生效

**保留用户配置**：
- Writer 使用深度合并策略
- 只更新认证相关字段
- 保留其他自定义配置

### 3. 直接清晰

**没有**：
- ❌ 别名（cc/cx/gm/oc）
- ❌ 环境变量（GMN_API_KEY）
- ❌ 复杂的参数解析
- ❌ 平台选择功能

**为什么不需要**：
- 大多数用户都是全平台配置
- 如果只需要部分平台，手动注释掉对应行即可
- 保持简单比提供"灵活性"更重要

---

## 六、扩展：平台选择（可选）

如果确实需要选择平台，使用交互式提示（不是命令行参数）：

```javascript
async function selectTools() {
  const rl = createInterface({ input: stdin, output: stdout })

  console.log('选择要配置的平台（空格分隔，回车全选）：')
  console.log('1) Claude Code')
  console.log('2) Codex')
  console.log('3) Gemini CLI')
  console.log('4) OpenCode')

  const answer = await rl.question('> ')
  rl.close()

  if (!answer.trim()) return tools // 全选

  const indexes = answer.split(/\s+/).map(n => parseInt(n) - 1)
  return indexes.filter(i => i >= 0 && i < tools.length).map(i => tools[i])
}

// 在 main() 中使用
const selectedTools = await selectTools()
for (const { name, manager } of selectedTools) {
  // ...
}
```

**为什么这样更好**：
- ✅ 用户友好（看到选项再选择）
- ✅ 防错（自动过滤无效输入）
- ✅ 直观（数字比工具名称更容易输入）

---

## 七、集成到 CLI（可选）

如果要正式集成到 ccman CLI，做成子命令：

```bash
ccman setup gmn
```

**实现位置**：`packages/cli/src/commands/setup.ts`

```typescript
import { Command } from 'commander'
import { createClaudeManager, createCodexManager, createGeminiManager, createOpenCodeManager } from '@ccman/core'
import { input } from '@inquirer/prompts'

const GMN_BASE_URL = 'https://gmn.chuangzuoli.cn/openai'

export const setupCommand = new Command('setup')
  .description('快速配置服务商')

setupCommand
  .command('gmn')
  .description('配置 GMN 服务商到所有平台')
  .action(async () => {
    const apiKey = await input({ message: 'GMN API Key:' })

    const tools = [
      { name: 'Claude Code', manager: createClaudeManager() },
      { name: 'Codex', manager: createCodexManager() },
      { name: 'Gemini CLI', manager: createGeminiManager() },
      { name: 'OpenCode', manager: createOpenCodeManager() },
    ]

    for (const { name, manager } of tools) {
      const existing = manager.findByName('GMN')
      const provider = existing
        ? manager.edit(existing.id, { baseUrl: GMN_BASE_URL, apiKey })
        : manager.add({ name: 'GMN', baseUrl: GMN_BASE_URL, apiKey })

      manager.switch(provider.id)
      console.log(`✅ ${name}`)
    }

    console.log('\n🎉 GMN 配置完成！')
  })
```

---

## 八、常见问题

### Q1: 为什么不支持选择平台？

**A**: 大多数用户都是全平台配置。如果只需要部分平台：
1. 手动注释掉 `tools` 数组中的对应行
2. 或者使用"扩展：平台选择"中的代码

保持简单比提供"灵活性"更重要。

### Q2: 为什么不支持环境变量？

**A**: 谁会设置 `GMN_API_KEY` 环境变量？这是臆想出来的需求。
- 交互式输入更友好
- 直接传参更直接
- 环境变量增加复杂度

### Q3: 为什么不支持别名（cc/cx/gm/oc）？

**A**: 别名增加认知负担：
- 用户需要记住 4 个缩写
- 代码需要维护映射表
- 错误提示需要处理无效别名

直接用完整名称更清晰。

### Q4: 如果我只想配置 Codex 怎么办？

**A**: 注释掉其他行：

```javascript
const tools = [
  // { name: 'Claude Code', manager: createClaudeManager() },
  { name: 'Codex', manager: createCodexManager() },
  // { name: 'Gemini CLI', manager: createGeminiManager() },
  // { name: 'OpenCode', manager: createOpenCodeManager() },
]
```

或者直接用 ccman CLI：
```bash
ccman codex add --name GMN --base-url https://gmn.chuangzuoli.cn/openai --api-key sk-ant-xxx
ccman codex use GMN
```

---

## 九、与原文档的对比

| 特性 | 原文档 | 新文档 | 说明 |
|------|--------|--------|------|
| 代码行数 | 200 行 | 50 行 | 简化 75% |
| 别名支持 | ✅ cc/cx/gm/oc | ❌ | 不需要 |
| 环境变量 | ✅ GMN_API_KEY | ❌ | 不需要 |
| 参数解析 | ✅ --tools, --key | ❌ | 不需要 |
| 平台选择 | ✅ 命令行参数 | ⚠️ 可选（交互式） | 大多数用户不需要 |
| 路径问题 | ❌ dist/ 不存在 | ✅ 使用源码路径 | 开发环境可用 |

---

## 十、总结

**核心思想**：
> "这个脚本的本质是：把同一个字符串写入 4 个配置文件。30 行代码就够了。"

**设计原则**：
1. ✅ 简洁至上（50 行代码）
2. ✅ 零破坏性（使用现有 API）
3. ✅ 直接清晰（一眼看懂）
4. ✅ YAGNI（不做过度设计）

**下一步**：
- [ ] 测试脚本（确保所有工具都能正确配置）
- [ ] 考虑是否集成到 CLI（`ccman setup gmn`）
- [ ] 更新用户文档（如何使用此脚本）

---

**参考文档**：
- [工具配置原理](./工具配置原理.md) - 详细说明各工具的配置机制
- [技术架构](./技术架构.md) - ToolManager 和 Writer 的设计
- [开发规范](../CLAUDE.md) - 项目开发原则

# Design: Cleanup Legacy Redundancy

## Context

Phase 1 插件架构重构（`refactor-plugin-architecture`）引入了新的服务层（ProviderService, McpService 等），但保留了旧系统以保持向后兼容。然而，实际情况是：

1. **新旧系统并行运行**而非新系统代理旧系统
2. **工具标识不一致**导致数据隔离
3. **`compat/` 层未被使用**

### 当前状态

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLI Commands                                 │
├─────────────────────────────────────────────────────────────────┤
│  codex/add.ts      │  claude/add.ts     │  sync/upload.ts       │
│  ↓                 │  ↓                 │  ↓                     │
│  ProviderService   │  ProviderService   │  createCodexManager()  │
│  ('codex')         │  ('claude-code')   │  ('codex')             │
│  ↓                 │  ↓                 │  ↓                     │
│  codex.json        │  claude-code.json  │  codex.json (OK)       │
│                    │                    │  claude.json (WRONG!)   │
└─────────────────────────────────────────────────────────────────┘
```

**问题**：`sync/upload.ts` 使用 `createClaudeManager()`，读取 `claude.json`，但 `ccman claude add` 写入 `claude-code.json`。

## Goals / Non-Goals

### Goals

1. ✅ 修复数据隔离 Bug - sync 命令能看到所有服务商
2. ✅ 统一数据存储 - 所有命令使用相同的配置文件
3. ✅ 保持 100% 向后兼容 - 用户无感知
4. ✅ 减少代码冗余 - 消除重复实现

### Non-Goals

- ❌ 立即删除所有旧代码（渐进迁移更安全）
- ❌ 改变用户可见的 API 或命令
- ❌ 重构 Desktop 代码（Desktop 已迁移到新系统）

## Decisions

### Decision 1: 工具标识映射策略

**决定**：在 `tool-manager.ts` 中添加映射，将旧标识转换为新标识。

```typescript
// tool-manager.ts
const TOOL_ID_MAP: Record<ToolType, Tool> = {
  'codex': 'codex',
  'claude': 'claude-code',
  'gemini': 'gemini-cli',
  'mcp': 'mcp',  // 注：MCP 由 McpService 单独处理
}
```

**理由**：
- 最小改动量
- 不破坏现有 API 签名
- 不需要修改调用方代码

**替代方案**：
1. ~~修改所有调用方使用新标识~~ - 改动太大，容易遗漏
2. ~~修改 ProviderService 支持旧标识~~ - 污染新系统

### Decision 2: tool-manager.ts 重构为委托层

**决定**：保留 `tool-manager.ts` 的 API，但内部委托给 `ProviderService`。

```typescript
// 改造前
function createToolManager(tool: ToolType): ToolManager {
  const toolConfig = TOOL_CONFIGS[tool]
  // 完整的独立实现...
  return {
    add(input) { /* 独立逻辑 */ },
    list() { /* 独立逻辑 */ },
    // ...
  }
}

// 改造后
function createToolManager(tool: ToolType): ToolManager {
  const mappedTool = TOOL_ID_MAP[tool]

  // 发出废弃警告（仅首次）
  if (!warnedTools.has(tool)) {
    console.warn(`[Deprecated] createToolManager('${tool}') is deprecated.`)
    warnedTools.add(tool)
  }

  return {
    add(input) { return ProviderService.add(mappedTool, input) },
    list() { return ProviderService.list(mappedTool) },
    // 委托所有方法...
  }
}
```

**理由**：
- 与 `paths.ts` 委托给 `path-resolver.ts` 的模式一致
- 不破坏任何现有调用方
- 提供清晰的迁移路径

### Decision 3: 数据迁移策略

**决定**：在 `migrate.ts` 中添加 v3.2 → v3.3 迁移，自动重命名配置文件。

```typescript
// migrate.ts
export function migrateV32ToV33(): void {
  const ccmanDir = getCcmanDir()

  // 迁移 claude.json → claude-code.json
  const oldClaudePath = path.join(ccmanDir, 'claude.json')
  const newClaudePath = path.join(ccmanDir, 'claude-code.json')

  if (fs.existsSync(oldClaudePath) && !fs.existsSync(newClaudePath)) {
    // 合并逻辑（如果新文件已存在）或直接重命名
    fs.renameSync(oldClaudePath, newClaudePath)
  }

  // 同样处理 gemini.json → gemini-cli.json
}
```

**迁移时机**：在 `loadConfig()` 或应用启动时检查并执行。

**理由**：
- 自动化迁移，用户无需干预
- 保留备份，可回滚
- 与现有 `migrateConfig()` 模式一致

### Decision 4: 删除未使用的 compat 层

**决定**：删除 `packages/core/src/compat/` 目录。

**理由**：
- `compat/tool-manager.ts` 创建后未被任何模块使用
- 与实际使用的 `tool-manager.ts` 功能重复
- 造成混淆

**验证**：
```bash
grep -r "from.*compat" packages/  # 确认无引用
```

### Decision 5: writers 和 presets 处理策略

**决定**：Phase B 延后处理，本次不删除。

**理由**：
- 这些模块虽然冗余，但仍在正常工作
- 删除它们需要更多测试验证
- Phase A 的数据隔离 Bug 更紧急

**后续计划**：
1. 在 `writers/*.ts` 中添加废弃注释
2. 下一版本再考虑删除

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据迁移失败 | 用户丢失配置 | 迁移前自动备份，提供回滚命令 |
| 遗漏调用方 | 部分功能仍使用旧数据 | 全面 grep 搜索，单元测试覆盖 |
| 废弃警告干扰 | 用户体验下降 | 每个工具仅警告一次，提供静默选项 |

## Migration Plan

### Phase A: 修复数据隔离（v3.3.0）

1. **Step 1**: 添加工具标识映射到 `tool-manager.ts`
2. **Step 2**: 重构 `createToolManager()` 委托给 `ProviderService`
3. **Step 3**: 添加数据迁移逻辑到 `migrate.ts`
4. **Step 4**: 更新测试用例
5. **Step 5**: 删除 `compat/` 目录

### Phase B: 清理冗余（v3.4.0 或后续）

1. 评估 `writers/*.ts` 是否可安全删除
2. 统一预设数据来源
3. 清理 `index.ts` 导出

### Rollback Plan

如果迁移后出现问题：
1. 配置文件备份在 `~/.ccman/*.backup.*`
2. 可手动重命名回原文件名
3. 提供 `ccman migrate --rollback` 命令

## Open Questions

1. **MCP 如何处理？** - MCP 由 `McpService` 独立管理，`tool-manager.ts` 中的 MCP 相关代码需要单独评估。

2. **是否需要版本检查？** - 迁移逻辑应该只执行一次，需要在 `config.json` 中记录版本。

3. **Desktop 是否受影响？** - Desktop 已迁移到新系统，理论上不受影响，但需要验证。

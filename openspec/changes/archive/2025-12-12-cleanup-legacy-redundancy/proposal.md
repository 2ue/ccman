# Change: Cleanup Legacy Redundancy After Plugin Architecture Refactor

## Why

Phase 1 插件架构重构后，存在以下冗余问题：

1. **数据隔离 Bug**：新系统（CLI）使用 `claude-code`、`gemini-cli` 作为工具标识，而旧系统（sync 命令）使用 `claude`、`gemini`，导致配置文件不同（`~/.ccman/claude-code.json` vs `~/.ccman/claude.json`），**sync 命令无法看到 CLI 添加的服务商**。

2. **双重实现**：`tool-manager.ts` 和 `ProviderService` 是两套独立实现，违反 DRY 原则且增加维护负担。

3. **未使用的兼容层**：`compat/tool-manager.ts` 已创建但未被任何模块引用。

4. **冗余模块**：
   - `writers/*.ts` 与 `tools/*/service-adapter.ts` 功能重复
   - `presets/*.ts` 与 `tools/*/presets.ts` 数据重复

## What Changes

### Phase A: 修复数据隔离 Bug（高优先级）

1. **统一工具标识**：在旧系统中添加工具名称映射
   - `claude` → `claude-code`
   - `gemini` → `gemini-cli`
   - `codex` → `codex`（无变化）

2. **让 `tool-manager.ts` 委托给 `ProviderService`**
   - 保留旧 API 签名（`createCodexManager()` 等）
   - 内部调用 `ProviderService` 方法
   - 添加废弃警告

3. **数据迁移**：将旧配置文件重命名
   - `~/.ccman/claude.json` → `~/.ccman/claude-code.json`
   - `~/.ccman/gemini.json` → `~/.ccman/gemini-cli.json`

### Phase B: 清理冗余模块（低优先级）

1. **删除未使用的兼容层**：移除 `compat/tool-manager.ts` 和 `compat/index.ts`

2. **统一 writers**：
   - 让 `writers/*.ts` 委托给 `tools/*/service-adapter.ts`
   - 或直接删除，更新所有引用

3. **统一预设**：
   - 删除 `presets/*.ts` 中的重复数据
   - 统一使用 `tools/*/presets.ts`

4. **清理 index.ts 导出**：移除冗余的重命名导出

## Impact

### Affected Specs

- `core-architecture` - Backward Compatibility 需求需要更新
- `provider-service` - 存储路径场景需要更新

### Affected Code

**Phase A（关键）**：
- `packages/core/src/tool-manager.ts` - 重构为兼容层
- `packages/cli/src/commands/sync/*.ts` - 自动修复（因为使用了 tool-manager）
- `packages/core/src/migrate.ts` - 添加数据迁移逻辑

**Phase B（清理）**：
- `packages/core/src/compat/` - 删除整个目录
- `packages/core/src/writers/*.ts` - 可能删除或保留为委托层
- `packages/core/src/presets/*.ts` - 删除重复数据
- `packages/core/src/index.ts` - 清理导出

### Breaking Changes

- **NONE for users**：所有变更对用户透明，CLI 命令和 Desktop 功能不变
- **Internal deprecation**：`createCodexManager()` 等工厂函数将显示废弃警告

### Migration Path

1. 自动数据迁移在首次运行时执行
2. 旧配置文件自动重命名（保留备份）
3. 无需用户干预

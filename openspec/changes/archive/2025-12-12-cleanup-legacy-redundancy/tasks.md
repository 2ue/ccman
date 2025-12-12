# Tasks: Cleanup Legacy Redundancy

## Phase A: 修复数据隔离 Bug（必须）

### 1. 准备工作

- [x] 1.1 使用现有分支 `refactor/core-and-others`
- [x] 1.2 运行现有测试确保基线正常 `pnpm test`

### 2. 添加工具标识映射

- [x] 2.1 在 `tool-manager.ts` 中添加 `TOOL_ID_MAP` 常量
  ```typescript
  const TOOL_ID_MAP: Record<ToolType, Tool> = {
    'codex': 'codex',
    'claude': 'claude-code',
    'gemini': 'gemini-cli',
    'mcp': 'mcp',
  }
  ```
- [x] 2.2 添加 `mapToolType()` 辅助函数

### 3. 重构 tool-manager.ts 为委托层

- [x] 3.1 导入 `ProviderService` 和相关类型
- [x] 3.2 重构 `createToolManager()` 函数
  - 保留返回类型 `ToolManager`
  - 添加废弃警告（每个工具仅一次，仅开发环境）
  - 委托 `add()` 到 `ProviderService.add()`
  - 委托 `list()` 到 `ProviderService.list()`
  - 委托 `get()` 到 `ProviderService.list()` + `findById()`
  - 委托 `edit()` 到 `ProviderService.update()`
  - 委托 `remove()` 到 `ProviderService.delete()`
  - 委托 `switch()` 到 `ProviderService.apply()`
  - 委托 `getCurrent()` 到 `ProviderService.current()`
  - 委托 `clone()` 到 `ProviderService.clone()`
- [x] 3.3 处理预设相关方法（`listPresets`, `addPreset`, `editPreset`, `removePreset`）
  - 保留原实现，使用映射后的配置路径
- [x] 3.4 删除 `TOOL_CONFIGS` 中的独立实现逻辑
- [x] 3.5 删除 `loadConfig()` 和 `saveConfig()` 内部函数（改为预设专用函数）

### 4. 数据迁移

- [x] 4.1 在 `migrate.ts` 中添加 `migrateV32ToV33()` 函数
- [x] 4.2 实现配置文件重命名逻辑
  - `claude.json` → `claude-code.json`
  - `gemini.json` → `gemini-cli.json`
- [x] 4.3 处理合并场景（如果新旧文件都存在）
- [x] 4.4 创建备份文件（`.backup.{timestamp}`）
- [x] 4.5 添加 `runAllMigrations()` 统一入口函数
- [x] 4.6 导出新的迁移函数到 `index.ts`

### 5. 删除未使用的 compat 层

- [x] 5.1 确认 `compat/` 目录无外部引用
- [x] 5.2 删除 `packages/core/src/compat/` 目录
- [x] 5.3 运行测试确保无破坏

### 6. 测试验证

- [x] 6.1 运行所有单元测试 `pnpm test` - 24 个测试全部通过
- [x] 6.2 构建验证 `pnpm build` - 构建成功

---

## Phase B: 清理冗余模块（可选，延后）

### 7. 评估 writers 模块

- [ ] 7.1 分析 `writers/*.ts` 的所有调用方
- [ ] 7.2 评估是否可以安全删除
- [ ] 7.3 如保留，添加废弃注释

### 8. 统一预设数据

- [ ] 8.1 对比 `presets/*.ts` 和 `tools/*/presets.ts` 的数据
- [ ] 8.2 决定统一方案
- [ ] 8.3 删除重复数据

### 9. 清理 index.ts 导出

- [ ] 9.1 移除冗余的重命名导出（如 `LegacyProvider`）
- [ ] 9.2 整理导出顺序和分组
- [ ] 9.3 更新依赖此导出的代码

---

## 完成标准

### Phase A 完成标准

1. ✅ 所有测试通过
2. ✅ `tool-manager.ts` 委托给 `ProviderService`
3. ✅ 工具标识映射正确（claude → claude-code, gemini → gemini-cli）
4. ✅ 数据迁移函数已实现
5. ✅ `compat/` 目录已删除

### Phase B 完成标准（后续）

1. ⬜ 无重复的模块实现
2. ⬜ 预设数据统一来源
3. ⬜ `index.ts` 导出清晰有序

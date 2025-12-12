# Tasks: Cleanup Legacy Redundancy

## Phase A: 修复数据隔离 Bug（必须）

### 1. 准备工作

- [ ] 1.1 创建分支 `fix/legacy-data-isolation`
- [ ] 1.2 运行现有测试确保基线正常 `pnpm test`
- [ ] 1.3 备份当前 `~/.ccman/` 目录用于对比测试

### 2. 添加工具标识映射

- [ ] 2.1 在 `tool-manager.ts` 中添加 `TOOL_ID_MAP` 常量
  ```typescript
  const TOOL_ID_MAP: Record<ToolType, Tool> = {
    'codex': 'codex',
    'claude': 'claude-code',
    'gemini': 'gemini-cli',
    'mcp': 'mcp',
  }
  ```
- [ ] 2.2 添加 `mapToolType()` 辅助函数
- [ ] 2.3 添加单元测试验证映射正确性

### 3. 重构 tool-manager.ts 为委托层

- [ ] 3.1 导入 `ProviderService` 和相关类型
- [ ] 3.2 重构 `createToolManager()` 函数
  - 保留返回类型 `ToolManager`
  - 添加废弃警告（每个工具仅一次）
  - 委托 `add()` 到 `ProviderService.add()`
  - 委托 `list()` 到 `ProviderService.list()`
  - 委托 `get()` 到 `ProviderService.get()`
  - 委托 `edit()` 到 `ProviderService.update()`
  - 委托 `remove()` 到 `ProviderService.delete()`
  - 委托 `switch()` 到 `ProviderService.apply()`
  - 委托 `getCurrent()` 到 `ProviderService.current()`
  - 委托 `clone()` 到 `ProviderService.clone()`
- [ ] 3.3 处理预设相关方法（`listPresets`, `addPreset`, `editPreset`, `removePreset`）
  - 这些方法可能需要保留原实现或委托给 ToolRegistry
- [ ] 3.4 删除 `TOOL_CONFIGS` 中的独立实现逻辑
- [ ] 3.5 删除 `loadConfig()` 和 `saveConfig()` 内部函数（不再需要）

### 4. 数据迁移

- [ ] 4.1 在 `migrate.ts` 中添加 `migrateV32ToV33()` 函数
- [ ] 4.2 实现配置文件重命名逻辑
  - `claude.json` → `claude-code.json`
  - `gemini.json` → `gemini-cli.json`
- [ ] 4.3 处理合并场景（如果新旧文件都存在）
- [ ] 4.4 创建备份文件（`.backup.{timestamp}`）
- [ ] 4.5 在 `config.json` 中记录迁移版本
- [ ] 4.6 在应用启动时自动检查并执行迁移
- [ ] 4.7 添加迁移测试用例

### 5. 删除未使用的 compat 层

- [ ] 5.1 确认 `compat/` 目录无外部引用
  ```bash
  grep -r "from.*compat" packages/
  grep -r "from '\.\./compat" packages/core/src/
  ```
- [ ] 5.2 从 `index.ts` 中移除 `compat/` 相关导出（如有）
- [ ] 5.3 删除 `packages/core/src/compat/` 目录
- [ ] 5.4 运行测试确保无破坏

### 6. 更新 ProviderService 存储路径（可选）

- [ ] 6.1 检查 `provider-service.ts` 中的 `getStoragePath()` 方法
- [ ] 6.2 确认使用 `{tool}.json` 格式（与迁移后一致）
- [ ] 6.3 如有需要，添加路径映射逻辑

### 7. 测试验证

- [ ] 7.1 运行所有单元测试 `pnpm test`
- [ ] 7.2 手动测试 CLI 命令
  - `ccman codex add` → 写入 `codex.json`
  - `ccman claude add` → 写入 `claude-code.json`
  - `ccman gemini add` → 写入 `gemini-cli.json`
- [ ] 7.3 手动测试 sync 命令
  - `ccman sync status` → 显示正确的服务商数量
  - `ccman sync upload` → 上传所有服务商
- [ ] 7.4 验证 Desktop 功能
  - 列表显示所有服务商
  - 添加、编辑、删除正常工作
- [ ] 7.5 验证数据迁移
  - 创建旧格式测试数据
  - 运行迁移
  - 确认数据正确转换

### 8. 文档更新

- [ ] 8.1 更新 CHANGELOG.md
- [ ] 8.2 如有 API 变化，更新 README.md
- [ ] 8.3 更新 OpenSpec 规格文档

---

## Phase B: 清理冗余模块（可选，延后）

### 9. 评估 writers 模块

- [ ] 9.1 分析 `writers/*.ts` 的所有调用方
- [ ] 9.2 评估是否可以安全删除
- [ ] 9.3 如保留，添加废弃注释

### 10. 统一预设数据

- [ ] 10.1 对比 `presets/*.ts` 和 `tools/*/presets.ts` 的数据
- [ ] 10.2 决定统一方案
- [ ] 10.3 删除重复数据

### 11. 清理 index.ts 导出

- [ ] 11.1 移除冗余的重命名导出（如 `LegacyProvider`）
- [ ] 11.2 整理导出顺序和分组
- [ ] 11.3 更新依赖此导出的代码

---

## 完成标准

### Phase A 完成标准

1. ✅ 所有测试通过
2. ✅ `ccman sync status` 显示所有服务商（包括通过 `ccman claude add` 添加的）
3. ✅ 数据迁移自动执行，用户无感知
4. ✅ 废弃警告正常显示（每个工具一次）
5. ✅ `compat/` 目录已删除

### Phase B 完成标准（后续）

1. ✅ 无重复的模块实现
2. ✅ 预设数据统一来源
3. ✅ `index.ts` 导出清晰有序

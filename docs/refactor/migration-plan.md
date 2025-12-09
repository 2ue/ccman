# 迁移与落地计划

> 面向实现团队的执行序列，确保功能不回退、可随时回滚。

## 阶段拆分
1) **准备期**
   - 冻结旧接口，添加 Deprecation 警告（CLI/desktop 提示但仍可用）。
   - 完成 ToolDescriptor 草案（ccman/claude/codex/gemini 先落地）。
   - 引入根目录配置：支持 `CCMAN_ROOT` + rc 文件，确保 dev/test 与 prod 隔离。
2) **Core 重构**
   - 实现 ToolRegistry + 统一 Provider/MCP/Config/WebDAV 服务。
   - 为三大工具与 ccman 自身编写适配器；通过单元测试验证（不接触 CLI/desktop）。
   - 提供兼容层：旧入口函数代理到新服务，确保外部调用不断链。
3) **CLI 迁移**
   - 命令解析改为基于 ToolRegistry 动态注册；交互文案复用 `capabilities`。
   - 验证所有现有命令等价（add/use/list/current/edit/remove/clone/mcp/sync/import/export）。
4) **Desktop 迁移**
   - Preload 仅暴露新 Core API；Renderer 通过统一 hooks 读取 ToolRegistry。
   - UI 按 capabilities 动态显示 MCP/服务商/配置入口；复用 Sync 报告。
5) **清理与发布**
   - 移除旧 writer/manager 代码与禁用分支。
   - 更新文档/README/帮助信息。
   - 打标签发布版本，产出回滚指南。

## 数据兼容策略
- 保持 `~/.ccman/*.json` 格式不变；若需要新增字段（如 enabledApps），采用向后兼容默认值。
- 官方配置写入逻辑需维持旧字段覆盖范围（零破坏原则）。
- 备份路径与权限策略不变；新增快照文件以便回滚（如 `.bak` 后缀时间戳）。

## 验证清单
- 单元测试：Core 服务方法（Provider/MCP/Config/WebDAV）全覆盖边界。
- 回归：CLI/desktop 手工走通所有命令与 WebDAV 上传/下载/合并。
- 兼容性：在已有用户配置目录上运行不会破坏非托管字段。
- 追加工具试装：新增伪工具 `demo-tool` 验证插件化流程。

## 风险与缓解
- **风险：官方配置格式变更（Gemini/Claude 更新）** → 适配器隔离 + 模板版控，允许按工具热修。
- **风险：同步冲突** → MergePlanner 输出冲突报告，CLI/desktop 提示用户手动选择。
- **风险：性能回退（多工具循环写入）** → 按工具加锁并批量写入；监控单次 apply < 200ms。

## 里程碑与输出物
- M1：ToolDescriptor + Core 服务（API ready）；文档 `core-api.md` 校验。
- M2：CLI 切换完成；产出差异清单与用户指南。
- M3：Desktop 切换完成；发布候选版。
- M4：清理旧代码 + 正式发布。 

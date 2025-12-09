# 重构业务逻辑说明（最终版）

> 结合现有实现（2025-12-06）与新架构设计，梳理必须保留的行为、可改进的策略，以及落地时的业务判定逻辑。编号方便评审。

## 1. 环境与根目录
1.1 根目录决策：`CCMAN_ROOT` > 持久化 rc（如 `~/.ccmanrc` 或 `ccman.paths.json`）> `NODE_ENV=test` → `/tmp/ccman-test`（固定）> `NODE_ENV=development` → `/tmp/ccman-dev` > `os.homedir()`.  
1.2 所有工具/ccman 配置路径由 `rootDir` 拼出（`.ccman/.codex/.claude/.gemini/...`），确保一次切换全局生效。  
1.3 目录自动创建（0o700），文件缺失返回空对象，不抛错；新文件权限 0o600。  
1.4 CLI/Desktop 必须可显示当前 root，并允许切换（调用 `setRootDir`）；同步/导入导出使用同一 root。

## 2. 模板与配置读写
2.1 模板来源：`packages/core/templates/<tool>/...`，保持官方格式（如 codex/config.toml、claude/settings.json）。  
2.2 读取顺序：若目标文件不存在 → 以模板为 base；若存在 → 解析现有文件并与模板深度合并（默认 `old-override-new`，调用方可指定）。  
2.3 写入策略：仅覆盖托管字段，保留用户自定义；写前备份，临时文件 + rename 原子替换，失败回滚。  
2.4 锁：`proper-lockfile` 包裹所有写操作（Service/MCP/Config），避免并发写坏文件。

## 3. 服务商（Provider）管理
3.1 存储：`~/.ccman/<tool>.json` 维护 providers、currentProviderId、presets。  
3.2 CRUD：增/改自动刷新 `updatedAt`，切换/应用更新 `lastUsedAt` 与 `currentProviderId`。  
3.3 应用逻辑：`applyService(tool, name)` = 读 ccman 存储 → 调用对应 `ServiceAdapter.writeOfficial` 写官方配置（claude/codex/gemini 等） → 持久化 ccman 状态。  
3.4 克隆：复制配置并生成新 id/name，允许覆盖部分字段；保留 model/env 元数据。  
3.5 校验：最少校验 name 非空；必要字段按 tool 适配器校验（如 Codex 需 baseUrl+apiKey，Gemini 允许空 baseUrl）。出错抛 `VALIDATION_FAILED`。

## 4. MCP 管理
4.1 存储：`~/.ccman/mcp.json`，包含 servers[] + enabledApps 映射。  
4.2 CRUD：同 Provider，保留 command/args/env/desc。  
4.3 应用：`applyMcp(name, targetTools[])` 通过各工具 `McpAdapter` 写入官方配置（Claude/Gemini），更新启用矩阵。  
4.4 容错：缺失配置文件也应创建并写入；未支持 MCP 的工具跳过并记录在报告中。

## 5. 配置文件操作
5.1 `listConfigPath(tool)` 返回 pathId → 绝对路径，含 scope 信息（user/project/system 若工具有多层，如 Gemini）。  
5.2 `getConfig(tool, pathId?)`：不存在文件时返回 `{}`；不影响后续逻辑。  
5.3 `updateConfig(tool, pathId, data, mode)`：读取现有/模板 → 合并 → 写入；mode 允许 `new-override-old | old-override-new`。  
5.4 允许外部直接操作配置层而不经过 Provider/MCP（高级用例）。

## 6. WebDAV / 同步
6.1 路径：同步基于当前 root 下 `.ccman` 与各工具官方配置。  
6.2 功能：`test`（连通+认证）、`upload`（加密 API Key 后上传）、`download`（下载覆盖本地，操作前自动备份）、`merge`（云↔本地智能合并）。  
6.3 合并策略：读取云/本地快照 → 差异规划（Provider/MCP/Config 分域）→ 分别调用对应服务写回 → 生成 SyncReport（新增/更新/删除/冲突列表与备份路径）。  
6.4 安全：AES-256 加密敏感字段；失败回滚，权限保持 0o600。

## 7. CLI 行为要点
7.1 子命令动态生成：依据 ToolRegistry 的 `capabilities` 决定是否暴露 service/mcp/config 相关命令。  
7.2 交互：友好错误映射统一错误码；展示当前 root、当前 provider、已启用 MCP。  
7.3 兼容层：旧命令路径仍可用（标记 deprecated），内部转调新 Core API，直至清理阶段。

## 8. Desktop 行为要点
8.1 Preload 仅暴露 Core API（无冗余胶水层）；Renderer 根据 ToolRegistry 动态渲染菜单。  
8.2 状态：使用 React state；无需 Redux/Zustand。  
8.3 提示：在设置页可切换 root，显示当前同步状态与备份信息。

## 9. 错误与报告
9.1 统一错误码：`TOOL_NOT_FOUND`, `SERVICE_NOT_FOUND`, `MCP_NOT_FOUND`, `CONFIG_PATH_NOT_FOUND`, `CONFIG_WRITE_FAILED`, `VALIDATION_FAILED`, `SYNC_CONFLICT`.  
9.2 报告：`applyService`/`applyMcp` 返回变更摘要（写入了哪些文件、备份位置）；`sync` 返回 SyncReport。

## 10. 兼容与迁移
10.1 保持现有数据格式（ccman json、官方配置字段覆盖范围）不变；新增字段以向后兼容默认值。  
10.2 旧路径策略（dev/test 用 tmp + pid）调整为固定路径但需提供清理脚本；测试前可清空 `/tmp/ccman-test`.  
10.3 模板放文件而非代码字符串，便于随官方格式更新；允许按工具热修模板。  
10.4 回滚：仍保留 `.bak`，必要时提供 `ccman restore <file.bak>`（可选）或文档化手动回滚步骤。

## 11. 合理性检查（反思点）
11.1 不再“无脑抽象” Writer 层，而是通过 ToolDescriptor+Adapter 保持清晰插拔性，避免旧架构的分支硬编码。  
11.2 根目录持久化解决“进程重启目录丢失”问题，同时保留 env 覆盖灵活性。  
11.3 缺失文件自愈、防空崩溃是现有代码的隐式需求（paths + writers 的 mkdir/默认值）；已在 API 层强制保障。  
11.4 模板深度合并沿用旧“零破坏写入”思想，但模板文件化提升可维护性与官方格式对齐。  
11.5 锁/备份/权限延续现有安全基线，不新增异步/额外依赖，符合项目约束。

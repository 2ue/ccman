# 当前可交付功能快照（基于 2025-12-06 代码）

面向用户的已实现能力，用于保证重构后功能不回退。

## 支持的工具与范围
- Codex：管理服务商（增/删/改/查/克隆/切换/当前）并写入 `~/.codex/config.toml`、`~/.codex/auth.json`。
- Claude Code：同上，写入 `~/.claude/settings.json`（env.ANTHROPIC_*）。
- Gemini CLI：同上，写入 `~/.gemini/settings.json` 与 `~/.gemini/.env`，支持 model/自定义 env。
- MCP 服务器：增/删/改/查，启用状态同步到 Claude & Gemini 的配置。
- ccman 自身：在 `~/.ccman/*.json` 维护各工具的服务商与 MCP 数据。

## 预设与模板
- 预设服务商：Claude 7 个、Gemini 3 个、Codex 1 个；MCP 多个常用模板。
- 模板文件存在于 `packages/core/templates`（按工具合并到官方配置）。

## CLI（`ccman`）可用命令
- 主菜单：`ccman` 交互式选择工具。
- 服务商命令：`ccman cx|cc|gm add|list|use|current|edit|remove|clone`.
- MCP 命令：`ccman mcp add|list|edit|remove`.
- 同步：`ccman sync [status|upload|download|merge]`（WebDAV）。
- 导入导出：`ccman export [dir]`、`ccman import [dir]`.

## Desktop（Electron + React）
- 可视化管理 Codex/Claude/Gemini/MCP。
- WebDAV 云同步：上传、下载、合并；API Key 加密；自动备份。
- 配置导入导出：本地文件夹备份/恢复。

## 核心行为特性
- 零破坏写入：仅修改托管字段，写前备份，失败回滚；文件权限 0600。
- 同步/导入导出都基于 `~/.ccman` 及各工具官方配置路径。
- 预设 + 自定义皆可；克隆用于多 Key 管理。
- 环境隔离：生产使用用户 Home；`NODE_ENV=development` 使用 `/tmp/ccman-dev`（持久），`NODE_ENV=test` 使用 `/tmp/ccman-test-*`。

> 本表仅覆盖用户可感知的功能，不涉及内部实现细节；重构需确保全部保留。 

# 变更提案：新增 OpenClaw 配置能力（CLI / GMN / aicoding / Desktop / Sync / 导入导出）

## 背景
当前 ccman 仅支持 Codex、Claude、Gemini、OpenCode 的服务商配置管理，缺少 OpenClaw 的统一管理能力。用户只能在其他机器或脚本中手动维护 OpenClaw 相关 JSON，无法通过 ccman 的 CLI、Desktop、GMN 一键流程和同步能力进行统一管理。

同时，现有 OpenClaw 教程路径带有 Ubuntu 示例路径，实际实现必须改为跨机器路径策略（基于 `HOME_DIR` / `~`），避免路径写死。
此外，当前项目在“核心能力与展示层口径”上已存在少量不一致（例如 Sync 核心工具集合与 CLI 展示、导入导出校验语义），本次新增 OpenClaw 需要一并补齐口径，避免分叉扩大。

## 目标
在不破坏现有工具行为的前提下，为 ccman 增加 OpenClaw 的完整配置管理链路：
- CLI 管理命令
- `ccman gmn` 一键配置（可选但默认不勾选）
- `aicoding` 一键配置（可选但默认不勾选）
- Desktop 图形化管理
- WebDAV 同步纳入 OpenClaw
- 导入导出纳入 OpenClaw

## 本次变更范围
1. 新增 OpenClaw 工具类型与配置管理（`~/.ccman/openclaw.json`）。
2. 新增 OpenClaw writer，写入：
- `~/.openclaw/openclaw.json`
- `~/.openclaw/agents/main/agent/models.json`
3. 在 `packages/core/templates/openclaw/` 新增基础模板文件：
- `openclaw.base.template.json`
- `models.base.template.json`
4. OpenClaw 写入策略采用“直接覆盖写入”（不做深度合并）。
5. CLI 增加 `ccman openclaw` 命令入口（可包含短别名），并在 `ccman` 无参交互主菜单中新增 OpenClaw 选项。
6. `ccman gmn` 与 `aicoding` 增加 `openclaw` 平台选项，但默认平台保持现状（不默认选中 `openclaw`）。
7. Desktop 新增 OpenClaw 管理入口（Provider CRUD、切换、预置、配置查看/编辑）。
8. Sync / Export / Import 增加 OpenClaw 配置文件管理，保持对旧数据和旧流程兼容。
9. 明确 OpenClaw 的 GMN 端点策略：`openclaw` 使用 `https://gmn.chuangzuoli.com/v1`，不改变其他平台现有端点策略。
10. 明确 `aicoding` 与 OpenClaw 的优先级规则：即使处于保护模式，OpenClaw 仍按“直接覆盖”策略写入。
11. 对 Sync 的核心集合与 CLI 状态/上传展示文案做一致性收敛（展示集合与实际同步集合一致）。
12. 导入导出校验语义调整为“支持集合中至少一个文件存在即可执行；缺失文件跳过”，保持旧包兼容。
13. 明确本次不改造历史 `scripts/setup-gmn*.mjs` 行为，仅保证 `ccman gmn` 与 `aicoding` 两条主链路一致。

## 兼容性与风险控制
- 现有命令与现有工具配置行为保持不变（Codex/Claude/Gemini/OpenCode/MCP 不回归）。
- 新能力以“增量接入”为主：新增 OpenClaw 路径、常量、manager、writer，不重构现有核心流程。
- OpenClaw 写入优先从 `packages/core/templates/openclaw/` 读取模板，并提供内置回退模板，适配打包场景。
- 对同步与导入导出采用“文件存在即处理，不存在跳过”的兼容策略，避免旧用户报错。
- 路径解析统一走现有 `paths` 机制（生产环境 `os.homedir()`，开发/测试环境复用当前规则），确保跨机器一致性。
- `aicoding` 中仅对 OpenClaw 采用“覆盖优先”，Codex/OpenCode 继续遵循既有保护/覆盖模式语义。

## 影响范围
- 受影响规范：`openclaw-integration`
- 受影响代码（预估）：
  - `packages/types`
  - `packages/core`
  - `packages/cli`
  - `packages/aicoding`
  - `packages/desktop`
  - `scripts`（仅文档/边界声明）
  - `README` / 相关文档

## 背景与约束
本次变更是跨模块的新增能力，涉及 `types/core/cli/aicoding/desktop/sync/export-import`。现有系统中：
- OpenClaw 尚未纳入工具管理。
- `gmn` / `aicoding` 当前平台列表不含 OpenClaw。
- Sync 与导入导出均为固定工具集合，缺少 OpenClaw。
- Sync 核心与 CLI 展示存在集合口径偏差，需要同步收敛。
- 导入导出当前校验语义偏“强约束”，与“缺失跳过”目标需明确统一规则。

同时必须满足：
- 路径不可写死 OS 或机器目录，需适配 `HOME_DIR`/`~`。
- 保持现有工具行为不变，不引入回归。
- OpenClaw 写入策略为直接覆盖写入。

## 目标
1. 让 OpenClaw 具备与现有工具一致的 Provider 管理体验（CLI + Desktop）。
2. 让 `ccman gmn` / `aicoding` 可选配置 OpenClaw，但默认不选中。
3. 让 Sync / Export / Import 将 OpenClaw 纳入管理。
4. 全程保持现有工具链行为兼容。

## 非目标
1. 不改造 OpenClaw 的 Gateway / Telegram / WhatsApp 远程渠道能力。
2. 不对现有工具（Codex/Claude/Gemini/OpenCode）的写入策略做语义变更。
3. 不进行全量架构重构（仅做增量接入）。

## 关键设计决策

### 决策 1：新增独立工具类型 `openclaw`
- 在 `@ccman/types` 与 `@ccman/core` 的工具类型中增加 `openclaw`。
- 在 `tool-manager` 的映射中新增 `openclaw` 配置条目，独立配置文件为 `~/.ccman/openclaw.json`。
- 保持现有类型与流程兼容，不修改现有工具 key。

原因：
- 复用现有 Provider 管理模型，避免为 OpenClaw 设计特例存储层。
- 将新增影响限制在“新增分支”，不侵入现有分支。

### 决策 2：OpenClaw writer 采用“模板+覆盖写入”策略
- 目标文件：
  - `~/.openclaw/openclaw.json`
  - `~/.openclaw/agents/main/agent/models.json`
- 模板来源：
  - `packages/core/templates/openclaw/openclaw.base.template.json`
  - `packages/core/templates/openclaw/models.base.template.json`
- 模板加载策略：
  - 优先读取模板文件（与现有 writer 一致）
  - 读取失败或打包后缺失时，使用内置回退模板继续写入
- 每次切换 Provider 时，直接覆盖写入两份文件（不与历史文件深度合并）。
- 覆盖字段至少包含：
  - `providers.<provider>.baseUrl/apiKey/api/authHeader/headers/models`
  - `agents.defaults.model.primary`
  - `agents.defaults.workspace`（来自 `HOME_DIR`）
- OpenClaw 的 GMN 默认端点固定为 `https://gmn.chuangzuoli.com/v1`（仅 OpenClaw 使用 `/v1`）。

原因：
- 用户已明确要求 OpenClaw 采用直接覆盖策略。
- 与手工教程的“关键字段对齐”目标一致，实现可预测。
- 模板文件与现有 Codex/Gemini/OpenCode writer 的模板机制一致，便于后续升级字段。

### 决策 3：路径解析统一复用 `paths` 机制
- 在 `core/paths.ts` 新增 OpenClaw 路径 getter：
  - `getOpenClawDir()`
  - `getOpenClawConfigPath()`
  - `getOpenClawModelsPath()`
- 生产使用 `os.homedir()`，开发/测试复用现有逻辑。

原因：
- 防止出现 Ubuntu 路径写死。
- 保持测试环境可控，便于单测隔离。

### 决策 4：`gmn` / `aicoding` 平台策略
- 新增 `openclaw` 可选平台。
- 默认平台维持现状，不默认选中 `openclaw`。
- `all` 语义包含 `openclaw`。
- `aicoding` 模式优先级明确为：
  - OpenClaw 永远按“直接覆盖”写入（不受保护模式影响）
  - Codex/OpenCode 保持既有“保护/全覆盖”语义不变
- `ccman gmn` 与 `aicoding` 在 OpenClaw 上的 GMN 端点一致（`/v1`）。

原因：
- 满足“包含但不默认选中”的业务要求。
- 兼顾向后兼容与可发现性。

### 决策 5：Sync / Export / Import 的兼容扩展
- Sync：
  - 将 `openclaw.json` 纳入上传/下载/合并
  - CLI 的 `status/upload` 展示集合与核心同步集合保持一致
- Export/Import：
  - 将 `openclaw.json` 纳入可导出/可导入集合
  - 校验语义调整为“支持集合中至少一个文件存在即可执行”
  - 对缺失文件采用“跳过”而非失败（保持旧包可导入）

原因：
- 用户明确要求纳入统一管理。
- 通过“存在即处理，不存在跳过”保持当前用户路径无破坏。
- 通过“展示集合 == 实际集合”避免 Sync 认知偏差。

### 决策 6：Desktop 增量接入 OpenClaw 页面与 IPC
- Main/Preload 增加 `openclaw:*` IPC 与 API 暴露。
- Renderer 增加 OpenClaw 页面、导航项、卡片、预置管理入口。
- 同步更新所有工具联合类型与分支判断（App、Modal、ProviderForm、ProviderGrid、Dashboard、Sidebar、Config API）。
- 配置文件编辑面板增加 OpenClaw 相关文件读取展示。

原因：
- 与现有桌面端架构一致（每个工具独立 API + 页面）。
- 最小风险复用现有组件模式。

### 决策 7：历史脚本边界（`scripts/setup-gmn*.mjs`）本次不改行为
- 本次仅保证 `ccman gmn` 与 `aicoding` 两条主链路接入 OpenClaw 并语义一致。
- `scripts/setup-gmn.mjs` 与 `scripts/setup-gmn-standalone.mjs` 不做行为改造，避免扩大变更面。
- 文档明确其“历史脚本/可选脚本”定位，避免与主链路规则冲突。

原因：
- 用户目标聚焦 CLI、gmn、aicoding、desktop、sync、import/export 主流程。
- 控制风险，避免在同一变更中引入脚本链路回归。

## 一致性与回归控制
1. 采用“新增分支，不改旧分支”策略，已有工具代码仅做必要的类型扩展。
2. 对所有新增逻辑补充单元测试与关键集成路径验证。
3. 对 `gmn` / `aicoding` 默认值保持不变，避免脚本行为突变。
4. 对 Sync/导入导出采用向后兼容读取策略，旧数据结构继续可用。
5. 强制校验“Sync 展示集合与核心集合一致”，避免核心与 CLI/Desktop 文案分叉。
6. OpenClaw writer 强制具备“模板文件读取失败时的内置回退”能力，避免打包环境故障。

## 风险与缓解
1. 风险：OpenClaw 覆盖写入导致用户手工字段丢失。
   缓解：在文档与命令提示中明确“覆盖策略”；必要时提供备份。
2. 风险：类型扩展波及范围大（Desktop 多处联合类型）。
   缓解：分层修改（types -> core -> preload/main -> renderer），每层做编译验证。
3. 风险：Sync 扩容影响既有工具流程。
   缓解：仅新增 `openclaw` 项，不改变既有工具处理顺序与加密逻辑。
4. 风险：`/v1` 端点策略误用到其他平台导致行为变化。
   缓解：在 `gmn` / `aicoding` 中将端点策略显式区分为“OpenClaw 专用”。
5. 风险：aicoding 的模式语义因 OpenClaw 接入变得不清晰。
   缓解：文档与实现同时固定“OpenClaw 覆盖优先，其他平台语义不变”。

## ADDED Requirements
### Requirement: OpenClaw Provider 管理能力
系统 SHALL 提供 OpenClaw 的 Provider 管理能力，并与现有工具保持一致的增删改查、切换、克隆行为。

#### Scenario: 使用 CLI 管理 OpenClaw Provider
- **WHEN** 用户执行 `ccman openclaw` 相关 CLI 命令（添加、编辑、删除、切换、克隆、查看）
- **THEN** 系统 SHALL 在 `~/.ccman/openclaw.json` 中正确维护 Provider 数据与当前激活项

#### Scenario: 无参数启动时主菜单可见 OpenClaw
- **WHEN** 用户执行 `ccman` 且未带子命令进入交互主菜单
- **THEN** 系统 SHALL 展示 OpenClaw 管理入口

#### Scenario: 使用 Desktop 管理 OpenClaw Provider
- **WHEN** 用户在 Desktop 中进入 OpenClaw 页面并执行 Provider 操作
- **THEN** 系统 SHALL 通过与 CLI 等价的核心逻辑完成配置管理并刷新界面状态

### Requirement: OpenClaw 配置文件覆盖写入
系统 SHALL 在切换 OpenClaw 当前 Provider 时，直接覆盖写入 OpenClaw 目标配置文件，并写入 GMN/OpenAI Responses 所需关键字段。

#### Scenario: 使用 core 模板生成 OpenClaw 配置
- **WHEN** 系统执行 OpenClaw 配置写入
- **THEN** 系统 SHALL 使用 `packages/core/templates/openclaw/openclaw.base.template.json` 与 `packages/core/templates/openclaw/models.base.template.json` 作为模板来源

#### Scenario: 切换 Provider 时覆盖写入目标文件
- **WHEN** 用户切换到某个 OpenClaw Provider
- **THEN** 系统 SHALL 覆盖写入 `~/.openclaw/openclaw.json` 与 `~/.openclaw/agents/main/agent/models.json`
- **AND** 写入内容 SHALL 包含 `baseUrl`、`apiKey`、`api=openai-responses`、`authHeader`、`headers`、`models`、`agents.defaults.model.primary`

#### Scenario: 路径按 HOME_DIR 解析
- **WHEN** 系统在不同机器或不同环境（生产/开发/测试）执行 OpenClaw 写入
- **THEN** 系统 SHALL 基于 HOME_DIR 语义解析路径，不依赖固定 Ubuntu 绝对路径

#### Scenario: 模板文件缺失时使用内置回退
- **WHEN** 运行环境无法读取 OpenClaw 模板文件
- **THEN** 系统 SHALL 使用内置回退模板继续完成写入
- **AND** 回退写入结果 SHALL 仍包含 OpenClaw 必需关键字段

### Requirement: GMN 与 aicoding 支持 OpenClaw 平台选项
系统 SHALL 在 `ccman gmn` 与 `aicoding` 中提供 `openclaw` 平台选项，但默认选择中不包含 `openclaw`。

#### Scenario: 默认平台不包含 OpenClaw
- **WHEN** 用户直接执行 `ccman gmn` 或 `aicoding` 且不显式指定平台
- **THEN** 系统 SHALL 使用既有默认平台集合
- **AND** 默认集合 SHALL NOT 包含 `openclaw`

#### Scenario: 显式选择 OpenClaw 平台
- **WHEN** 用户在平台参数或交互中选择 `openclaw`
- **THEN** 系统 SHALL 执行 OpenClaw 配置写入流程

#### Scenario: 选择 all 时包含 OpenClaw
- **WHEN** 用户选择 `all`
- **THEN** 系统 SHALL 将 `openclaw` 纳入执行平台集合

#### Scenario: OpenClaw 使用 GMN `/v1` 端点
- **WHEN** 用户通过 `ccman gmn` 或 `aicoding` 配置 `openclaw`
- **THEN** 系统 SHALL 对 OpenClaw 写入 `baseUrl=https://gmn.chuangzuoli.com/v1`
- **AND** 其他既有平台 SHALL 继续使用其原有端点策略

#### Scenario: aicoding 保护模式下 OpenClaw 仍覆盖写入
- **WHEN** 用户在 `aicoding` 保护模式中选择 `openclaw`
- **THEN** 系统 SHALL 对 OpenClaw 执行直接覆盖写入
- **AND** 其他平台 SHALL 保持既有保护/覆盖语义

### Requirement: Sync 纳入 OpenClaw 配置
系统 SHALL 在上传、下载、合并同步流程中纳入 OpenClaw 配置文件，并保持现有工具同步行为不变。

#### Scenario: 上传同步包含 OpenClaw
- **WHEN** 用户执行上传同步
- **THEN** 系统 SHALL 将 OpenClaw 配置上传到远端并沿用现有加密/解密策略

#### Scenario: 下载与合并兼容旧数据
- **WHEN** 远端或本地缺失 OpenClaw 配置文件
- **THEN** 系统 SHALL 跳过 OpenClaw 处理而非中断整个同步流程

#### Scenario: Sync 展示集合与实际同步集合一致
- **WHEN** 用户执行 Sync 状态查询或上传前检查
- **THEN** 系统 SHALL 展示与实际同步处理一致的工具集合
- **AND** 展示集合 SHALL 包含 OpenClaw

### Requirement: 导入导出纳入 OpenClaw 配置
系统 SHALL 在导出与导入流程中支持 OpenClaw 配置文件，并保持旧导入包可用。

#### Scenario: 导出包含 OpenClaw 配置
- **WHEN** 本地存在 OpenClaw 配置文件
- **THEN** 系统 SHALL 在导出目录中包含 OpenClaw 配置文件

#### Scenario: 导入兼容无 OpenClaw 的旧包
- **WHEN** 用户导入的配置包不包含 OpenClaw 文件
- **THEN** 系统 SHALL 继续完成其他已有配置文件的导入，不因缺失 OpenClaw 而失败

#### Scenario: 支持集合至少一个文件即可导入导出
- **WHEN** 导入目录或导出源中仅存在支持集合中的单个配置文件（例如仅 `openclaw.json`）
- **THEN** 系统 SHALL 允许执行并处理该文件
- **AND** 对支持集合中缺失的其他文件 SHALL 跳过处理而非失败

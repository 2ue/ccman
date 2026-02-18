## 1. Core 与类型
- [x] 1.1 在 `@ccman/types` 与 `@ccman/core` 增加 `openclaw` 工具类型与常量映射
- [x] 1.2 在 `core/paths` 增加 OpenClaw 路径解析（`~/.openclaw`、`openclaw.json`、`models.json`）
- [x] 1.3 在 `packages/core/templates/openclaw/` 新增 `openclaw.base.template.json` 与 `models.base.template.json`
- [x] 1.4 新增 OpenClaw presets 与 writer（基于模板直接覆盖写入两份目标文件）
- [x] 1.5 将 OpenClaw manager 接入 `tool-manager` 与 `core` 对外导出
- [x] 1.6 OpenClaw writer 补充“模板文件缺失时使用内置回退”的实现与测试
- [x] 1.7 为 OpenClaw writer 和 manager 增加测试（包含覆盖写入与关键字段断言）

## 2. CLI 与一键配置
- [x] 2.1 新增 `ccman openclaw` CLI 命令入口（含对应子命令与可选短别名）
- [x] 2.2 在 `ccman` 无参交互主菜单中增加 OpenClaw 选项
- [x] 2.3 将 `ccman gmn` 增加 `openclaw` 平台（可选但默认不选中）
- [x] 2.4 将 `aicoding` 增加 `openclaw` 平台（可选但默认不选中）
- [x] 2.5 在 `ccman gmn` 与 `aicoding` 中明确 OpenClaw GMN 端点为 `https://gmn.chuangzuoli.com/v1`（仅 OpenClaw 使用 `/v1`）
- [x] 2.6 在 `aicoding` 中实现 OpenClaw 覆盖优先规则（不受保护模式影响）
- [x] 2.7 更新 CLI / aicoding 帮助与文档说明（默认不选中 + 覆盖策略 + `/v1` 规则）

## 3. Desktop
- [x] 3.1 Main 进程增加 `openclaw:*` IPC 处理器与配置文件读取入口
- [x] 3.2 Preload 暴露 `openclaw` API 与类型声明
- [x] 3.3 Renderer 增加 OpenClaw 页面、导航、Dashboard 卡片、Add/Edit/Clone 流程接入
- [x] 3.4 同步更新 Desktop 各处工具联合类型与分支逻辑（App/Modal/Form/Grid/Config API）
- [x] 3.5 配置文件编辑写入流程保证 OpenClaw 深层路径可创建（避免目录不存在写入失败）
- [x] 3.6 预置服务商页面增加 OpenClaw 分组与使用流程

## 4. Sync / 导入导出
- [x] 4.1 Sync 上传/下载/合并纳入 `openclaw.json`
- [x] 4.2 Sync CLI 的 `status/upload` 展示集合与核心同步集合保持一致
- [x] 4.3 Export/Import 纳入 `openclaw.json`
- [x] 4.4 Export/Import 校验调整为“支持集合至少一个文件存在即可执行”
- [x] 4.5 对缺失 OpenClaw 文件保持兼容（跳过而非报错）
- [x] 4.6 补充 Sync 与导入导出相关测试（含缺失文件、单文件导入导出场景）

## 5. 验证与发布准备
- [x] 5.1 运行 typecheck / test，确认无回归
- [x] 5.2 补充 README 与关键路径示例（尤其是覆盖写入策略、`/v1` 规则与平台默认值）
- [ ] 5.3 人工验证：CLI、gmn、aicoding、Desktop、sync、import/export 端到端流程
- [x] 5.4 文档中统一术语为 `openclaw`（清理 `openclawd` 残留）
- [ ] 5.5 明确历史 `scripts/setup-gmn*.mjs` 不在本次行为改造范围

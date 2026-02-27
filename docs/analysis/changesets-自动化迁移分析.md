# Changesets 自动化迁移分析

## 目标

- 引入 Changesets 作为变更说明输入源
- 保持现有 `tag -> release.yml -> 构建/发包/发版` 主链路不变
- 自动化保证「有发布相关代码改动就必须有 changeset」

## 自动化环境选择

选择：GitHub Actions（仓库内自动化）

原因：

- 与现有发布链路同环境，最小认知成本
- 变更记录和失败日志集中在 PR / Release 页面，审计成本低
- 不依赖开发者本地 hook 和本地环境差异
- 可在 PR 阶段提前阻断缺失 changeset，避免发布时补救

## 落地策略

1. PR 阶段：`changeset-check.yml`
- 对发布相关文件改动强制要求 `.changeset/*.md`
- docs/workflow/纯 markdown 改动自动豁免

2. Release 阶段：`release.yml`
- 运行 `pnpm run changelog:consume`
- 优先消费 pending changesets 生成当前版本根 `CHANGELOG.md` 段落
- 若无 pending changesets，回退到 conventional 增量逻辑（兼容历史流程）
- 发布后将已消费文件归档到 `.changeset/archive/v<version>/`

3. 同步阶段
- 把 `CHANGELOG.md` 和 `.changeset` 一起回写 `main`
- 防止下次发版重复消费同一批 changeset

## 风险与控制

- 风险：迁移初期可能存在未写 changeset 的旧分支
- 控制：PR 校验明确失败提示；必要时补写 changeset 后合并

- 风险：发布时无 pending changesets
- 控制：保留 conventional fallback，确保发布不中断

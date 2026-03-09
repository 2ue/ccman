# GMN 快捷配置脚本说明

本目录中与 GMN 相关的快捷脚本，当前统一遵循同一条规则：

- **快捷配置脚本 = 覆盖写入**
- **常规 provider 管理 = 增量写入**

也就是说：

- `ccman gmn` / `ccman gmn1` / `ccman gmncode`
- `scripts/setup-gmn.mjs`
- `scripts/setup-gmn-standalone.mjs`
- `@2ue/aicoding`

都属于“快捷配置入口”，目标是快速落下一套已知可用的配置，因此采用覆盖写入语义。

## 脚本列表

### `scripts/setup-gmn.mjs`

- 依赖 `ccman` 的 core 能力
- 会创建/复用 ccman 中的 provider 数据
- 最终按快捷覆盖语义应用到 Claude / Codex / Gemini / OpenCode

用法：

```bash
node scripts/setup-gmn.mjs
node scripts/setup-gmn.mjs sk-ant-xxx
```

### `scripts/setup-gmn-standalone.mjs`

- 不依赖 ccman
- 直接写 Claude / Codex / Gemini / OpenCode 的目标配置文件
- 当前同样遵循快捷覆盖语义

用法：

```bash
node scripts/setup-gmn-standalone.mjs
node scripts/setup-gmn-standalone.mjs sk-ant-xxx
node scripts/setup-gmn-standalone.mjs --overwrite
```

`--overwrite` 仅用于兼容旧用法；当前脚本默认即为快捷覆盖模式。

## 如果你想要“尽量保留现有配置”

不要使用这些快捷脚本。请改用常规管理入口：

```bash
ccman cx
ccman cc
ccman gm
ccman oc
ccman openclaw
```

或者对应的：

```bash
ccman cx add/use/edit
ccman cc add/use/edit
ccman gm add/use/edit
ccman oc add/use/edit
ccman openclaw add/use/edit
```

这些入口默认按增量管理语义执行，会尽量保留非托管字段。

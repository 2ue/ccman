# OpenClaw 图像输入与 GPT 模板调整分析

## 1. 背景

本次调整有两个目标：

1. 将 `packages/core/templates` 中涉及 GPT 的模板模型统一收敛到：
   - `gpt-5.4`
   - `gpt-5.3-codex`
2. 修正 OpenClaw 当前模板中“图片输入无法稳定走主模型识别”的问题

用户期望是：

- **优先使用 `gpt-5.4`**
- **如果配置允许多个模型，则保留多个模型**
- 但不能为了“支持更多输入类型”而随意在配置里乱加能力声明

---

## 2. 代码现状与问题定位

本次核对的关键文件：

- `packages/core/templates/openclaw/openclaw.base.template.json`
- `packages/core/templates/openclaw/models.base.template.json`
- `packages/core/templates/opencode/opencode.json`
- `packages/core/src/writers/openclaw.ts`
- `packages/core/src/writers/opencode.ts`

### 2.1 旧问题一：OpenClaw 模型能力被声明成 text-only

在原始模板中，OpenClaw 的两个模型都被写成了：

- `input: ["text"]`

这会带来一个直接后果：

- 即使底层模型本身支持图片，OpenClaw 也可能先把它视为“当前主模型不接受图片”
- 之后再转向 `imageModel` 或 `tools.media` 对应的外部识别路径

### 2.2 旧问题二：没有显式声明 `imageModel`

原始模板只设置了：

- `agents.defaults.model.primary`

但没有显式设置：

- `agents.defaults.imageModel`

这意味着：

- 当主模型被用户切换成一个文本型模型时，图片请求缺少明确的“原生图像模型兜底”
- OpenClaw 更容易走工具链或外部媒体理解链路

### 2.3 旧问题三：第二模型还是旧的 `gpt-5.2-codex`

模板中第二模型仍是：

- `gpt-5.2-codex`

这和本次要求的统一目标不一致，应更新为：

- `gpt-5.3-codex`

---

## 3. OpenClaw 官方文档结论

本次判断主要参考 OpenClaw 官方文档：

- AI Providers：<https://docs.openclaw.ai/configuration/ai-providers>
- Configuration（自定义 provider / 模型列表示例）：<https://docs.openclaw.ai/configuration/configuration>
- Tools（`media` 工具说明）：<https://docs.openclaw.ai/configuration/tools>

结合文档，可以确认三点：

### 3.1 `input` 是“模型能力声明”，不是任意开关

官方配置示例中的自定义模型条目，会为每个模型单独声明输入能力，例如：

- `["text"]`
- `["text", "image"]`

这说明：

- `input` 的语义是“告诉 OpenClaw 这个模型原生支持哪些输入模态”
- 不是“我希望它支持什么，就写什么”

因此，如果某个模型并没有官方确认支持某种输入，就不应该随意加进 `input`

### 3.2 `imageModel` 是图片请求的专用兜底模型

官方文档说明：

- 当当前主模型不支持图片时，OpenClaw 会使用 `imageModel`

这意味着更稳妥的做法是：

- 把真正可处理图片的模型放到 `imageModel`
- 而不是把所有候选模型都声明成 image-capable

### 3.3 `tools.media` 是另一条链路

官方工具文档说明 `media` 工具可负责媒体理解，并且支持自动检测外部能力来源。

因此当前项目里出现：

- 用户发图后没有走主模型原生视觉
- 反而去调工具或外部识别链路

并不是偶然，而是配置层会直接影响 OpenClaw 的路由决策。

---

## 4. 本次采用的安全配置策略

### 4.1 最终策略

本次最终采用“两个模型都按官方能力声明 image 输入”的方案：

- `gpt-5.4`
  - 作为主模型
  - 声明 `input: ["text", "image"]`
  - 同时作为 `imageModel`
- `gpt-5.3-codex`
  - 作为第二模型保留
  - 声明 `input: ["text", "image"]`

### 4.2 为什么这样更稳

因为这里要同时满足两件事：

1. 让 OpenClaw 在默认情况下明确知道：`gpt-5.4` 可以原生收图
2. 让模板能力声明与官方模型能力保持一致

也就是说：

- `gpt-5.4` 负责默认主模型与图片兜底
- `gpt-5.3-codex` 也具备原生图片输入声明
- 同时仍通过 `imageModel` 保持优先路由到 `gpt-5.4`

---

## 5. “如果还要解析其他类型怎么办？”

结论是：

- **需要额外加**
- **但不能现在随便加**

必须同时满足两个前提：

1. OpenClaw 官方配置明确支持该输入类型
2. 实际接入的底层模型 / API 也真的支持该输入类型

否则会出现两类风险：

- 配置写了，但 OpenClaw 根本不识别这个能力值
- OpenClaw 识别了，但底层模型不支持，最后仍会失败或退回工具链

### 5.1 当前不建议直接添加的原因

截至本次核对，我能从 OpenClaw 官方配置文档中稳定确认的自定义 provider 输入能力，核心是：

- `text`
- `image`

我**没有找到足够明确的官方文档**说明可以直接在这个字段里安全地扩展为例如：

- `audio`
- `pdf`
- `file`
- `video`

因此当前不建议凭猜测把这些值写进模板。

### 5.2 正确做法

如果后续你希望支持更多模态，建议按下面顺序推进：

1. 先核 OpenClaw 官方文档或源码，确认 `input` 支持的合法枚举
2. 再核实际模型文档，确认该模型是否支持该模态
3. 只有两边都成立，才把能力写进模板

在这之前，其他类型更适合走：

- OpenClaw 的工具链能力
- 或上游预处理 / 转换链路

---

## 6. 本次实际落地改动

### 6.1 OpenClaw 模板

已调整：

- `packages/core/templates/openclaw/openclaw.base.template.json`
- `packages/core/templates/openclaw/models.base.template.json`

改动内容：

- 保留 `gpt-5.4` 为首选模型
- 将第二模型从 `gpt-5.2-codex` 改为 `gpt-5.3-codex`
- 将 `gpt-5.4` 的 `input` 改为 `["text", "image"]`
- 将 `gpt-5.3-codex` 的 `input` 也改为 `["text", "image"]`
- 新增 `agents.defaults.imageModel = "{{providerName}}/gpt-5.4"`

### 6.2 OpenClaw 内置回退模板

已同步调整：

- `packages/core/src/writers/openclaw.ts`

避免模板文件缺失时，运行时行为和磁盘模板不一致。

### 6.3 OpenCode 模板与默认模型集合

已同步调整：

- `packages/core/templates/opencode/opencode.json`
- `packages/core/src/writers/opencode.ts`

改动内容：

- 第二模型从 `gpt-5.2-codex` 改为 `gpt-5.3-codex`
- 默认模型集合保留两个模型
- 合并写回时也会自动补齐第二模型，避免用户已有配置里丢失它

---

## 7. 验证结果

本次验证全部在隔离测试目录进行，没有触碰本地真实配置。

已执行：

- `pnpm --filter=@ccman/core build`
- `pnpm --filter=@ccman/core exec vitest run src/writers/openclaw.test.ts src/tool-manager.openclaw.test.ts src/writers/opencode.test.ts`

结果：

- 3 个测试文件通过
- 8 个测试用例通过

覆盖点包括：

- OpenClaw 默认写入
- OpenClaw merge 行为
- OpenClaw manager 写入
- OpenCode 默认写入
- OpenCode merge / overwrite 行为

---

## 8. 最终建议

当前最合理的结论是：

- **不要把 OpenClaw 的 `input` 当成任意扩展能力开关**
- **先把图片这条链路配置正确**
- **优先由 `gpt-5.4` 承担图片输入**
- **由 `imageModel` 显式兜底**
- **同时让 `gpt-5.3-codex` 的能力声明与官方模型页保持一致**

如果你下一步要继续做“音频 / PDF / 其他附件”的原生输入支持，我建议单独开一个分析项，先核：

1. OpenClaw 官方允许的 `input` 枚举
2. 目标模型的真实模态支持矩阵
3. 是否应该走 `tools.media`，还是走模型原生多模态

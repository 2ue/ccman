---
description: 发布新版本并打tag到远程仓库
gitignored: true
---

# 🚀 Release 发布流程

**用法**: `/release [major|minor|patch]`

示例:
- `/release patch` - 补丁版本（3.1.0 → 3.1.1）
- `/release minor` - 次要版本（3.1.0 → 3.2.0）
- `/release major` - 主要版本（3.1.0 → 4.0.0）

---

## 发布前检查（必须执行）

### 1. 版本号一致性检查

```bash
grep -h '"version":' package.json packages/*/package.json
```

**预期结果**：所有 package.json 的版本号必须相同

### 2. 业务逻辑修改检查

```bash
git diff --name-only HEAD~1 | grep -E '\.(ts|tsx|js|jsx)$' | grep -v -E '(test|spec|\.d\.ts)'
```

**必须满足**：
- ✅ 有业务逻辑修改（packages/*/src/**/*.ts）
- ❌ 纯文档修改（README.md、docs/）不打 tag
- ❌ 纯配置修改（.eslintrc、tsconfig.json）不打 tag

### 3. 远程 tag 检查

```bash
git fetch --tags
# 假设新版本为 v3.2.0
git tag -l | grep v3.2.0
```

**预期结果**：远程不存在同名 tag（无输出）

---

## 发布步骤

### Step 1: 计算新版本号

根据用户输入的 bump 类型，从当前 package.json 读取版本号并计算新版本：

```typescript
// 读取当前版本
const currentVersion = require('./package.json').version // 例如: "3.1.0"

// 根据 bump 类型计算新版本
// - patch: 3.1.0 → 3.1.1
// - minor: 3.1.0 → 3.2.0
// - major: 3.1.0 → 4.0.0
```

### Step 2: 生成/更新 CHANGELOG.md

```bash
# 更新 CHANGELOG.md（追加本次版本的改动）
pnpm changelog:latest
```

**检查输出**：
- 确认 CHANGELOG.md 已更新
- 确认新版本的改动已记录

### Step 3: 修改版本号

```bash
# 使用统一脚本修改所有包的版本号
pnpm version <new-version>

# 例如: pnpm version 3.2.0
```

**验证**：
```bash
grep -h '"version":' package.json packages/*/package.json
```

### Step 4: 运行测试

```bash
pnpm test
```

**要求**：所有测试必须通过

### Step 5: 构建

```bash
pnpm build
```

**要求**：构建成功，无错误

### Step 6: 提交并打 tag

```bash
git add .
git commit -m "chore: bump version to <new-version>"
git tag v<new-version>
```

**示例**：
```bash
git add .
git commit -m "chore: bump version to 3.2.0"
git tag v3.2.0
```

### Step 7: 推送到远程

```bash
git push && git push --tags
```

**结果**：
- 代码推送到远程仓库
- Tag 推送触发 GitHub Actions
- 自动发布 CLI 到 npm
- 自动构建并发布 Desktop 应用

---

## 自动化流程

执行 `/release patch` 后，应该自动完成以下操作：

1. ✅ 检查当前工作区是否干净（git status）
2. ✅ 计算新版本号（根据 bump 类型）
3. ✅ 生成 CHANGELOG（pnpm changelog:latest）
4. ✅ 修改版本号（pnpm version <new-version>）
5. ✅ 运行测试（pnpm test）
6. ✅ 运行构建（pnpm build）
7. ✅ 提交更改（git commit）
8. ✅ 创建 tag（git tag）
9. ✅ 推送到远程（git push && git push --tags）

每一步失败都应该**立即停止**，并给出明确的错误提示。

---

## 发布失败处理

### 场景 1: Tag 已存在

```bash
# ❌ 不要删除远程 tag！
# ✅ 正确做法：增加版本号
pnpm version 3.2.1  # 使用下一个版本号
git add .
git commit -m "chore: bump version to 3.2.1"
git tag v3.2.1
git push && git push --tags
```

### 场景 2: 测试失败

```bash
# 修复测试问题
# 重新运行 /release <bump-type>
```

### 场景 3: 构建失败

```bash
# 修复构建问题
# 重新运行 /release <bump-type>
```

---

## 版本号规则（Semantic Versioning）

- **Major (x.0.0)**：破坏性变更（如配置文件格式变更）
- **Minor (0.x.0)**：新功能（如添加新命令）
- **Patch (0.0.x)**：Bug 修复

---

## 注意事项

⚠️ **禁止的操作**：
- ❌ 手动修改 package.json 版本号
- ❌ 使用 `npm version` 命令
- ❌ 纯文档修改打 tag
- ❌ Tag 与 package.json 版本不一致

✅ **必须遵守**：
- ✅ 统一使用 `pnpm version <version>` 修改版本号
- ✅ 只有业务逻辑修改才打 tag 发布
- ✅ Tag 名称（v3.2.0）必须与 package.json 版本（3.2.0）一致
- ✅ 所有包的版本号必须保持一致

---

## 参考文档

- `CLAUDE.md` - 发布规范（第 577-602 行）
- `scripts/bump-version.js` - 版本号修改脚本
- `.changelogrc.js` - Changelog 生成配置

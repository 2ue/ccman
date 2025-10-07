# GitHub Actions 自动发布指南

本项目配置了两个 GitHub Actions workflow，用于自动发布 npm 包和构建 Desktop 应用。

## 📋 前置准备

### 1. npm Token 配置

发布到 npm 需要配置 NPM_TOKEN：

1. 登录 [npmjs.com](https://www.npmjs.com/)
2. 进入 **Account Settings** → **Access Tokens**
3. 点击 **Generate New Token** → 选择 **Automation**
4. 复制生成的 token

5. 在 GitHub 仓库设置 Secret：
   - 进入仓库 **Settings** → **Secrets and variables** → **Actions**
   - 点击 **New repository secret**
   - Name: `NPM_TOKEN`
   - Value: 粘贴你的 npm token
   - 点击 **Add secret**

### 2. npm 包作用域配置

确保你在 npm 上有 `@ccman` 组织权限：

```bash
# 创建组织（如果不存在）
# 在 npmjs.com 上创建 organization: @ccman

# 或者，修改 package.json 使用你自己的作用域
# 例如: @yourusername/core, @yourusername/cli
```

## 🚀 发布流程

### 自动发布（推荐）

1. **确保所有模块版本号一致**

```bash
# 检查版本号
grep '"version"' packages/*/package.json

# 如果需要更新版本号
cd packages/core && npm version 0.2.0
cd packages/cli && npm version 0.2.0
cd packages/desktop && npm version 0.2.0
```

2. **提交所有更改**

```bash
git add .
git commit -m "chore: release v0.2.0"
```

3. **创建并推送 tag**

```bash
# 创建 tag（格式：v + 版本号）
git tag v0.2.0

# 推送 tag 到 GitHub
git push origin v0.2.0
```

4. **自动触发流程**

推送 tag 后，GitHub Actions 会自动：
- ✅ 运行所有测试
- ✅ 构建所有模块
- ✅ 发布 @ccman/core 到 npm
- ✅ 发布 @ccman/cli 到 npm
- ✅ 构建 macOS 应用（Universal Binary）
- ✅ 构建 Windows 应用（x64）
- ✅ 创建 GitHub Release
- ✅ 上传安装包到 Release

### 手动发布

如果需要手动发布到 npm：

```bash
# 1. 构建所有包
pnpm build

# 2. 发布 core
cd packages/core
pnpm publish --access public

# 3. 发布 cli
cd packages/cli
pnpm publish --access public
```

## 📦 Workflows 说明

### 1. publish-npm.yml

**触发条件**: 推送格式为 `v*` 的 tag

**执行步骤**:
1. 检出代码
2. 设置 Node.js 18 和 pnpm 9
3. 安装依赖（使用缓存）
4. 运行所有测试
5. 构建所有包
6. 验证 tag 版本号与 package.json 一致
7. 发布 @ccman/core 到 npm
8. 发布 @ccman/cli 到 npm
9. 创建 GitHub Release（包含 npm 链接）

**环境变量**:
- `NPM_TOKEN`: npm 访问令牌（Secret）
- `GITHUB_TOKEN`: 自动提供

### 2. build-desktop.yml

**触发条件**: 推送格式为 `v*` 的 tag

**执行步骤**:
1. **构建任务** (并行执行):
   - macOS: 构建 Universal Binary (.dmg)
   - Windows: 构建 x64 安装包 (.exe)
2. **发布任务**:
   - 下载所有构建产物
   - 创建或更新 GitHub Release
   - 上传安装包

**支持平台**:
- **macOS**: Universal Binary (支持 Intel 和 Apple Silicon)
- **Windows**: 64-bit NSIS 安装程序

## 🔍 监控和调试

### 查看 Workflow 运行状态

1. 进入仓库 **Actions** 标签页
2. 点击具体的 workflow run
3. 查看每个 job 的日志

### 常见问题

#### 1. npm 发布失败：权限错误

**错误**: `403 Forbidden - PUT https://registry.npmjs.org/@ccman/core`

**解决**:
- 检查 NPM_TOKEN 是否正确配置
- 确认你在 npm 上有 @ccman 组织的发布权限
- 或修改包名为你自己的作用域

#### 2. 版本号不匹配

**错误**: `Version mismatch!`

**解决**:
```bash
# 确保所有包版本号一致
cd packages/core && npm version 0.2.0
cd packages/cli && npm version 0.2.0
cd packages/desktop && npm version 0.2.0

# 然后重新创建 tag
git tag -d v0.2.0          # 删除本地 tag
git push --delete origin v0.2.0  # 删除远程 tag
git tag v0.2.0             # 重新创建
git push origin v0.2.0     # 推送
```

#### 3. Desktop 构建失败

**错误**: 缺少 icon 文件

**解决**:
```bash
# 创建 icon 目录和占位图标
mkdir -p packages/desktop/build

# 可以稍后添加实际的图标文件
# build/icon.icns (macOS)
# build/icon.ico (Windows)
```

#### 4. 测试失败导致发布中断

**错误**: `ELIFECYCLE Test failed`

**解决**:
```bash
# 本地运行测试确保通过
pnpm -r test

# 修复失败的测试后重新提交和推送 tag
```

## 📝 版本管理最佳实践

### 语义化版本

遵循 [Semantic Versioning](https://semver.org/):

- `v0.1.0` → `v0.1.1`: 补丁版本（bug 修复）
- `v0.1.0` → `v0.2.0`: 次版本（新功能）
- `v0.1.0` → `v1.0.0`: 主版本（破坏性更改）

### 预发布版本

测试版本使用 alpha/beta 标记：

```bash
# Alpha 版本
git tag v0.2.0-alpha.1
git push origin v0.2.0-alpha.1

# Beta 版本
git tag v0.2.0-beta.1
git push origin v0.2.0-beta.1
```

预发布版本会自动标记为 **prerelease**。

### 发布检查清单

发布前确认：

- [ ] 所有测试通过 (`pnpm -r test`)
- [ ] 所有包能构建 (`pnpm -r build`)
- [ ] 版本号已更新且一致
- [ ] CHANGELOG.md 已更新
- [ ] 文档已更新
- [ ] 本地 git 状态干净 (`git status`)

## 🎯 完整发布示例

```bash
# 1. 确保在 main 分支且代码最新
git checkout main
git pull origin main

# 2. 运行测试
pnpm -r test

# 3. 更新版本号
cd packages/core && npm version 0.2.0 && cd ../..
cd packages/cli && npm version 0.2.0 && cd ../..
cd packages/desktop && npm version 0.2.0 && cd ../..

# 4. 更新 CHANGELOG
# 编辑 CHANGELOG.md...

# 5. 提交更改
git add .
git commit -m "chore: release v0.2.0"
git push origin main

# 6. 创建并推送 tag
git tag v0.2.0
git push origin v0.2.0

# 7. 等待 GitHub Actions 完成（约 5-10 分钟）

# 8. 验证发布
# - 检查 https://www.npmjs.com/package/@ccman/core
# - 检查 https://www.npmjs.com/package/@ccman/cli
# - 检查 GitHub Releases 页面
```

## 🔗 相关链接

- [npm Automation Tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [electron-builder](https://www.electron.build/)
- [Semantic Versioning](https://semver.org/)

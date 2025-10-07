# 首次发布指南 (v0.1.0)

本文档指导如何进行 ccman 的首次正式发布。

## 📋 发布前检查清单

在执行发布前，请确认以下所有项目：

### 代码质量

- [x] 所有测试通过 (`pnpm -r test`)
  - Core: 35/35 tests passed ✅
- [x] 所有模块构建成功 (`pnpm -r build`)
  - Core: ✅
  - CLI: ✅
  - Desktop: ✅
- [x] 代码无 TypeScript 错误
- [x] 无已知严重 bug

### 文档完整性

- [x] README.md 完整且准确
- [x] CHANGELOG.md 包含 v0.1.0 条目
- [x] RELEASE_NOTES.md 已创建
- [x] GitHub Actions 使用文档已添加
- [x] 所有公共 API 有注释

### 配置验证

- [x] 所有 package.json 版本号一致 (0.1.0)
- [x] GitHub Actions workflows 已配置
- [x] .gitignore 包含所有构建产物
- [x] Desktop 图标说明已添加

### npm 准备

- [ ] npm 账户已登录 (`npm whoami`)
- [ ] @ccman 组织已创建（或修改为个人作用域）
- [ ] NPM_TOKEN 已在 GitHub Secrets 配置
- [ ] npm 包名可用性已确认

## 🚀 发布步骤

### 方式一：自动发布（推荐）

使用 GitHub Actions 自动化发布流程：

```bash
# 1. 确保在 main 分支且代码最新
git checkout main
git pull origin main

# 2. 确保所有更改已提交
git status  # 应该显示 "nothing to commit, working tree clean"

# 3. 创建版本 tag
git tag v0.1.0

# 4. 推送 tag 到 GitHub
git push origin v0.1.0
```

**GitHub Actions 会自动执行**：
1. ✅ 运行所有测试
2. ✅ 构建所有模块
3. ✅ 验证版本号一致性
4. ✅ 发布 @ccman/core 到 npm
5. ✅ 发布 @ccman/cli 到 npm
6. ✅ 构建 macOS Universal Binary (.dmg)
7. ✅ 构建 Windows x64 安装包 (.exe)
8. ✅ 创建 GitHub Release
9. ✅ 上传安装包到 Release

**预计时间**: 5-10 分钟

### 方式二：手动发布

如果需要手动控制发布过程：

```bash
# 1. 运行测试
pnpm -r test

# 2. 构建所有包
pnpm -r build

# 3. 登录 npm（如果未登录）
npm login

# 4. 发布 Core 包
cd packages/core
pnpm publish --access public
cd ../..

# 5. 发布 CLI 包
cd packages/cli
pnpm publish --access public
cd ../..

# 6. 构建 Desktop 应用（可选）
cd packages/desktop
pnpm build:electron
cd ../..

# 7. 创建 GitHub Release
git tag v0.1.0
git push origin v0.1.0
# 手动在 GitHub 上创建 Release
```

## 📊 发布后验证

### 验证 npm 包

```bash
# 等待 1-2 分钟让 npm 索引更新

# 验证 Core 包
npm view @ccman/core version
# 应该显示: 0.1.0

# 验证 CLI 包
npm view @ccman/cli version
# 应该显示: 0.1.0

# 测试安装
npm install -g @ccman/cli
ccman --version
# 应该显示: 0.1.0
```

### 验证 GitHub Release

1. 访问 `https://github.com/yourusername/ccman/releases`
2. 确认 v0.1.0 Release 存在
3. 确认包含以下文件：
   - `ccman-0.1.0-mac.dmg` (macOS Universal)
   - `ccman-0.1.0-win.exe` (Windows 64-bit)
4. 下载并测试安装包

### 验证 npm 页面

1. 访问 `https://www.npmjs.com/package/@ccman/core`
2. 确认版本显示为 0.1.0
3. 确认 README 正确显示
4. 访问 `https://www.npmjs.com/package/@ccman/cli`
5. 确认版本显示为 0.1.0

## ⚠️ 常见问题

### 问题 1: npm 组织不存在

**错误**: `403 Forbidden - PUT https://registry.npmjs.org/@ccman/core`

**解决方案**:
```bash
# 选项 A: 在 npm 创建 @ccman 组织
# 1. 登录 npmjs.com
# 2. 点击头像 → "Add Organization"
# 3. 创建 "ccman" 组织

# 选项 B: 修改包名使用个人作用域
# 修改所有 package.json:
# "@ccman/core" → "@yourusername/core"
# "@ccman/cli" → "@yourusername/cli"
```

### 问题 2: NPM_TOKEN 未配置

**错误**: GitHub Actions 发布失败，显示认证错误

**解决方案**:
1. 登录 [npmjs.com](https://www.npmjs.com/)
2. Account Settings → Access Tokens
3. Generate New Token → Automation
4. 复制 token
5. GitHub 仓库 → Settings → Secrets → Actions
6. New repository secret
7. Name: `NPM_TOKEN`
8. Value: 粘贴 token

### 问题 3: 版本号已存在

**错误**: `403 Forbidden - You cannot publish over the previously published versions`

**解决方案**:
```bash
# 1. 增加版本号
cd packages/core && npm version 0.1.1 && cd ../..
cd packages/cli && npm version 0.1.1 && cd ../..
cd packages/desktop && npm version 0.1.1 && cd ../..

# 2. 删除旧 tag（本地和远程）
git tag -d v0.1.0
git push --delete origin v0.1.0

# 3. 创建新 tag
git add packages/*/package.json
git commit -m "chore: bump version to 0.1.1"
git push origin main
git tag v0.1.1
git push origin v0.1.1
```

### 问题 4: Desktop 图标缺失

**错误**: electron-builder 警告缺少图标文件

**影响**: Desktop 应用会使用默认 Electron 图标

**解决方案**:
```bash
# 这不会阻止构建，但建议添加自定义图标
# 1. 准备 1024x1024 PNG 图标
# 2. 使用工具转换:
npm install -g png2icons
cd packages/desktop/build
png2icons your-icon.png . --icns --ico

# 3. 验证文件存在:
ls -l icon.icns icon.ico
```

## 📝 发布后任务

### 立即任务

- [ ] 更新 GitHub 仓库描述
- [ ] 添加 GitHub topics: `electron`, `cli`, `config-manager`, `anthropic`, `claude`
- [ ] 在 README 中更新 GitHub 用户名占位符
- [ ] 分享发布消息到社交媒体/论坛

### 短期任务（1-2 周内）

- [ ] 收集用户反馈
- [ ] 监控 GitHub Issues
- [ ] 准备 v0.2.0 功能规划
- [ ] 添加使用截图和视频
- [ ] 改进文档

### 长期任务

- [ ] 添加 Desktop E2E 测试
- [ ] 性能优化
- [ ] 支持更多 API 服务商
- [ ] 添加配置导入/导出功能

## 🎯 成功指标

v0.1.0 发布被认为成功，如果：

- ✅ npm 包可以正常安装和使用
- ✅ Desktop 应用可以在 macOS 和 Windows 上运行
- ✅ GitHub Release 包含所有必要文件
- ✅ 文档清晰准确
- ✅ 无严重 bug 报告（前 48 小时）

## 📞 需要帮助？

如果发布过程中遇到问题：

1. 检查 GitHub Actions 日志
2. 查阅 [GitHub_Actions.md](./GitHub_Actions.md)
3. 查看 npm 发布文档
4. 在 GitHub Issues 提问

---

**准备好了吗？执行第一条命令开始发布！**

```bash
git tag v0.1.0 && git push origin v0.1.0
```

祝发布顺利！🎉

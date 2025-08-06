# 发布指南

## 📋 发布前准备

1. **设置 NPM Token**：参见 [npm-publish-guide.md](./npm-publish-guide.md)
2. **确保工作目录干净**：`git status`
3. **确保在主分支**：`git checkout main`

## 🚀 发布方式

> 💡 **推荐**: 使用项目提供的Scripts进行发布，详见 [Scripts使用指南](./scripts-guide.md)

### 方式一：Scripts发布（推荐）

```bash
# 快速发布（日常推荐）
./scripts/quick-release.sh patch   # 修订版本
./scripts/quick-release.sh minor   # 次版本  
./scripts/quick-release.sh major   # 主版本

# 完整发布流程（重要版本）
./scripts/release.sh               # 交互式完整流程
```

### 方式二：NPM Scripts发布

```bash
# 交互选择版本类型
pnpm run release:interactive

# 指定版本类型
pnpm run release:patch   # 0.0.1 → 0.0.2
pnpm run release:minor   # 0.0.1 → 0.1.0  
pnpm run release:major   # 0.0.1 → 1.0.0

# 完整发布流程
pnpm run release
```

### 方式三：本地发布（备用）
```bash
# 直接发布到 NPM（跳过 GitHub Actions）
pnpm run publish:local
# 或
./scripts/publish-local.sh
```

## 📊 发布后验证

### 1. 检查 GitHub Actions
访问：https://github.com/2ue/ccm/actions
- 等待构建完成（约 2-3 分钟）
- 确认状态为 ✅ 成功

### 2. 验证结果
- **NPM 包**：https://www.npmjs.com/package/ccman
- **GitHub Release**：https://github.com/2ue/ccm/releases
- **测试安装**：`npm install -g ccman`

## 🔧 故障排查

### GitHub Actions 失败
1. 检查 `NPM_TOKEN` 设置是否正确
2. 查看 Actions 日志获取详细错误信息
3. 确认包名未被占用

### 版本冲突
```bash
# 检查已存在的版本
npm view ccman versions --json

# 使用新版本号重新发布
pnpm run release:patch
```

### 手动创建标签（高级）
```bash
# 如果脚本失败，可手动操作
pnpm version patch --no-git-tag-version
git add . && git commit -m "chore: 发布版本 v0.0.2"
git tag -a v0.0.2 -m "Release v0.0.2"
git push origin main && git push origin v0.0.2
```

## ✅ 发布检查清单

### 发布前
- [ ] NPM token 已设置
- [ ] 工作目录干净
- [ ] 在主分支
- [ ] 构建和测试通过

### 发布后  
- [ ] GitHub Actions 成功
- [ ] NPM 包可安装
- [ ] GitHub Release 创建
- [ ] 版本号正确
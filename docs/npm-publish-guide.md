# NPM 发布权限配置指南

## 🔐 权限问题分析

你的担心完全正确！NPM 发布确实容易出现权限问题。我已经优化了 GitHub Actions，采用更可靠的 `.npmrc` 配置方式。

## 🛠 GitHub Actions 权限配置

### 必需的 GitHub Secrets

在 GitHub 仓库设置中需要配置以下环境变量：

1. **NPM_TOKEN** (必需)
   - 用于 NPM 发布认证
   - 获取方式见下文

2. **GITHUB_TOKEN** (自动提供)
   - GitHub 自动提供，无需手动配置
   - 用于创建 Release

### NPM Token 获取步骤

```bash
# 1. 登录 NPM
npm login

# 2. 创建访问令牌
npm token create --read-only=false

# 3. 复制生成的令牌到 GitHub Secrets
```

**重要**: 选择 **Automation** 类型的 token，具有发布权限。

### GitHub 设置路径
```
GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret
```

添加：
- Name: `NPM_TOKEN`
- Secret: 你的 NPM token

## 🔧 优化后的认证方式

### 原始方式（可能失败）
```yaml
- uses: actions/setup-node@v4
  with:
    registry-url: 'https://registry.npmjs.org'
- run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 优化后方式（更可靠）
```yaml
- name: Configure NPM authentication
  run: |
    echo "//registry.npmjs.org/:_authToken=${{ secrets.NPM_TOKEN }}" >> ~/.npmrc
    echo "registry=https://registry.npmjs.org/" >> ~/.npmrc
    echo "always-auth=true" >> ~/.npmrc

- name: Verify NPM authentication
  run: npm whoami

- name: Publish to NPM
  run: npm publish --access public
```

## 🚀 发布方式选择

### 方式一：自动发布（推荐）
```bash
# 使用 GitHub Actions 自动发布
npm run release        # 完整发布流程
npm run release:patch  # 快速补丁发布
```

### 方式二：本地发布（备用）
```bash
# 本地手动发布
npm run publish:local
```

## 📋 权限问题排查

### 常见问题

1. **401 Unauthorized**
   ```bash
   # 检查 token 是否正确
   npm whoami
   
   # 重新创建 token
   npm token create --read-only=false
   ```

2. **403 Forbidden**
   ```bash
   # 检查包名是否被占用
   npm view your-package-name
   
   # 检查是否有发布权限
   npm owner ls your-package-name
   ```

3. **Package name too similar**
   ```bash
   # 修改 package.json 中的 name 字段
   "name": "@your-username/ccm"
   ```

### 测试发布权限
```bash
# 测试发布权限（不实际发布）
npm publish --dry-run
```

## 🔄 发布流程总结

### GitHub Actions 流程
1. 推送 tag → 触发 Actions
2. 配置 `.npmrc` → 认证 NPM
3. 验证认证 → 构建项目
4. 发布到 NPM → 创建 Release

### 本地发布流程
1. 检查登录状态
2. 验证版本唯一性
3. 运行构建和检查
4. 确认后发布

## ⚠️ 安全注意事项

1. **Token 安全**
   - 只在 GitHub Secrets 中存储
   - 定期轮换 token
   - 使用最小权限原则

2. **发布验证**
   - 每次发布前验证认证状态
   - 检查版本号唯一性
   - 运行完整的测试套件

3. **权限管理**
   - 只给信任的贡献者发布权限
   - 使用 GitHub 分支保护规则
   - 启用两步验证

## 🎯 最佳实践

1. **使用 `.npmrc` 方式**（已采用）
2. **验证认证状态**（已包含）
3. **多层权限检查**（已实现）
4. **本地备用方案**（已提供）

现在的配置应该能够完美解决 NPM 发布权限问题！
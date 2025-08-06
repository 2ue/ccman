# NPM 发布配置指南

## 🔐 步骤一：获取 NPM Token

```bash
# 1. 登录 NPM
npm login

# 2. 创建发布权限的 token
npm token create --read-only=false
```

复制生成的 token（格式：`npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

## 🔧 步骤二：设置 GitHub Secrets

1. 访问：`https://github.com/2ue/ccm/settings/secrets/actions`
2. 点击 **"New repository secret"**
3. 设置：
   - **Name**: `NPM_TOKEN`
   - **Secret**: 粘贴你的 NPM token
4. 点击 **"Add secret"**

### 验证设置
设置完成后，应看到：
```
Repository secrets:
• NPM_TOKEN  ••••••••••••••••••••••••••••••••••••••••
```

### 关于 GITHUB_TOKEN
**无需手动设置** - GitHub Actions 自动提供此 token

## 🚀 步骤三：发布

### 自动发布（推荐）
```bash
# 交互式选择版本
pnpm run release:interactive

# 或指定版本类型
pnpm run release:patch
pnpm run release:minor
pnpm run release:major
```

### 本地发布（备用）
```bash
pnpm run publish:local
```

## 🔍 故障排查

### 401 Unauthorized
- 检查 NPM token 是否正确设置
- 重新生成 token: `npm token create --read-only=false`

### 403 Forbidden  
- 包名已存在：修改 package.json 中的 name
- 检查发布权限：`npm owner ls claude-env`

### 测试发布权限
```bash
npm publish --dry-run
```

## 🛡️ 安全提醒

- NPM token 只存储在 GitHub Secrets 中
- 定期轮换 token（建议 90 天）
- Token 泄露时立即删除并重新创建
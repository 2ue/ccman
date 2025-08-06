# 设置 GitHub Secrets

## 🔐 获取 NPM Token

```bash
# 1. 登录 NPM
npm login

# 2. 创建 Automation Token
npm token create --read-only=false
```

**重要：** 复制生成的 token（格式：`npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

## 🔧 设置 GitHub Secrets

### 步骤
1. 访问：https://github.com/2ue/ccm/settings/secrets/actions
2. 点击 **"New repository secret"**
3. 填写：
   - **Name**: `NPM_TOKEN`
   - **Secret**: 粘贴你的 NPM token
4. 点击 **"Add secret"**

### 验证设置
设置完成后，应在 Secrets 页面看到：
```
Repository secrets:
• NPM_TOKEN  ••••••••••••••••••••••••••••••••••••••••
```

## ✅ 关于 GITHUB_TOKEN

**无需手动设置** - GitHub Actions 自动提供此 token，用于：
- 创建 GitHub Release
- 上传发布文件
- 访问仓库内容

## ⚠️ 安全提醒

- **永远不要**将 NPM token 提交到代码仓库
- 定期轮换 token（建议 90 天）
- Token 泄露时立即删除并重新创建
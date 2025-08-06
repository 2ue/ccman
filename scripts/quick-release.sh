#!/bin/bash

# CCM Quick Release Script
# 快速发布补丁版本的简化脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# 快速检查
[ ! -f "package.json" ] && print_error "package.json 未找到"
[ ! -d ".git" ] && print_error "不在 Git 仓库中"
git diff-index --quiet HEAD -- || print_error "工作目录有未提交更改"

# 获取当前版本和升级类型
current_version=$(node -p "require('./package.json').version")
version_type=${1:-patch}

echo "🚀 CCM 快速发布"
echo "当前版本: $current_version"
echo "升级类型: $version_type"

# 确认发布
read -p "确认发布？ (y/N): " -n 1 -r
echo
[[ ! $REPLY =~ ^[Yy]$ ]] && { echo "取消发布"; exit 0; }

# 执行发布流程
print_success "开始发布流程..."

# 1. 构建和测试
npm run build
npm run lint

# 2. 更新版本
new_version=$(npm version $version_type --no-git-tag-version)
new_version=${new_version#v}

# 3. 提交和打标签
git add .
git commit -m "chore: 发布版本 v$new_version

🚀 快速发布补丁版本
⏰ $(date '+%Y-%m-%d %H:%M:%S')"

git tag -a "v$new_version" -m "Release v$new_version"

# 4. 推送
git push origin $(git branch --show-current)
git push origin "v$new_version"

print_success "发布完成！版本 v$new_version 已推送"
echo "GitHub Actions: https://github.com/2ue/ccm/actions"
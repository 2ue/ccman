#!/bin/bash

# CCM Quick Release Script
# 快速发布补丁版本的简化脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; exit 1; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# 快速检查
[ ! -f "package.json" ] && print_error "package.json 未找到"
[ ! -d ".git" ] && print_error "不在 Git 仓库中"
git diff-index --quiet HEAD -- || print_error "工作目录有未提交更改"

# 获取当前版本和升级类型
current_version=$(node -p "require('./package.json').version")
version_type=${1:-""}

echo "🚀 CCM 快速发布"
echo "当前版本: $current_version"

# 如果没有提供版本类型，让用户选择
if [ -z "$version_type" ]; then
    echo ""
    print_info "选择版本类型:"
    echo "1) patch (修订版本): $current_version → $(pnpm version patch --dry-run 2>/dev/null | cut -d'v' -f2 || echo '计算中...')"
    echo "2) minor (次版本): $current_version → $(pnpm version minor --dry-run 2>/dev/null | cut -d'v' -f2 || echo '计算中...')"
    echo "3) major (主版本): $current_version → $(pnpm version major --dry-run 2>/dev/null | cut -d'v' -f2 || echo '计算中...')"
    echo ""
    
    read -p "请选择 (1-3, 回车默认选择 patch): " choice
    
    case ${choice:-1} in
        1|"") version_type="patch" ;;
        2) version_type="minor" ;;
        3) version_type="major" ;;
        *) print_error "无效选择" ;;
    esac
fi

print_info "升级类型: $version_type"

# 确认发布
echo ""
read -p "确认发布？ (y/N): " -n 1 -r
echo
[[ ! $REPLY =~ ^[Yy]$ ]] && { print_warning "取消发布"; exit 0; }

# 执行发布流程
print_success "开始发布流程..."

# 1. 构建和测试
print_info "运行构建和代码检查..."
pnpm run build
pnpm run lint

# 2. 更新版本
print_info "更新版本号..."
new_version=$(pnpm version $version_type --no-git-tag-version)
new_version=${new_version#v}

print_success "版本已更新: $current_version → $new_version"

# 3. 提交和打标签
print_info "创建提交和标签..."
git add .
git commit -m "chore: 发布版本 v$new_version

🚀 快速发布 $version_type 版本
⏰ $(date '+%Y-%m-%d %H:%M:%S')

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git tag -a "v$new_version" -m "Release v$new_version"

# 4. 推送
print_info "推送到远程仓库..."
git push origin $(git branch --show-current)
git push origin "v$new_version"

print_success "发布完成！版本 v$new_version 已推送"
echo ""
print_info "🔗 相关链接:"
echo "   GitHub Actions: https://github.com/2ue/ccm/actions"
echo "   GitHub Release: https://github.com/2ue/ccm/releases/tag/v$new_version"
echo ""
print_info "📦 NPM 包将在 GitHub Actions 完成后发布:"
echo "   https://www.npmjs.com/package/ccm"
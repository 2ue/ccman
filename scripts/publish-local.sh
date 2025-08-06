#!/bin/bash

# Local NPM Publish Script
# 本地 NPM 发布脚本（备用方案）

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

echo "🚀 CCM 本地 NPM 发布脚本"
echo "==============================="
echo ""

# 检查前置条件
[ ! -f "package.json" ] && print_error "package.json 未找到"
[ ! -d "dist" ] && print_error "dist 目录不存在，请先运行 npm run build"

# 检查 NPM 登录状态
print_info "检查 NPM 登录状态..."
if ! npm whoami > /dev/null 2>&1; then
    print_warning "未登录 NPM，开始登录流程..."
    npm login
    print_success "NPM 登录成功"
else
    current_user=$(npm whoami)
    print_success "已登录 NPM，用户: $current_user"
fi

# 获取版本信息
current_version=$(node -p "require('./package.json').version")
package_name=$(node -p "require('./package.json').name")

print_info "包名: $package_name"
print_info "当前版本: $current_version"

# 检查版本是否已存在
print_info "检查版本是否已存在..."
if npm view $package_name@$current_version > /dev/null 2>&1; then
    print_error "版本 $current_version 已存在于 NPM 上"
fi

print_success "版本检查通过"

# 运行预发布检查
print_info "运行预发布检查..."
pnpm run lint
pnpm run build

print_success "预发布检查通过"

# 确认发布
echo ""
print_warning "即将发布到 NPM:"
echo "  包名: $package_name"
echo "  版本: $current_version"
echo "  用户: $(npm whoami)"
echo ""

read -p "确认发布？ (y/N): " -n 1 -r
echo
[[ ! $REPLY =~ ^[Yy]$ ]] && { echo "取消发布"; exit 0; }

# 执行发布
print_info "开始发布..."

# 检查是否为预发布版本
if [[ $current_version =~ -beta\.|alpha\.|rc\. ]]; then
    print_info "检测到预发布版本，使用 beta tag"
    npm publish --tag beta --access public
else
    print_info "发布稳定版本"
    npm publish --access public
fi

print_success "发布成功！"
echo ""
print_info "📦 NPM 包信息:"
echo "  URL: https://www.npmjs.com/package/$package_name/v/$current_version"
echo "  安装: npm install -g $package_name@$current_version"
echo ""
print_success "本地发布完成！"
#!/bin/bash

# 脚本3: 创建tag和提交模块  
# 功能: 根据package.json版本号创建tag并提交（不进行版本升级）

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# 获取当前版本号
get_current_version() {
    if [ ! -f "package.json" ]; then
        print_error "package.json 未找到"
        exit 1
    fi
    
    local version=$(node -p "require('./package.json').version" 2>/dev/null || echo "")
    if [ -z "$version" ]; then
        print_error "无法读取package.json中的版本号"
        exit 1
    fi
    
    echo "$version"
}

# 检查tag是否已存在
check_tag_exists() {
    local tag_name=$1
    if git tag -l | grep -q "^$tag_name$"; then
        return 0  # tag存在
    else
        return 1  # tag不存在
    fi
}

# 创建tag
create_tag() {
    local version=$1
    local tag_name="v$version"
    local force_flag=""
    
    print_info "检查tag: $tag_name"
    
    if check_tag_exists "$tag_name"; then
        print_warning "tag $tag_name 已存在"
        read -p "是否要重新创建此tag? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "删除现有tag: $tag_name"
            git tag -d "$tag_name"
            force_flag="--force"
        else
            print_info "跳过tag创建，使用现有tag"
            echo "$tag_name"  # 返回tag名称
            return 0
        fi
    fi
    
    # 创建tag
    print_info "创建tag: $tag_name"
    local tag_message="Release v$version

📦 发布版本 v$version
⏰ $(date '+%Y-%m-%d %H:%M:%S')

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    
    git tag -a "$tag_name" -m "$tag_message"
    print_success "tag $tag_name 创建成功"
    
    echo "$tag_name"  # 返回tag名称
}

# 提交更改（如果有的话）
commit_changes() {
    local version=$1
    local tag_name=$2
    
    print_info "检查是否需要提交更改..."
    
    # 检查是否有暂存的更改
    if ! git diff-index --quiet --cached HEAD --; then
        print_info "发现暂存的更改，创建提交..."
        
        local commit_message="chore: 发布版本 v$version

🏷️  tag: $tag_name
⏰ $(date '+%Y-%m-%d %H:%M:%S')

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
        
        git commit -m "$commit_message"
        print_success "更改已提交"
        return 0
    else
        print_info "没有暂存的更改需要提交"
        return 1
    fi
}

# 推送tag和提交到远程
push_to_remote() {
    local tag_name=$1
    local has_commit=$2
    
    print_info "推送到远程仓库..."
    
    # 推送提交（如果有）
    if [ "$has_commit" = "true" ]; then
        local current_branch=$(git branch --show-current)
        print_info "推送分支: $current_branch"
        git push origin "$current_branch"
    fi
    
    # 推送tag
    print_info "推送tag: $tag_name"
    git push origin "$tag_name" 2>/dev/null || git push origin "$tag_name" --force
    
    print_success "推送完成，GitHub Actions 已触发"
}

# 主函数: 创建tag并提交
create_tag_and_commit() {
    echo "🏷️  CCM Tag创建器"
    echo "================"
    
    # 获取当前版本
    local version=$(get_current_version)
    print_info "当前版本: v$version"
    echo ""
    
    # 确认操作
    read -p "确认为版本 v$version 创建tag并推送? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        print_warning "操作已取消"
        exit 0
    fi
    
    # 创建tag
    local tag_name=$(create_tag "$version")
    
    # 提交更改（如果有）
    local has_commit="false"
    if commit_changes "$version" "$tag_name"; then
        has_commit="true"
    fi
    
    # 推送到远程
    push_to_remote "$tag_name" "$has_commit"
    
    echo ""
    print_success "🎉 Tag创建和推送完成!"
    print_info "📊 相关信息:"
    echo "   版本: v$version"
    echo "   Tag: $tag_name"
    echo "   GitHub Actions: https://github.com/2ue/ccm/actions"
    echo "   GitHub Release: https://github.com/2ue/ccm/releases/tag/$tag_name"
    
    # 输出tag名称供其他脚本使用
    echo ""
    echo "TAG_NAME=$tag_name"  # 环境变量格式输出
    echo "$tag_name"          # 直接输出
}

# 如果直接运行此脚本
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    create_tag_and_commit "$@"
fi
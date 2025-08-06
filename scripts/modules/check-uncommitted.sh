#!/bin/bash

# 脚本1: 检查未提交代码处理模块
# 功能: 检查工作目录状态，提供智能处理选项

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

# 主函数: 检查并处理未提交代码
check_uncommitted_changes() {
    print_info "检查工作目录状态..."
    
    # 检查是否有未提交的更改
    if git diff-index --quiet HEAD --; then
        print_success "工作目录干净，可以继续"
        return 0
    fi
    
    # 发现未提交更改
    print_warning "发现未提交的更改:"
    echo ""
    git status --short
    echo ""
    
    # 提供处理选项
    echo "请选择处理方式:"
    echo "1) 提交所有更改并继续"
    echo "2) 暂存所有更改并继续" 
    echo "3) 取消操作，手动处理"
    echo ""
    
    # 获取用户选择
    read -p "请选择 (1-3): " choice
    
    case $choice in
        1)
            handle_commit_changes
            ;;
        2)
            handle_stage_changes
            ;;
        3)
            handle_cancel
            ;;
        *)
            print_error "无效选择，操作已取消"
            exit 1
            ;;
    esac
}

# 处理提交更改
handle_commit_changes() {
    read -p "请输入提交信息 (回车使用默认): " commit_msg
    
    # 使用默认提交信息如果为空
    if [ -z "$commit_msg" ]; then
        commit_msg="chore: 发布前提交未完成更改

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    fi
    
    print_info "提交所有更改..."
    git add .
    git commit -m "$commit_msg"
    print_success "所有更改已提交"
}

# 处理暂存更改
handle_stage_changes() {
    print_info "暂存所有更改..."
    git add .
    print_success "所有更改已暂存"
    print_warning "注意: 暂存的更改将在后续提交中包含"
}

# 处理取消操作
handle_cancel() {
    print_info "操作已取消"
    echo "请手动处理未提交的更改:"
    echo "  git add <files>     # 暂存特定文件"
    echo "  git commit -m '...' # 提交更改"  
    echo "  git stash           # 暂时保存更改"
    echo ""
    echo "处理完成后重新运行发布脚本"
    exit 0
}

# 如果直接运行此脚本
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    echo "🔍 CCM 代码状态检查器"
    echo "====================="
    check_uncommitted_changes
    echo ""
    print_success "代码状态检查完成，可以继续后续操作"
fi
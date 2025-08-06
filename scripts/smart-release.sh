#!/bin/bash

# CCM Enhanced Release Script
# 增强版快速发布脚本 - 支持智能代码处理和发布状态监控

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; exit 1; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_check() { echo -e "${CYAN}🔍 $1${NC}"; }

# 检查基本环境
check_environment() {
    [ ! -f "package.json" ] && print_error "package.json 未找到"
    [ ! -d ".git" ] && print_error "不在 Git 仓库中"
    
    if ! command -v curl &> /dev/null; then
        print_warning "curl 未安装，将跳过发布状态检查"
        SKIP_STATUS_CHECK=true
    fi
}

# 智能处理未提交代码
handle_uncommitted_changes() {
    print_info "检查工作目录状态..."
    
    if git diff-index --quiet HEAD --; then
        print_success "工作目录干净"
        return 0
    fi
    
    print_warning "发现未提交的更改："
    git status --short
    echo ""
    
    echo "请选择处理方式："
    echo "1) 提交所有更改并继续发布"
    echo "2) 暂存所有更改并继续发布" 
    echo "3) 取消发布，手动处理"
    echo ""
    
    read -p "请选择 (1-3): " choice
    
    case $choice in
        1)
            read -p "输入提交信息: " commit_msg
            [ -z "$commit_msg" ] && commit_msg="chore: 发布前提交未完成更改"
            
            git add .
            git commit -m "$commit_msg"
            print_success "所有更改已提交"
            ;;
        2)
            git add .
            print_success "所有更改已暂存"
            ;;
        3)
            print_info "发布已取消，请手动处理更改后重新运行"
            exit 0
            ;;
        *)
            print_error "无效选择"
            ;;
    esac
}

# 获取和选择版本
get_and_select_version() {
    current_version=$(node -p "require('./package.json').version")
    version_type=${1:-""}
    
    echo "🚀 CCM 智能发布"
    echo "当前版本: $current_version"
    echo ""
    
    if [ -z "$version_type" ]; then
        print_info "选择版本升级类型:"
        echo "1) patch (修订版本): $current_version → $(pnpm version patch --dry-run 2>/dev/null | cut -d'v' -f2 || echo '计算中...')"
        echo "2) minor (次版本): $current_version → $(pnpm version minor --dry-run 2>/dev/null | cut -d'v' -f2 || echo '计算中...')"
        echo "3) major (主版本): $current_version → $(pnpm version major --dry-run 2>/dev/null | cut -d'v' -f2 || echo '计算中...')"
        echo "4) 跳过版本升级，仅重新发布当前版本"
        echo ""
        
        read -p "请选择 (1-4, 回车默认选择 patch): " choice
        
        case ${choice:-1} in
            1|"") version_type="patch" ;;
            2) version_type="minor" ;;
            3) version_type="major" ;;
            4) version_type="skip" ;;
            *) print_error "无效选择" ;;
        esac
    fi
    
    print_info "选择: $version_type"
    
    if [ "$version_type" != "skip" ]; then
        echo ""
        read -p "确认升级版本？ (y/N): " -n 1 -r
        echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && { print_warning "取消发布"; exit 0; }
    fi
}

# 执行发布流程
execute_release() {
    print_success "开始发布流程..."
    
    # 1. 构建和测试
    print_info "运行构建和代码检查..."
    pnpm run build
    pnpm run lint
    
    # 2. 更新版本
    if [ "$version_type" != "skip" ]; then
        print_info "更新版本号..."
        new_version=$(pnpm version $version_type --no-git-tag-version)
        new_version=${new_version#v}
        print_success "版本已更新: $current_version → $new_version"
    else
        new_version=$current_version
        print_info "跳过版本更新，使用当前版本: $new_version"
    fi
    
    # 3. 创建提交和标签
    if [ "$version_type" != "skip" ]; then
        print_info "创建提交和标签..."
        git add .
        git commit -m "chore: 发布版本 v$new_version

🚀 智能发布 $version_type 版本
⏰ $(date '+%Y-%m-%d %H:%M:%S')

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    fi
    
    # 确保标签存在
    tag_name="v$new_version"
    if ! git tag -l | grep -q "^$tag_name$"; then
        git tag -a "$tag_name" -m "Release v$new_version"
        print_success "标签 $tag_name 已创建"
    else
        print_warning "标签 $tag_name 已存在，将重新推送"
    fi
    
    # 4. 推送
    print_info "推送到远程仓库..."
    git push origin $(git branch --show-current)
    git push origin "$tag_name"
    
    print_success "版本 v$new_version 已推送，GitHub Actions 已触发"
}

# 监控发布状态
monitor_release_status() {
    if [ "$SKIP_STATUS_CHECK" = true ]; then
        print_warning "跳过发布状态检查"
        show_manual_links
        return 0
    fi
    
    print_info "开始监控发布状态..."
    echo ""
    
    # GitHub Actions 状态检查
    print_check "检查 GitHub Actions 状态..."
    
    local max_attempts=30  # 最多检查5分钟
    local attempt=0
    local actions_success=false
    
    while [ $attempt -lt $max_attempts ]; do
        # 检查最新的 workflow run
        local run_status=$(curl -s -H "Accept: application/vnd.github.v3+json" \
            "https://api.github.com/repos/2ue/ccm/actions/runs?per_page=1" \
            | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 2>/dev/null || echo "unknown")
            
        local run_conclusion=$(curl -s -H "Accept: application/vnd.github.v3+json" \
            "https://api.github.com/repos/2ue/ccm/actions/runs?per_page=1" \
            | grep -o '"conclusion":"[^"]*"' | head -1 | cut -d'"' -f4 2>/dev/null || echo "null")
        
        case "$run_status" in
            "completed")
                if [ "$run_conclusion" = "success" ]; then
                    print_success "GitHub Actions 构建成功！"
                    actions_success=true
                    break
                else
                    print_error "GitHub Actions 构建失败: $run_conclusion"
                    return 1
                fi
                ;;
            "in_progress"|"queued")
                echo -ne "\r${CYAN}🔍 GitHub Actions 运行中... (${attempt}/${max_attempts})${NC}"
                ;;
            *)
                echo -ne "\r${YELLOW}⚠️  等待 GitHub Actions 开始... (${attempt}/${max_attempts})${NC}"
                ;;
        esac
        
        sleep 10
        ((attempt++))
    done
    
    echo  # 换行
    
    if [ "$actions_success" != true ]; then
        print_warning "GitHub Actions 检查超时，请手动确认"
        show_manual_links
        return 0
    fi
    
    # NPM 发布状态检查
    print_check "检查 NPM 包发布状态..."
    
    local npm_attempts=20
    local npm_attempt=0
    local npm_success=false
    
    while [ $npm_attempt -lt $npm_attempts ]; do
        local npm_response=$(curl -s "https://registry.npmjs.org/ccman" | grep -o "\"$new_version\"" 2>/dev/null || echo "")
        
        if [ -n "$npm_response" ]; then
            print_success "NPM 包 v$new_version 发布成功！"
            npm_success=true
            break
        else
            echo -ne "\r${CYAN}🔍 等待 NPM 包发布... (${npm_attempt}/${npm_attempts})${NC}"
            sleep 15
            ((npm_attempt++))
        fi
    done
    
    echo  # 换行
    
    if [ "$npm_success" != true ]; then
        print_warning "NPM 包检查超时，可能仍在发布中"
    fi
    
    # GitHub Release 检查
    print_check "检查 GitHub Release..."
    
    local release_response=$(curl -s "https://api.github.com/repos/2ue/ccm/releases/tags/v$new_version" \
        | grep -o '"tag_name":"[^"]*"' 2>/dev/null || echo "")
    
    if [ -n "$release_response" ]; then
        print_success "GitHub Release v$new_version 创建成功！"
    else
        print_warning "GitHub Release 可能仍在创建中"
    fi
}

# 显示手动检查链接
show_manual_links() {
    print_info "请手动检查以下链接："
    echo "   GitHub Actions: https://github.com/2ue/ccm/actions"
    echo "   GitHub Release: https://github.com/2ue/ccm/releases/tag/v$new_version"  
    echo "   NPM 包: https://www.npmjs.com/package/ccman"
}

# 显示发布总结
show_release_summary() {
    echo ""
    print_success "🎉 发布流程完成！"
    echo ""
    print_info "📋 发布总结:"
    echo "   版本: v$new_version"
    echo "   NPM 包: ccman@$new_version"
    echo ""
    print_info "📦 安装命令:"
    echo "   npm install -g ccman@$new_version"
    echo ""
    print_info "🔗 相关链接:"
    echo "   NPM: https://www.npmjs.com/package/ccman/v/$new_version"
    echo "   GitHub: https://github.com/2ue/ccm/releases/tag/v$new_version"
    echo ""
}

# 主函数
main() {
    print_info "🚀 CCM 智能发布脚本 v2.0"
    print_info "=================================="
    echo ""
    
    check_environment
    handle_uncommitted_changes  
    get_and_select_version "$1"
    execute_release
    monitor_release_status
    show_release_summary
    
    print_success "✨ 发布成功完成！"
}

# 错误处理
trap 'print_error "发布过程中出现错误，请检查输出信息"' ERR

# 运行主函数
main "$@"
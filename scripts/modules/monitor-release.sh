#!/bin/bash

# 脚本4: 发布状态监控模块
# 功能: 监控GitHub Actions、NPM发布、GitHub Release状态

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
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_check() { echo -e "${CYAN}🔍 $1${NC}"; }

# 配置
REPO_OWNER="2ue"
REPO_NAME="ccm"
PACKAGE_NAME="ccman"
MAX_WAIT_MINUTES=5
CHECK_INTERVAL=15  # 秒

# 获取版本信息
get_version_info() {
    if [ ! -f "package.json" ]; then
        print_error "package.json 未找到"
        exit 1
    fi
    
    local version=$(node -p "require('./package.json').version" 2>/dev/null || echo "")
    if [ -z "$version" ]; then
        print_error "无法读取版本号"
        exit 1
    fi
    
    echo "$version"
}

# 获取最新commit ID
get_latest_commit() {
    git rev-parse HEAD 2>/dev/null || echo "unknown"
}

# 输出监控链接
show_monitoring_links() {
    local version=$1
    local commit_id=$2
    local tag_name="v$version"
    
    print_info "📊 监控链接:"
    echo "   🔗 GitHub Actions: https://github.com/${REPO_OWNER}/${REPO_NAME}/actions"
    echo "   🔗 GitHub Actions (Commit): https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${commit_id}/checks"
    echo "   🔗 NPM Package: https://www.npmjs.com/package/${PACKAGE_NAME}"  
    echo "   🔗 NPM Version: https://www.npmjs.com/package/${PACKAGE_NAME}/v/${version}"
    echo "   🔗 GitHub Releases: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases"
    echo "   🔗 GitHub Release: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/${tag_name}"
    echo ""
}

# 检查GitHub Actions状态
check_github_actions() {
    local max_attempts=$((MAX_WAIT_MINUTES * 60 / CHECK_INTERVAL))
    local attempt=0
    
    print_check "监控 GitHub Actions 状态..."
    
    while [ $attempt -lt $max_attempts ]; do
        # 检查最新的workflow运行状态
        local api_response=$(curl -s "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?per_page=1" 2>/dev/null || echo "")
        
        if [ -n "$api_response" ]; then
            local run_status=$(echo "$api_response" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 2>/dev/null || echo "unknown")
            local run_conclusion=$(echo "$api_response" | grep -o '"conclusion":"[^"]*"' | head -1 | cut -d'"' -f4 2>/dev/null || echo "null")
            
            case "$run_status" in
                "completed")
                    if [ "$run_conclusion" = "success" ]; then
                        print_success "GitHub Actions 构建成功! ✨"
                        return 0
                    else
                        print_error "GitHub Actions 构建失败: $run_conclusion ❌"
                        return 1
                    fi
                    ;;
                "in_progress")
                    echo -ne "\r${CYAN}🔄 GitHub Actions 运行中... (${attempt}/${max_attempts}) - 状态: $run_status${NC}"
                    ;;
                "queued")
                    echo -ne "\r${YELLOW}⏳ GitHub Actions 排队中... (${attempt}/${max_attempts})${NC}"
                    ;;
                *)
                    echo -ne "\r${YELLOW}⏳ 等待 GitHub Actions 启动... (${attempt}/${max_attempts})${NC}"
                    ;;
            esac
        else
            echo -ne "\r${YELLOW}⏳ 连接 GitHub API... (${attempt}/${max_attempts})${NC}"
        fi
        
        sleep $CHECK_INTERVAL
        ((attempt++))
    done
    
    echo  # 换行
    print_warning "GitHub Actions 检查超时 (${MAX_WAIT_MINUTES}分钟)"
    return 2
}

# 检查NPM包发布状态  
check_npm_package() {
    local version=$1
    local max_attempts=$((MAX_WAIT_MINUTES * 60 / CHECK_INTERVAL))
    local attempt=0
    
    print_check "监控 NPM 包发布状态..."
    
    while [ $attempt -lt $max_attempts ]; do
        # 检查NPM包版本
        local npm_response=$(curl -s "https://registry.npmjs.org/${PACKAGE_NAME}" 2>/dev/null || echo "")
        
        if [ -n "$npm_response" ]; then
            # 检查是否包含目标版本
            if echo "$npm_response" | grep -q "\"$version\""; then
                print_success "NPM 包 v$version 发布成功! 📦"
                return 0
            fi
        fi
        
        echo -ne "\r${CYAN}📦 等待 NPM 包发布... (${attempt}/${max_attempts})${NC}"
        sleep $CHECK_INTERVAL
        ((attempt++))
    done
    
    echo  # 换行
    print_warning "NPM 包检查超时 (${MAX_WAIT_MINUTES}分钟)"
    return 2
}

# 检查GitHub Release状态
check_github_release() {
    local version=$1
    local tag_name="v$version"
    local max_attempts=$((MAX_WAIT_MINUTES * 60 / CHECK_INTERVAL))
    local attempt=0
    
    print_check "监控 GitHub Release 状态..."
    
    while [ $attempt -lt $max_attempts ]; do
        # 检查GitHub Release
        local release_response=$(curl -s "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${tag_name}" 2>/dev/null || echo "")
        
        if [ -n "$release_response" ] && ! echo "$release_response" | grep -q '"message":"Not Found"'; then
            # 检查release状态
            local release_draft=$(echo "$release_response" | grep -o '"draft":[^,}]*' | cut -d':' -f2 2>/dev/null || echo "true")
            
            if [ "$release_draft" = "false" ]; then
                print_success "GitHub Release v$version 创建成功! 🎉"
                return 0
            else
                echo -ne "\r${YELLOW}📝 GitHub Release 为草稿状态... (${attempt}/${max_attempts})${NC}"
            fi
        else
            echo -ne "\r${CYAN}🎯 等待 GitHub Release 创建... (${attempt}/${max_attempts})${NC}"
        fi
        
        sleep $CHECK_INTERVAL
        ((attempt++))
    done
    
    echo  # 换行
    print_warning "GitHub Release 检查超时 (${MAX_WAIT_MINUTES}分钟)"
    return 2
}

# 状态图标映射函数
get_status_icon() {
    case $1 in
        0) echo "✅" ;;
        1) echo "❌" ;;
        2) echo "⏳" ;;
        *) echo "❓" ;;
    esac
}

# 生成发布总结
generate_summary() {
    local version=$1
    local actions_status=$2
    local npm_status=$3
    local release_status=$4
    
    echo ""
    echo "📋 发布监控总结"
    echo "================"
    
    echo "   版本: v$version"
    echo "   GitHub Actions: $(get_status_icon $actions_status)"
    echo "   NPM 包发布: $(get_status_icon $npm_status)"  
    echo "   GitHub Release: $(get_status_icon $release_status)"
    echo ""
    
    # 整体状态判断
    if [ $actions_status -eq 0 ] && [ $npm_status -eq 0 ] && [ $release_status -eq 0 ]; then
        print_success "🎉 发布完全成功！所有组件都已正常发布"
        return 0
    elif [ $actions_status -eq 1 ]; then
        print_error "❌ 发布失败：GitHub Actions 构建失败"
        return 1
    elif [ $actions_status -eq 2 ] || [ $npm_status -eq 2 ] || [ $release_status -eq 2 ]; then
        print_warning "⏳ 发布可能仍在进行中，建议稍后手动检查"
        return 2
    else
        print_warning "⚠️ 发布部分成功，请检查失败的组件"
        return 3
    fi
}

# 主函数: 监控发布状态
monitor_release() {
    local version=$(get_version_info)
    local commit_id=$(get_latest_commit)
    
    echo "📊 CCM 发布状态监控器"
    echo "===================="
    print_info "版本: v$version"
    print_info "提交: ${commit_id:0:8}"
    print_info "超时: ${MAX_WAIT_MINUTES} 分钟"
    echo ""
    
    # 显示监控链接
    show_monitoring_links "$version" "$commit_id"
    
    # 检查curl是否可用
    if ! command -v curl &> /dev/null; then
        print_error "curl 未安装，无法进行状态检查"
        print_info "请手动访问上述链接检查发布状态"
        return 1
    fi
    
    # 并行监控各个状态
    print_info "开始监控发布状态... (最长等待 ${MAX_WAIT_MINUTES} 分钟)"
    echo ""
    
    # 检查GitHub Actions
    check_github_actions
    local actions_status=$?
    
    # 检查NPM包发布
    check_npm_package "$version"  
    local npm_status=$?
    
    # 检查GitHub Release
    check_github_release "$version"
    local release_status=$?
    
    # 生成总结报告
    generate_summary "$version" $actions_status $npm_status $release_status
}

# 如果直接运行此脚本
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    monitor_release "$@"
fi
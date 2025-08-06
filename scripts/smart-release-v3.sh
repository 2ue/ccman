#!/bin/bash

# CCM 智能发布脚本 v3.0 (模块化重构版)
# 功能: 串联四个独立模块实现完整的智能发布流程

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; exit 1; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_step() { echo -e "${PURPLE}🔸 $1${NC}"; }

# 脚本路径配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULE_DIR="$SCRIPT_DIR/modules"

# 检查模块脚本是否存在
check_modules() {
    local modules=(
        "check-uncommitted.sh"
        "version-bump.sh" 
        "create-tag.sh"
        "monitor-release.sh"
    )
    
    for module in "${modules[@]}"; do
        if [ ! -f "$MODULE_DIR/$module" ]; then
            print_error "模块脚本不存在: $MODULE_DIR/$module"
        fi
        
        if [ ! -x "$MODULE_DIR/$module" ]; then
            chmod +x "$MODULE_DIR/$module"
        fi
    done
}

# 显示帮助信息
show_help() {
    echo "🚀 CCM 智能发布脚本 v3.0"
    echo "========================="
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --skip-version    跳过版本升级，直接使用当前版本"
    echo "  --version-type    指定版本类型 (patch|minor|major)"
    echo "  --no-monitor      跳过发布状态监控"
    echo "  -h, --help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                      # 完整智能发布流程"
    echo "  $0 --skip-version       # 跳过版本升级"
    echo "  $0 --version-type minor # 直接使用minor升级"
    echo "  $0 --no-monitor         # 不监控发布状态"
    echo ""
}

# 解析命令行参数
parse_arguments() {
    SKIP_VERSION=false
    VERSION_TYPE=""
    NO_MONITOR=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-version)
                SKIP_VERSION=true
                shift
                ;;
            --version-type)
                VERSION_TYPE="$2"
                shift 2
                ;;
            --no-monitor)
                NO_MONITOR=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                print_error "未知参数: $1"
                ;;
        esac
    done
}

# 步骤1: 检查未提交代码
step_check_uncommitted() {
    print_step "步骤 1/4: 检查工作目录状态"
    echo ""
    
    # 调用模块脚本
    source "$MODULE_DIR/check-uncommitted.sh"
    check_uncommitted_changes
    
    echo ""
    print_success "步骤1完成: 工作目录状态正常"
}

# 步骤2: 版本升级
step_version_bump() {
    print_step "步骤 2/4: 版本管理"
    echo ""
    
    if [ "$SKIP_VERSION" = true ]; then
        print_info "跳过版本升级，使用当前版本"
        local current_version=$(node -p "require('./package.json').version")
        print_info "当前版本: v$current_version"
        NEW_VERSION="$current_version"
    else
        print_info "是否需要版本升级?"
        echo "1) 是，需要升级版本"
        echo "2) 否，使用当前版本"
        echo ""
        
        read -p "请选择 (1-2, 默认1): " version_choice
        
        case ${version_choice:-1} in
            1)
                print_info "启动版本升级流程..."
                # 静默调用版本升级模块，捕获输出
                NEW_VERSION=$("$MODULE_DIR/version-bump.sh" "$VERSION_TYPE" 2>/dev/null | tail -1)
                if [ -z "$NEW_VERSION" ]; then
                    print_error "版本升级失败"
                fi
                print_success "版本升级成功: v$NEW_VERSION"
                ;;
            2)
                local current_version=$(node -p "require('./package.json').version")
                print_info "使用当前版本: v$current_version"
                NEW_VERSION="$current_version"
                ;;
            *)
                print_error "无效选择"
                ;;
        esac
    fi
    
    echo ""
    print_success "步骤2完成: 版本为 v$NEW_VERSION"
}

# 步骤3: 创建tag和提交
step_create_tag() {
    print_step "步骤 3/4: 创建tag和提交"
    echo ""
    
    print_info "将为版本 v$NEW_VERSION 创建tag并提交..."
    echo ""
    
    # 静默调用tag创建模块，避免颜色代码泄露
    TAG_NAME=$("$MODULE_DIR/create-tag.sh" --quiet)
    if [ -z "$TAG_NAME" ]; then
        print_error "tag创建失败"
    fi
    
    echo ""
    print_success "步骤3完成: tag $TAG_NAME 已创建并推送"
    print_info "GitHub Actions 已自动触发"
}

# 步骤4: 监控发布状态
step_monitor_release() {
    print_step "步骤 4/4: 监控发布状态"
    echo ""
    
    if [ "$NO_MONITOR" = true ]; then
        print_info "跳过发布状态监控"
        print_info "请手动检查:"
        echo "   🔗 GitHub Actions: https://github.com/2ue/ccm/actions"
        echo "   🔗 NPM Package: https://www.npmjs.com/package/ccman"
        echo "   🔗 GitHub Release: https://github.com/2ue/ccm/releases/tag/v$NEW_VERSION"
        return 0
    fi
    
    # 给GitHub Actions一些时间启动
    print_info "等待 GitHub Actions 启动... (10秒)"
    sleep 10
    
    # 直接执行监控模块
    "$MODULE_DIR/monitor-release.sh"
    local monitor_status=$?
    
    echo ""
    case $monitor_status in
        0)
            print_success "步骤4完成: 发布监控成功，所有组件已发布"
            ;;
        1)
            print_error "步骤4失败: 发布过程中出现错误"
            ;;
        2)
            print_warning "步骤4部分完成: 发布可能仍在进行中"
            ;;
        *)
            print_warning "步骤4完成: 发布状态需要手动确认"
            ;;
    esac
    
    return $monitor_status
}

# 显示最终总结
show_final_summary() {
    local status=$1
    
    echo ""
    echo "🎊 智能发布流程总结"
    echo "==================="
    echo ""
    print_info "📦 版本信息:"
    echo "   版本: v$NEW_VERSION"
    echo "   Tag: $TAG_NAME"
    echo ""
    print_info "🔗 相关链接:"
    echo "   安装命令: npm install -g ccman@$NEW_VERSION"
    echo "   NPM页面: https://www.npmjs.com/package/ccman/v/$NEW_VERSION"
    echo "   GitHub Release: https://github.com/2ue/ccm/releases/tag/v$NEW_VERSION"
    echo ""
    
    case $status in
        0)
            print_success "🎉 智能发布完全成功！"
            ;;
        1)
            print_error "❌ 发布过程中出现错误，请检查上述链接"
            ;;
        *)
            print_warning "⚠️ 发布可能仍在进行中，请稍后检查"
            ;;
    esac
}

# 主函数
main() {
    echo "🚀 CCM 智能发布脚本 v3.0 (模块化架构)"
    echo "======================================="
    echo ""
    print_info "使用模块化架构，四个独立步骤："
    echo "   1. 检查工作目录状态"  
    echo "   2. 版本管理"
    echo "   3. 创建tag和提交"
    echo "   4. 监控发布状态"
    echo ""
    
    # 检查环境
    check_modules
    
    # 确认开始
    if [ "$SKIP_VERSION" != true ] && [ -z "$VERSION_TYPE" ] && [ "$NO_MONITOR" != true ]; then
        read -p "开始智能发布流程? (Y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            print_warning "发布已取消"
            exit 0
        fi
        echo ""
    fi
    
    # 执行四个步骤
    step_check_uncommitted
    step_version_bump  
    step_create_tag
    step_monitor_release
    local final_status=$?
    
    # 显示最终总结
    show_final_summary $final_status
    
    exit $final_status
}

# 错误处理
trap 'print_error "智能发布过程中出现错误"' ERR

# 解析参数并运行
parse_arguments "$@"
main
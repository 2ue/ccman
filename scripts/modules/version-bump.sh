#!/bin/bash

# 脚本2: 版本提升模块
# 功能: 智能选择和执行版本号升级

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

# 获取当前版本
get_current_version() {
    if [ ! -f "package.json" ]; then
        print_error "package.json 未找到"
        exit 1
    fi
    
    current_version=$(node -p "require('./package.json').version" 2>/dev/null || echo "")
    if [ -z "$current_version" ]; then
        print_error "无法读取当前版本号"
        exit 1
    fi
    
    echo "$current_version"
}

# 计算版本预览
calculate_version_preview() {
    local version_type=$1
    local preview=$(pnpm version $version_type --dry-run 2>/dev/null)
    
    if [ -n "$preview" ]; then
        # 移除前缀v并返回
        echo "$preview" | sed 's/^v//'
    else
        echo "计算失败"
    fi
}

# 分析git提交推荐版本类型
analyze_commit_history() {
    local commits=$(git log --oneline -10 2>/dev/null | tr '[:upper:]' '[:lower:]' || echo "")
    local suggested_type="patch"
    
    if [[ $commits == *"breaking"* ]] || [[ $commits == *"major"* ]]; then
        suggested_type="major"
    elif [[ $commits == *"feat"* ]] || [[ $commits == *"feature"* ]] || [[ $commits == *"add"* ]]; then
        suggested_type="minor"
    fi
    
    echo "$suggested_type"
}

# 主函数: 版本选择和升级
version_bump() {
    local current_version=$(get_current_version)
    local version_type=${1:-""}
    
    # 安静模式检测：如果被其他脚本调用，则静默运行
    if [ "$0" != "${BASH_SOURCE[0]}" ] || [ "$version_type" = "test" ] || [ "$version_type" = "--quiet" ]; then
        # 静默模式：只返回结果，不显示菜单
        if [ -n "$version_type" ] && [ "$version_type" != "test" ] && [ "$version_type" != "--quiet" ]; then
            execute_version_bump_quiet "$version_type" "$current_version"
            return $?
        else
            # 测试模式，只返回当前版本
            echo "$current_version"
            return 0
        fi
    fi
    
    echo "📦 CCM 版本管理器"
    echo "=================="
    print_info "当前版本: $current_version"
    echo ""
    
    # 如果已指定版本类型，直接执行
    if [ -n "$version_type" ] && [ "$version_type" != "test" ]; then
        execute_version_bump "$version_type" "$current_version"
        return $?
    fi
    
    # 获取智能推荐
    local suggested_type=$(analyze_commit_history)
    
    # 显示版本选择菜单
    show_version_menu "$current_version" "$suggested_type"
    
    # 获取用户选择
    read -p "请选择版本升级类型 (1-4, 回车默认选择推荐): " choice
    
    # 处理用户选择
    case ${choice:-""} in
        "")
            # 回车默认选择推荐版本
            version_type="$suggested_type"
            ;;
        1) version_type="patch" ;;
        2) version_type="minor" ;;
        3) version_type="major" ;;
        4) handle_custom_version ;;
        *) 
            print_error "无效选择"
            exit 1
            ;;
    esac
    
    # 确认升级
    confirm_version_bump "$version_type" "$current_version"
    
    # 执行升级
    execute_version_bump "$version_type" "$current_version"
}

# 显示版本选择菜单
show_version_menu() {
    local current_version=$1
    local suggested_type=$2
    
    print_info "版本升级选项:"
    echo ""
    
    # 计算各版本预览
    local patch_version=$(calculate_version_preview "patch")
    local minor_version=$(calculate_version_preview "minor")  
    local major_version=$(calculate_version_preview "major")
    
    # 显示推荐标记
    local patch_mark=""
    local minor_mark=""
    local major_mark=""
    
    case $suggested_type in
        "patch") patch_mark="✨ [推荐] " ;;
        "minor") minor_mark="✨ [推荐] " ;;
        "major") major_mark="✨ [推荐] " ;;
    esac
    
    echo "1) ${patch_mark}🔧 Patch (修订版本)    $current_version → $patch_version"
    echo "   └─ 适用于: bug修复、小改进"
    echo ""
    echo "2) ${minor_mark}✨ Minor (次版本)     $current_version → $minor_version"  
    echo "   └─ 适用于: 新功能、向后兼容改动"
    echo ""
    echo "3) ${major_mark}🚀 Major (主版本)     $current_version → $major_version"
    echo "   └─ 适用于: 破坏性更改、重大重构"
    echo ""
    echo "4) 📝 Custom (自定义版本)"
    echo "   └─ 手动输入版本号"
    echo ""
    
    # 显示推荐原因
    case $suggested_type in
        "major")
            print_warning "💡 检测到破坏性更改提交，建议主版本升级"
            ;;
        "minor")
            print_warning "💡 检测到新功能提交，建议次版本升级"
            ;;
        "patch")
            print_info "💡 建议修订版本升级"
            ;;
    esac
    echo ""
}

# 处理自定义版本
handle_custom_version() {
    read -p "请输入自定义版本号 (格式: x.y.z): " custom_version
    
    # 验证版本号格式
    if [[ ! $custom_version =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+(\.[0-9]+)?)?$ ]]; then
        print_error "版本号格式不正确，应为 x.y.z 格式"
        exit 1
    fi
    
    version_type="$custom_version"
}

# 确认版本升级
confirm_version_bump() {
    local version_type=$1
    local current_version=$2
    
    if [[ "$version_type" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
        local new_version="$version_type"
    else
        local new_version=$(calculate_version_preview "$version_type")
    fi
    
    echo ""
    print_info "即将执行版本升级: $current_version → $new_version"
    read -p "确认升级版本? (Y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        print_warning "版本升级已取消"
        exit 0
    fi
}

# 执行版本升级（静默模式）
execute_version_bump_quiet() {
    local version_type=$1
    local current_version=$2
    
    # 执行版本升级
    if [[ "$version_type" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
        # 自定义版本
        new_version=$(pnpm version "$version_type" --no-git-tag-version 2>/dev/null)
    else
        # 标准版本类型
        new_version=$(pnpm version "$version_type" --no-git-tag-version 2>/dev/null)
    fi
    
    if [ $? -eq 0 ]; then
        new_version=${new_version#v}
        echo "$new_version"  # 输出新版本号供其他脚本使用
    else
        exit 1
    fi
}

# 执行版本升级（交互模式）
execute_version_bump() {
    local version_type=$1
    local current_version=$2
    
    print_info "执行版本升级..."
    
    # 执行版本升级
    if [[ "$version_type" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
        # 自定义版本
        new_version=$(pnpm version "$version_type" --no-git-tag-version 2>/dev/null)
    else
        # 标准版本类型
        new_version=$(pnpm version "$version_type" --no-git-tag-version 2>/dev/null)
    fi
    
    if [ $? -eq 0 ]; then
        new_version=${new_version#v}
        print_success "版本升级成功: $current_version → $new_version"
        echo "$new_version"  # 输出新版本号供其他脚本使用
    else
        print_error "版本升级失败"
        exit 1
    fi
}

# 如果直接运行此脚本
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    version_bump "$@"
fi
#!/bin/bash

# CCM Release Script
# 自动化版本管理和发布流程

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印彩色消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_success() {
    print_message $GREEN "✅ $1"
}

print_warning() {
    print_message $YELLOW "⚠️  $1"
}

print_error() {
    print_message $RED "❌ $1"
}

print_info() {
    print_message $BLUE "ℹ️  $1"
}

# 检查必要的工具
check_prerequisites() {
    print_info "检查前置条件..."
    
    if ! command -v git &> /dev/null; then
        print_error "Git 未安装"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "NPM 未安装"
        exit 1
    fi
    
    # 检查是否在 git 仓库中
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "当前目录不是 Git 仓库"
        exit 1
    fi
    
    print_success "前置条件检查通过"
}

# 检查工作目录状态
check_working_directory() {
    print_info "检查工作目录状态..."
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        print_error "工作目录有未提交的更改，请先提交或暂存"
        git status --short
        exit 1
    fi
    
    # 检查当前分支
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
        print_warning "当前不在主分支 ($current_branch)，是否继续？"
        read -p "继续 (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    print_success "工作目录状态正常"
}

# 获取当前版本
get_current_version() {
    current_version=$(node -p "require('./package.json').version")
    print_info "当前版本: $current_version"
}

# 选择版本类型
select_version_type() {
    echo ""
    print_info "选择版本升级类型:"
    echo "1) patch (修订版本): $current_version -> $(npm version patch --dry-run | cut -d'v' -f2)"
    echo "2) minor (次版本): $current_version -> $(npm version minor --dry-run | cut -d'v' -f2)"
    echo "3) major (主版本): $current_version -> $(npm version major --dry-run | cut -d'v' -f2)"
    echo "4) prerelease (预发布): $current_version -> $(npm version prerelease --preid=beta --dry-run | cut -d'v' -f2)"
    echo "5) custom (自定义版本)"
    echo ""
    
    read -p "请选择 (1-5): " version_choice
    
    case $version_choice in
        1)
            version_type="patch"
            ;;
        2)
            version_type="minor"
            ;;
        3)
            version_type="major"
            ;;
        4)
            version_type="prerelease"
            version_args="--preid=beta"
            ;;
        5)
            read -p "输入版本号 (例: 1.2.3): " custom_version
            if [[ ! $custom_version =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+(\.[0-9]+)?)?$ ]]; then
                print_error "版本号格式不正确"
                exit 1
            fi
            version_type="$custom_version"
            ;;
        *)
            print_error "无效选择"
            exit 1
            ;;
    esac
}

# 创建发布分支
create_release_branch() {
    # 获取新版本号用于分支名
    if [ "$version_type" = "patch" ] || [ "$version_type" = "minor" ] || [ "$version_type" = "major" ] || [ "$version_type" = "prerelease" ]; then
        new_version=$(npm version $version_type --dry-run $version_args | cut -d'v' -f2)
    else
        new_version="$version_type"
    fi
    
    release_branch="release/v$new_version"
    
    print_info "创建发布分支: $release_branch"
    
    # 确保从最新的主分支创建
    git fetch origin
    git checkout main 2>/dev/null || git checkout master 2>/dev/null
    git pull origin $(git branch --show-current)
    
    # 创建并切换到发布分支
    git checkout -b "$release_branch"
    
    print_success "发布分支创建成功: $release_branch"
}

# 更新版本号
update_version() {
    print_info "更新版本号..."
    
    # 更新 package.json 中的版本
    if [ "$version_type" = "patch" ] || [ "$version_type" = "minor" ] || [ "$version_type" = "major" ] || [ "$version_type" = "prerelease" ]; then
        new_version=$(npm version $version_type --no-git-tag-version $version_args)
        new_version=${new_version#v}  # 移除前面的 v
    else
        # 自定义版本
        npm version $version_type --no-git-tag-version
        new_version="$version_type"
    fi
    
    print_success "版本已更新到: $new_version"
}

# 运行构建和测试
run_build_and_test() {
    print_info "运行构建和测试..."
    
    # 安装依赖
    npm ci
    
    # 运行 lint
    if npm run lint > /dev/null 2>&1; then
        print_success "代码检查通过"
    else
        print_error "代码检查失败"
        exit 1
    fi
    
    # 运行构建
    npm run build
    print_success "构建成功"
    
    # 运行测试（如果存在）
    if npm run test > /dev/null 2>&1; then
        print_success "测试通过"
    else
        print_warning "测试脚本不存在或失败，跳过测试"
    fi
}

# 生成更新日志
generate_changelog() {
    print_info "生成提交信息..."
    
    # 获取自上次版本以来的提交
    last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    
    if [ -n "$last_tag" ]; then
        commits=$(git log $last_tag..HEAD --oneline --pretty=format:"- %s (%h)")
        if [ -n "$commits" ]; then
            changelog="自 $last_tag 以来的更改:\n$commits"
        else
            changelog="版本升级到 v$new_version"
        fi
    else
        changelog="初始版本 v$new_version"
    fi
    
    commit_message="chore: 发布版本 v$new_version

$changelog

🚀 通过 release script 自动生成"
}

# 提交更改
commit_changes() {
    print_info "提交版本更改..."
    
    # 添加更改的文件
    git add package.json package-lock.json 2>/dev/null || git add package.json
    git add src/cli.ts  # CLI 中的版本号可能需要更新
    
    # 提交
    git commit -m "$commit_message"
    
    print_success "版本更改已提交"
}

# 创建并推送标签
create_and_push_tag() {
    tag_name="v$new_version"
    
    print_info "创建标签: $tag_name"
    
    # 创建带注释的标签
    tag_message="CCM (Claude Code Manager) v$new_version

📦 发布版本 v$new_version

$changelog

---
🤖 通过 release script 自动生成
⏰ 发布时间: $(date '+%Y-%m-%d %H:%M:%S')
🔗 GitHub: https://github.com/2ue/ccm"

    git tag -a "$tag_name" -m "$tag_message"
    
    print_success "标签创建成功: $tag_name"
}

# 推送到远程仓库
push_to_remote() {
    print_info "推送到远程仓库..."
    
    # 推送分支
    git push origin "$release_branch"
    print_success "发布分支已推送"
    
    # 推送标签
    git push origin "$tag_name"
    print_success "标签已推送"
    
    print_info "GitHub Actions 将自动开始构建和发布流程"
    print_info "查看进度: https://github.com/2ue/ccm/actions"
}

# 清理和完成
cleanup_and_finish() {
    print_info "清理工作..."
    
    # 切回主分支
    main_branch=$(git branch --show-current | grep -E "^(main|master)$" || echo "main")
    git checkout $main_branch 2>/dev/null || git checkout master 2>/dev/null
    
    # 询问是否删除发布分支
    print_info "发布分支 $release_branch 已完成使命"
    read -p "删除本地发布分支？ (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        git branch -D "$release_branch"
        print_success "本地发布分支已删除"
    fi
}

# 显示发布总结
show_release_summary() {
    echo ""
    print_success "🎉 发布流程完成！"
    echo ""
    print_info "📋 发布总结:"
    echo "   版本: v$new_version"
    echo "   标签: $tag_name"
    echo "   分支: $release_branch"
    echo ""
    print_info "🔗 相关链接:"
    echo "   GitHub Release: https://github.com/2ue/ccm/releases/tag/$tag_name"
    echo "   GitHub Actions: https://github.com/2ue/ccm/actions"
    echo "   NPM 包 (稍后发布): https://www.npmjs.com/package/ccm"
    echo ""
    print_info "📦 安装命令 (发布完成后):"
    echo "   npm install -g ccm@$new_version"
    echo ""
}

# 主函数
main() {
    print_info "🚀 CCM Release Script v1.0"
    print_info "==============================="
    echo ""
    
    # 执行发布流程
    check_prerequisites
    check_working_directory
    get_current_version
    select_version_type
    create_release_branch
    update_version
    run_build_and_test
    generate_changelog
    commit_changes
    create_and_push_tag
    push_to_remote
    cleanup_and_finish
    show_release_summary
    
    print_success "发布脚本执行完成！请查看 GitHub Actions 进行最终发布。"
}

# 错误处理
trap 'print_error "发布过程中出现错误，请检查输出信息"; exit 1' ERR

# 运行主函数
main "$@"
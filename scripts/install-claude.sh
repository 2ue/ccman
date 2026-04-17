#!/usr/bin/env bash
set -euo pipefail

PROFILE_KEY="anthropic"
PROFILE_TITLE="Anthropic Official"
BASE_URL=""
API_KEY=""
DRY_RUN=0
ASSUME_YES=0
SKIP_CONFIG=0
INSTALL_TARGET="latest"
INSTALLER_URL="https://claude.ai/install.sh"

CLAUDE_VERSION=""
DOWNLOADER=""
CURRENT_STEP=0
TOTAL_STEPS=4

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  COLOR_RESET=$'\033[0m'
  COLOR_DIM=$'\033[2m'
  COLOR_BLUE=$'\033[34m'
  COLOR_CYAN=$'\033[36m'
  COLOR_GREEN=$'\033[32m'
  COLOR_YELLOW=$'\033[33m'
  COLOR_RED=$'\033[31m'
  COLOR_BOLD=$'\033[1m'
else
  COLOR_RESET=''
  COLOR_DIM=''
  COLOR_BLUE=''
  COLOR_CYAN=''
  COLOR_GREEN=''
  COLOR_YELLOW=''
  COLOR_RED=''
  COLOR_BOLD=''
fi

print_banner() {
  printf '%s\n' "${COLOR_CYAN}${COLOR_BOLD}Claude Code 一键安装配置向导${COLOR_RESET}"
  printf '%s\n' "${COLOR_DIM}官方 native installer · 不依赖 Node/npm · 自动写入 Claude 配置${COLOR_RESET}"
}

print_step() {
  CURRENT_STEP=$((CURRENT_STEP + 1))
  printf '\n%s\n' "${COLOR_BLUE}${COLOR_BOLD}步骤 ${CURRENT_STEP}/${TOTAL_STEPS} · $1${COLOR_RESET}"
}

log_info() {
  printf '%s\n' "${COLOR_CYAN}ℹ️  $1${COLOR_RESET}"
}

log_warn() {
  printf '%s\n' "${COLOR_YELLOW}⚠️  $1${COLOR_RESET}"
}

log_success() {
  printf '%s\n' "${COLOR_GREEN}✅ $1${COLOR_RESET}"
}

log_error() {
  printf '%s\n' "${COLOR_RED}❌ $1${COLOR_RESET}" >&2
}

log_detail() {
  printf '%s\n' "${COLOR_DIM}   $1${COLOR_RESET}"
}

show_command() {
  log_detail "执行命令: $1"
}

print_usage() {
  cat <<'EOF'
Usage: install-claude.sh [options] [apiKey]

Options:
  --dry-run                      只输出计划，不执行真实安装
  --yes                          跳过确认提示
  --skip-config                  只安装/升级 Claude Code，不写入 ~/.claude/settings.json
  --provider <anthropic|gmn|gmn1>  选择预设线路
  --base-url <url>               覆盖预设 Base URL
  --target <latest|stable|VERSION> 指定 Claude Code 安装目标
  --api-key <key>                直接提供 API Key
  -h, --help                     显示帮助
EOF
}

resolve_profile_defaults() {
  case "$PROFILE_KEY" in
    anthropic)
      PROFILE_TITLE="Anthropic Official"
      [[ -z "$BASE_URL" ]] && BASE_URL="https://api.anthropic.com"
      ;;
    gmn)
      PROFILE_TITLE="GMN"
      [[ -z "$BASE_URL" ]] && BASE_URL="https://gmn.chuangzuoli.com"
      ;;
    gmn1)
      PROFILE_TITLE="GMN1"
      [[ -z "$BASE_URL" ]] && BASE_URL="https://gmncode.cn"
      ;;
    *)
      log_error "不支持的 provider: $PROFILE_KEY"
      exit 1
      ;;
  esac
}

validate_install_target() {
  if [[ ! "$INSTALL_TARGET" =~ ^(stable|latest|[0-9]+\.[0-9]+\.[0-9]+(-[^[:space:]]+)?)$ ]]; then
    log_error "不支持的安装目标: $INSTALL_TARGET"
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --yes)
      ASSUME_YES=1
      shift
      ;;
    --skip-config)
      SKIP_CONFIG=1
      shift
      ;;
    --provider)
      PROFILE_KEY="${2:-}"
      shift 2
      ;;
    --base-url)
      BASE_URL="${2:-}"
      shift 2
      ;;
    --target)
      INSTALL_TARGET="${2:-}"
      shift 2
      ;;
    --api-key)
      API_KEY="${2:-}"
      shift 2
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    -*)
      log_error "未知参数: $1"
      print_usage
      exit 1
      ;;
    *)
      if [[ -z "$API_KEY" ]]; then
        API_KEY="$1"
      fi
      shift
      ;;
  esac
done

resolve_profile_defaults
validate_install_target

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

read_first_line() {
  "$@" 2>/dev/null | tr -d '\r' | head -n 1 || true
}

detect_downloader() {
  if command_exists curl; then
    DOWNLOADER="curl"
    return
  fi
  if command_exists wget; then
    DOWNLOADER="wget"
    return
  fi
  DOWNLOADER=""
}

download_file() {
  local url="$1"
  local output="$2"

  if [[ "$DOWNLOADER" == "curl" ]]; then
    curl -fsSL -o "$output" "$url"
    return
  fi

  if [[ "$DOWNLOADER" == "wget" ]]; then
    wget -q -O "$output" "$url"
    return
  fi

  log_error "未检测到 curl 或 wget，无法下载 Claude Code 官方安装器。"
  exit 1
}

get_claude_version() {
  if command_exists claude; then
    local version_output
    version_output="$(read_first_line claude --version)"
    if [[ -n "$version_output" ]]; then
      printf '%s' "$version_output" | grep -Eo 'v?[0-9]+(\.[0-9]+){1,2}' | head -n 1 | sed 's/^v//'
    fi
  fi
}

refresh_environment_snapshot() {
  detect_downloader
  CLAUDE_VERSION="$(get_claude_version)"
}

print_environment_summary() {
  printf '%s\n' "${COLOR_BOLD}环境检测结果${COLOR_RESET}"
  printf '%s\n' "- 平台: $(uname -s)/$(uname -m)"
  printf '%s\n' "- Shell: ${SHELL:-unknown}"
  printf '%s\n' "- 当前 Claude Code: ${CLAUDE_VERSION:-未检测到}"
  printf '%s\n' "- 下载工具: ${DOWNLOADER:-未检测到 curl/wget}"
  printf '%s\n' "- 安装目标: ${INSTALL_TARGET}"
  printf '%s\n' "- 目标 Provider: ${PROFILE_TITLE}"
  printf '%s\n' "- 目标 Base URL: ${BASE_URL}"
}

print_plan() {
  printf '%s\n' "${COLOR_BOLD}Claude Code 安装计划${COLOR_RESET}"
  if [[ -n "$CLAUDE_VERSION" ]]; then
    printf '%s\n' "- 通过官方 native installer 升级 Claude Code（当前 ${CLAUDE_VERSION}）"
  else
    printf '%s\n' "- 通过官方 native installer 安装 Claude Code"
  fi

  printf '%s\n' "- 安装目标: ${INSTALL_TARGET}"

  if [[ "$SKIP_CONFIG" -eq 1 ]]; then
    printf '%s\n' "- 跳过 Claude Code 配置写入"
  else
    printf '%s\n' "- 备份并写入 ~/.claude/settings.json"
  fi

  printf '%s\n' "- 安装过程不要求预装 Node.js 或 npm"
}

confirm_proceed() {
  if [[ "$ASSUME_YES" -eq 1 ]]; then
    return 0
  fi

  local answer
  read -r -p "确认按照以上计划继续？(y/N): " answer
  [[ "${answer,,}" == "y" ]]
}

install_claude_code() {
  print_step "安装或升级 Claude Code"

  if [[ -z "$DOWNLOADER" ]]; then
    log_error "未检测到 curl 或 wget，无法继续。"
    exit 1
  fi

  local tmp_dir
  tmp_dir="$(mktemp -d 2>/dev/null || mktemp -d -t ccman-claude-install)"
  local installer_path="${tmp_dir}/install.sh"

  log_info "准备下载 Claude Code 官方安装器"
  show_command "${DOWNLOADER} ${INSTALLER_URL}"
  download_file "$INSTALLER_URL" "$installer_path"
  chmod +x "$installer_path"

  if [[ "$INSTALL_TARGET" == "latest" ]]; then
    show_command "bash \"$installer_path\""
    bash "$installer_path"
  else
    show_command "bash \"$installer_path\" \"$INSTALL_TARGET\""
    bash "$installer_path" "$INSTALL_TARGET"
  fi

  rm -rf "$tmp_dir"
  hash -r || true

  CLAUDE_VERSION="$(get_claude_version)"
  if [[ -n "$CLAUDE_VERSION" ]]; then
    log_success "Claude Code 已可用"
    log_detail "版本输出: ${CLAUDE_VERSION}"
    return
  fi

  log_warn "Claude Code 安装器已执行完成，但当前终端未检测到 claude 命令。"
  log_detail "如安装已成功，请重新打开终端后执行: claude --version"
}

prompt_api_key_if_needed() {
  if [[ "$SKIP_CONFIG" -eq 1 ]]; then
    return 0
  fi

  if [[ -n "$API_KEY" ]]; then
    return 0
  fi

  read -r -s -p "请输入 Claude Code Provider API Key: " API_KEY
  echo
  if [[ -z "$API_KEY" ]]; then
    log_error "API Key 不能为空"
    exit 1
  fi
}

backup_file_if_exists() {
  local file_path="$1"
  if [[ ! -f "$file_path" ]]; then
    return 0
  fi

  local backup_path="${file_path}.bak.$(date +%s)"
  cp "$file_path" "$backup_path"
  echo "$backup_path"
}

write_claude_config() {
  if [[ "$SKIP_CONFIG" -eq 1 ]]; then
    log_info "根据参数选择，已跳过 ~/.claude/settings.json 写入"
    return 0
  fi

  print_step "写入 Claude Code 配置"

  local claude_dir="${HOME}/.claude"
  local config_path="${claude_dir}/settings.json"
  local config_backup=""

  mkdir -p "$claude_dir"
  chmod 700 "$claude_dir" || true

  config_backup="$(backup_file_if_exists "$config_path" || true)"

  cat >"$config_path" <<EOF
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "${API_KEY}",
    "ANTHROPIC_BASE_URL": "${BASE_URL}",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1,
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": 32000
  },
  "permissions": {
    "allow": [],
    "deny": []
  },
  "alwaysThinkingEnabled": true
}
EOF

  chmod 600 "$config_path"

  log_success "已写入 Claude Code 配置: $config_path"
  [[ -n "$config_backup" ]] && log_detail "备份 settings.json: $config_backup"
}

if [[ "$SKIP_CONFIG" -eq 1 ]]; then
  TOTAL_STEPS=3
fi

print_banner
print_step "检测本机环境"
refresh_environment_snapshot
print_environment_summary

print_step "生成安装计划"
print_plan

if [[ "$DRY_RUN" -eq 1 ]]; then
  printf '\n%s\n' "${COLOR_YELLOW}[DRY RUN] 未执行任何真实安装或配置动作。${COLOR_RESET}"
  exit 0
fi

if ! confirm_proceed; then
  log_warn "已取消。"
  exit 0
fi

install_claude_code
prompt_api_key_if_needed
write_claude_config

printf '\n%s\n' "${COLOR_GREEN}${COLOR_BOLD}🎉 Claude Code 安装/升级与配置流程完成。${COLOR_RESET}"
log_detail "提示：如当前终端仍找不到 claude 命令，请新开终端后执行 claude --version。"

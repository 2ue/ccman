#!/usr/bin/env bash
set -euo pipefail

PROFILE_KEY="gmn"
PROFILE_TITLE="GMN"
PROVIDER_NAME=""
BASE_URL=""
API_KEY=""
DRY_RUN=0
ASSUME_YES=0
SKIP_CONFIG=0

CODEX_PACKAGE="@openai/codex"
DEFAULT_NODE_RANGE=">=16"
REQUIRED_NODE_RANGE="$DEFAULT_NODE_RANGE"
REQUIRED_NODE_MAJOR="16"
CODEX_PROVIDER_KEY="gmn"

NODE_VERSION=""
NPM_VERSION=""
CODEX_VERSION=""
NODE_COMPATIBLE=0
SELECTED_MANAGER=""
NVM_SH=""
CURRENT_STEP=0
TOTAL_STEPS=5

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
  printf '%s\n' "${COLOR_CYAN}${COLOR_BOLD}Codex 一键安装配置向导${COLOR_RESET}"
  printf '%s\n' "${COLOR_DIM}独立脚本 · 自动检测环境 · 默认推荐最稳安装路线${COLOR_RESET}"
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
Usage: install-codex.sh [options] [apiKey]

Options:
  --dry-run               只输出计划，不执行真实安装
  --yes                   跳过确认提示
  --skip-config           只安装/升级 Codex，不写入 ~/.codex 配置
  --provider <gmn|gmn1>   选择预设线路
  --provider-name <name>  记录用名称（默认跟随 provider，gmn / gmn1）
  --base-url <url>        覆盖预设 Base URL
  --api-key <key>         直接提供 API Key
  -h, --help              显示帮助
EOF
}

resolve_profile_defaults() {
  case "$PROFILE_KEY" in
    gmn)
      PROFILE_TITLE="GMN"
      [[ -z "$PROVIDER_NAME" ]] && PROVIDER_NAME="gmn"
      [[ -z "$BASE_URL" ]] && BASE_URL="https://gmn.chuangzuoli.com"
      ;;
    gmn1)
      PROFILE_TITLE="GMN1"
      [[ -z "$PROVIDER_NAME" ]] && PROVIDER_NAME="gmn1"
      [[ -z "$BASE_URL" ]] && BASE_URL="https://gmncode.cn"
      ;;
    *)
      log_error "不支持的 provider: $PROFILE_KEY"
      exit 1
      ;;
  esac
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
    --provider-name)
      PROVIDER_NAME="${2:-}"
      shift 2
      ;;
    --base-url)
      BASE_URL="${2:-}"
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

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

read_first_line() {
  "$@" 2>/dev/null | tr -d '\r' | head -n 1 || true
}

find_nvm() {
  local candidates=(
    "${NVM_DIR:-}/nvm.sh"
    "${HOME:-}/.nvm/nvm.sh"
    "${HOME:-}/.config/nvm/nvm.sh"
    "/opt/homebrew/opt/nvm/nvm.sh"
    "/usr/local/opt/nvm/nvm.sh"
  )

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -n "$candidate" && -f "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

get_node_version() {
  if command_exists node; then
    read_first_line node -p 'process.version.replace(/^v/, "")'
  fi
}

get_npm_version() {
  if command_exists npm; then
    read_first_line npm --version
  fi
}

get_codex_version() {
  if command_exists codex; then
    local version_output
    version_output="$(read_first_line codex --version)"
    if [[ -n "$version_output" ]]; then
      printf '%s' "$version_output" | grep -Eo 'v?[0-9]+(\.[0-9]+){1,2}' | head -n 1 | sed 's/^v//'
    fi
  fi
}

extract_first_number() {
  printf '%s' "$1" | sed -E 's/[^0-9]*([0-9]+).*/\1/' | tr -d '\n'
}

resolve_node_requirement() {
  local output=""
  if command_exists npm; then
    output="$(npm view "$CODEX_PACKAGE" engines.node --json 2>/dev/null || true)"
  fi

  if [[ -n "$output" ]]; then
    output="$(printf '%s' "$output" | tr -d '\r' | tr -d '"' | head -n 1)"
    if [[ -n "$output" ]]; then
      REQUIRED_NODE_RANGE="$output"
    fi
  fi

  local major
  major="$(extract_first_number "$REQUIRED_NODE_RANGE")"
  if [[ -n "$major" ]]; then
    REQUIRED_NODE_MAJOR="$major"
  fi
}

detect_manager() {
  if command_exists volta; then
    SELECTED_MANAGER="volta"
    return
  fi
  if command_exists fnm; then
    SELECTED_MANAGER="fnm"
    return
  fi
  if NVM_SH="$(find_nvm)"; then
    SELECTED_MANAGER="nvm"
    return
  fi
  if command_exists mise; then
    SELECTED_MANAGER="mise"
    return
  fi
  if command_exists asdf; then
    SELECTED_MANAGER="asdf"
    return
  fi
  SELECTED_MANAGER=""
}

major_of_version() {
  printf '%s' "${1%%.*}"
}

refresh_environment_snapshot() {
  NODE_VERSION="$(get_node_version)"
  NPM_VERSION="$(get_npm_version)"
  CODEX_VERSION="$(get_codex_version)"

  if [[ -n "$NODE_VERSION" && "$(major_of_version "$NODE_VERSION")" -ge "$REQUIRED_NODE_MAJOR" ]]; then
    NODE_COMPATIBLE=1
  else
    NODE_COMPATIBLE=0
  fi

  detect_manager
}

print_environment_summary() {
  printf '%s\n' "${COLOR_BOLD}环境检测结果${COLOR_RESET}"
  printf '%s\n' "- 平台: $(uname -s)/$(uname -m)"
  printf '%s\n' "- Shell: ${SHELL:-unknown}"
  printf '%s\n' "- Node 要求: ${REQUIRED_NODE_RANGE}"
  printf '%s\n' "- 当前 Node: ${NODE_VERSION:-未检测到} $([[ "$NODE_COMPATIBLE" -eq 1 ]] && printf '(兼容)' || printf '(待处理)')"
  printf '%s\n' "- 当前 npm: ${NPM_VERSION:-未检测到}"
  printf '%s\n' "- 当前 Codex: ${CODEX_VERSION:-未检测到}"
  printf '%s\n' "- 现有版本管理器: ${SELECTED_MANAGER:-无}"
  printf '%s\n' "- 目标 Provider: ${PROFILE_TITLE}"
  printf '%s\n' "- 目标 Base URL: ${BASE_URL}"
}

print_plan() {
  printf '%s\n' "${COLOR_BOLD}Codex 安装计划${COLOR_RESET}"
  if [[ "$NODE_COMPATIBLE" -eq 1 ]]; then
    printf '%s\n' "- 复用现有 Node.js ${NODE_VERSION}"
  elif [[ -n "$SELECTED_MANAGER" ]]; then
    printf '%s\n' "- 使用现有 ${SELECTED_MANAGER} 安装/切换到兼容的 Node.js"
  else
    printf '%s\n' "- 未检测到兼容 Node.js，按推荐路线引导 Volta"
  fi

  if [[ -n "$CODEX_VERSION" ]]; then
    printf '%s\n' "- 升级并校验 Codex CLI（当前 ${CODEX_VERSION}）"
  else
    printf '%s\n' "- 安装并校验 Codex CLI"
  fi

  if [[ "$SKIP_CONFIG" -eq 1 ]]; then
    printf '%s\n' "- 跳过 Codex 配置写入"
  else
    printf '%s\n' "- 备份并写入 ~/.codex/config.toml 与 ~/.codex/auth.json"
  fi

  if [[ "$(uname -s)" == "Darwin" ]]; then
    printf '%s\n' "- macOS 推荐优先使用 Volta / 现有 Node 版本管理器"
  fi
}

confirm_proceed() {
  if [[ "$ASSUME_YES" -eq 1 ]]; then
    return 0
  fi

  local answer
  read -r -p "确认按照以上计划继续？(y/N): " answer
  [[ "${answer,,}" == "y" ]]
}

ensure_volta_in_path() {
  export PATH="${HOME}/.volta/bin:${PATH}"
}

ensure_fnm_initialized() {
  eval "$(fnm env --shell bash)"
}

ensure_nvm_initialized() {
  # shellcheck disable=SC1090
  source "$NVM_SH"
}

install_node_with_manager() {
  case "$SELECTED_MANAGER" in
    volta)
      log_info "检测到现有 Volta，准备安装/切换 Node.js"
      show_command "volta install node"
      volta install node
      ensure_volta_in_path
      ;;
    fnm)
      log_info "检测到现有 fnm，准备安装/切换 Node.js"
      show_command "fnm install --lts"
      fnm install --lts
      ensure_fnm_initialized
      fnm default lts-latest >/dev/null 2>&1 || true
      ;;
    nvm)
      log_info "检测到现有 nvm，准备安装/切换 Node.js"
      ensure_nvm_initialized
      show_command "nvm install --lts"
      nvm install --lts
      nvm use --lts >/dev/null
      ;;
    mise)
      log_info "检测到现有 mise，准备安装/切换 Node.js"
      show_command "mise use -g node@lts"
      mise use -g node@lts
      ;;
    asdf)
      log_info "检测到现有 asdf，准备安装/切换 Node.js"
      show_command "asdf install nodejs latest"
      asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git >/dev/null 2>&1 || true
      asdf install nodejs latest
      asdf global nodejs latest
      asdf reshim nodejs
      ;;
    *)
      return 1
      ;;
  esac
}

bootstrap_volta() {
  if ! command_exists curl; then
    log_error "未检测到 curl，无法自动引导 Volta。"
    exit 1
  fi

  log_info "未检测到兼容 Node.js，按推荐路线引导 Volta"
  show_command "curl https://get.volta.sh | bash"
  curl https://get.volta.sh | bash
  ensure_volta_in_path
  SELECTED_MANAGER="volta"
  show_command "volta install node"
  volta install node
}

ensure_compatible_node() {
  print_step "准备 Node.js 运行环境"
  if [[ "$NODE_COMPATIBLE" -eq 1 ]]; then
    log_success "当前 Node.js ${NODE_VERSION} 已满足要求 ${REQUIRED_NODE_RANGE}"
    return 0
  fi

  if [[ -n "$SELECTED_MANAGER" ]]; then
    install_node_with_manager
  else
    bootstrap_volta
  fi

  refresh_environment_snapshot
  if [[ "$NODE_COMPATIBLE" -ne 1 ]]; then
    log_error "Node.js 仍不满足 Codex 运行要求 ${REQUIRED_NODE_RANGE}"
    exit 1
  fi

  log_success "Node.js 已就绪：${NODE_VERSION}"
}

install_codex_cli() {
  print_step "安装或升级 Codex CLI"
  log_info "准备安装 ${CODEX_PACKAGE}@latest"
  show_command "npm install -g ${CODEX_PACKAGE}@latest"
  npm install -g "${CODEX_PACKAGE}@latest"
  if ! command_exists codex; then
    log_error "Codex 安装完成后仍未出现在 PATH 中"
    exit 1
  fi
  local installed_version
  installed_version="$(codex --version | tr -d '\r' | head -n 1)"
  log_success "Codex CLI 已可用"
  log_detail "版本输出: ${installed_version}"
}

prompt_api_key_if_needed() {
  if [[ "$SKIP_CONFIG" -eq 1 ]]; then
    return 0
  fi

  if [[ -n "$API_KEY" ]]; then
    return 0
  fi

  read -r -s -p "请输入 Codex Provider API Key: " API_KEY
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

write_codex_config() {
  if [[ "$SKIP_CONFIG" -eq 1 ]]; then
    log_info "根据参数选择，已跳过 ~/.codex 配置写入"
    return 0
  fi

  print_step "写入 Codex 配置"

  local codex_dir="${HOME}/.codex"
  local config_path="${codex_dir}/config.toml"
  local auth_path="${codex_dir}/auth.json"
  local config_backup=""
  local auth_backup=""

  mkdir -p "$codex_dir"
  chmod 700 "$codex_dir" || true

  config_backup="$(backup_file_if_exists "$config_path" || true)"
  auth_backup="$(backup_file_if_exists "$auth_path" || true)"

  cat >"$config_path" <<EOF
model = "gpt-5.4"
model_reasoning_effort = "xhigh"
disable_response_storage = true
sandbox_mode = "danger-full-access"
windows_wsl_setup_acknowledged = true
approval_policy = "never"
profile = "auto-max"
file_opener = "vscode"
model_provider = "${CODEX_PROVIDER_KEY}"
web_search = "cached"
suppress_unstable_features_warning = true

[history]
persistence = "save-all"

[tui]
notifications = true

[shell_environment_policy]
inherit = "all"
ignore_default_excludes = false

[sandbox_workspace_write]
network_access = true

[features]
plan_tool = true
apply_patch_freeform = true
view_image_tool = true
unified_exec = false
streamable_shell = false
rmcp_client = true
elevated_windows_sandbox = true

[profiles.auto-max]
approval_policy = "never"
sandbox_mode = "workspace-write"

[profiles.review]
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[notice]
hide_gpt5_1_migration_prompt = true

[model_providers.${CODEX_PROVIDER_KEY}]
name = "${CODEX_PROVIDER_KEY}"
base_url = "${BASE_URL}"
wire_api = "responses"
requires_openai_auth = true
EOF

  chmod 600 "$config_path"
  cat >"$auth_path" <<EOF
{
  "OPENAI_API_KEY": "${API_KEY}"
}
EOF
  chmod 600 "$auth_path"

  log_success "已写入 Codex 配置: $config_path"
  log_success "已写入 Codex 认证: $auth_path"
  [[ -n "$config_backup" ]] && log_detail "备份 config.toml: $config_backup"
  [[ -n "$auth_backup" ]] && log_detail "备份 auth.json: $auth_backup"
}

if [[ "$SKIP_CONFIG" -eq 1 ]]; then
  TOTAL_STEPS=4
fi

print_banner
print_step "检测本机环境"
resolve_node_requirement
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

ensure_compatible_node
install_codex_cli
prompt_api_key_if_needed
write_codex_config

printf '\n%s\n' "${COLOR_GREEN}${COLOR_BOLD}🎉 Codex 安装/升级与配置流程完成。${COLOR_RESET}"
log_detail "提示：如需首次认证，请运行 codex 并按官方提示登录或配置 API Key。"

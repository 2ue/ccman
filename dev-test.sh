#!/bin/bash

# CCM 开发测试脚本
# 设置开发环境变量，避免影响生产配置

echo "🔧 Setting up CCM development environment..."

# 设置开发环境变量
export CCM_CONFIG_DIR=".ccman-dev"
export CLAUDE_CONFIG_PATH="$HOME/.claude/settings-dev.json"

echo "   CCM Config Directory: $HOME/$CCM_CONFIG_DIR"
echo "   Claude Config Path: $CLAUDE_CONFIG_PATH"
echo

# 创建开发用的 Claude 配置文件（如果不存在）
if [ ! -f "$CLAUDE_CONFIG_PATH" ]; then
    echo "📝 Creating development Claude settings file..."
    mkdir -p "$(dirname "$CLAUDE_CONFIG_PATH")"
    cat > "$CLAUDE_CONFIG_PATH" << 'EOF'
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "",
    "ANTHROPIC_BASE_URL": "https://api.anthropic.com"
  },
  "permissions": {
    "allow": [],
    "deny": []
  },
  "apiKeyHelper": "echo ''"
}
EOF
    echo "   Created: $CLAUDE_CONFIG_PATH"
    echo
fi

# 执行 CCM 命令
echo "🚀 Running CCM command: $@"
echo
npm run dev -- "$@"
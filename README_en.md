# CCM - Claude Code Manager

<div align="center">

[![npm version](https://img.shields.io/npm/v/ccman.svg)](https://www.npmjs.com/package/ccman)
[![npm downloads](https://img.shields.io/npm/dm/ccman.svg)](https://www.npmjs.com/package/ccman)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/ccman.svg)](https://nodejs.org)

**Intelligent TypeScript CLI Tool for Managing Claude Code API Configurations**

🌍 Multilingual Support · 🔧 Direct Configuration Integration · 📁 Multi-Provider Management · ⚡ Zero-Config Experience

[中文文档](./README.md) | **English Documentation**

</div>

---

## ✨ Key Features

- **🌍 Intelligent Language Support** - Auto-detects system language with seamless Chinese/English switching
- **🔧 Direct Configuration Integration** - Modifies `~/.claude/settings.json` directly without shell integration
- **📁 Multi-Provider Management** - Quick switching between API providers (Official Anthropic, third-party, etc.)
- **🎯 Interactive Menu System** - User-friendly command-line interface with continuous operation support
- **⚡ Zero-Config Experience** - Works out of the box with intelligent defaults
- **🔒 Secure & Reliable** - Automatic backups, selective configuration updates, and user data protection

## 🚀 Quick Start

### Installation

```bash
npm install -g ccman
```

### First Run

```bash
ccman
```

On first run, you'll be guided through:
1. Choose interface language (Chinese/English/Auto-detect)
2. Create your first provider configuration
3. Automatically apply to Claude Code

## 📖 Command Reference

### Core Commands

```bash
ccman                              # Interactive main menu (recommended entry point)
ccman ls                           # List all providers and system status
ccman ls --current                 # Show current provider details
ccman ls --brief                   # Brief list mode
ccman add <id> <name> <url> [key]  # Add new provider
ccman use <id>                     # Switch to specified provider
ccman rm <id>                      # Remove provider
ccman clear                        # Clear all configurations (requires confirmation)
```

### Language Management

```bash
ccman lang                         # Show current language setting
ccman lang set zh                  # Set to Chinese
ccman lang set en                  # Set to English
ccman lang set auto                # Auto-detect system language
ccman lang reset                   # Reset to first-run state
```

## 💡 Usage Examples

### Adding and Switching Providers

```bash
# Add official Anthropic configuration
ccman add anthropic "Anthropic Official" https://api.anthropic.com sk-ant-xxx

# Add third-party provider
ccman add custom "My Custom API" https://api.custom.com

# Switch to custom provider
ccman use custom

# List all providers
ccman ls
```

### Interactive Menu Operations

```bash
$ ccman

? What would you like to do?
❯ Switch provider
  Add new provider
  Update provider
  Remove provider
  Show detailed status
  Exit

# Follow prompts after selecting an operation
# Choose to continue or exit after each operation
```

## 🔧 How It Works

CCM directly manages the `~/.claude/settings.json` file with these safety measures:

### 1. Selective Updates

Only modifies CCM-managed configuration items:
- `env.ANTHROPIC_AUTH_TOKEN`
- `env.ANTHROPIC_BASE_URL`
- `env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`
- `env.CLAUDE_CODE_MAX_OUTPUT_TOKENS`
- `permissions.allow` / `permissions.deny`

### 2. Configuration Protection

Preserves all other user configuration items:
- ✅ Preserves: `mcpServers`, `model`, `customUserConfig`, etc.
- 🔄 Updates: Only the CCM-managed configuration items listed above

### 3. Automatic Backups

Automatically backs up current configuration to `~/.ccman/backups/` before each switch

## 📂 Configuration Structure

```
~/.ccman/
├── config.json              # Main CCM configuration
├── providers/               # Provider configuration directory
│   ├── anthropic.json      # Official Anthropic
│   ├── custom.json         # Custom providers
│   └── ...
└── backups/                # Configuration backup directory (auto-created)
```

### Provider Configuration File Structure

```json
{
  "name": "Anthropic Official",
  "description": "Official Anthropic API Configuration",
  "config": {
    "env": {
      "ANTHROPIC_AUTH_TOKEN": "your-token",
      "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
      "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1,
      "CLAUDE_CODE_MAX_OUTPUT_TOKENS": 32000
    },
    "permissions": {
      "allow": [],
      "deny": []
    }
  },
  "metadata": {
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "usageCount": 5
  }
}
```

### Main CCM Configuration File Structure

```json
{
  "currentProvider": "anthropic",
  "claudeConfigPath": "/Users/user/.claude/settings.json",
  "providers": {
    "anthropic": {
      "name": "Anthropic Official",
      "configFile": "anthropic.json",
      "lastUsed": "2025-01-15T10:30:00.000Z"
    }
  },
  "settings": {
    "language": "zh",
    "firstRun": false
  },
  "metadata": {
    "version": "2.1.3",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

## 🌐 Language Support

### Supported Languages

- **Chinese (zh)** - Complete Chinese interface
- **English (en)** - Complete English interface
- **Auto-detect (auto)** - Automatically selects based on system `LANG` environment variable

### Language Detection Logic

- English environments (`en-*`) → Automatically uses English interface
- Other environments (including `zh-*`, unset, etc.) → Automatically uses Chinese interface
- Users can manually override language settings at any time

### First-Run Experience

```bash
$ ccman

🌍 Welcome to CCM! / 欢迎使用 CCM!

This is your first time running CCM.
这是您首次运行 CCM。

? Please choose your preferred language:
? 请选择您偏好的语言：
❯ 🇨🇳 中文 (Chinese)
  🇺🇸 English
  🌐 Auto-detect based on system

✓ Language set to English
✓ You can change this later with: ccman lang set <zh|en|auto>
```

## 🛠️ Development

### Environment Setup

```bash
# Clone repository
git clone https://github.com/2ue/ccman.git
cd ccman

# Install dependencies
pnpm install
```

### Development Commands

```bash
pnpm run dev                 # Development mode (using tsx)
pnpm run build               # TypeScript compilation
pnpm run start               # Run compiled CLI
pnpm run clean               # Clean dist/ directory
pnpm run lint                # ESLint code check
pnpm test                    # Run tests
```

### Development Environment Isolation

CCM supports development environment configuration isolation to avoid affecting production configurations:

```bash
# Set development environment configuration paths
export CCM_CONFIG_DIR=".ccman-dev"
export CLAUDE_CONFIG_PATH="$HOME/.claude/settings-dev.json"

# Run in isolated environment
pnpm run dev
```

### Project Structure

```
src/
├── types/                    # TypeScript type definitions
│   └── index.ts             # Core type interfaces
├── core/                     # Core modules
│   ├── CCMConfigManager.ts  # CCM configuration manager
│   └── ClaudeConfigManager.ts # Claude configuration manager
├── providers/                # Provider management
│   └── ProviderManager.ts   # Provider business logic
├── commands/                 # Command handling
│   └── lang.ts              # Language command processing
├── i18n/                     # Internationalization
│   ├── LanguageManager.ts   # Language manager
│   └── messages.ts          # Multi-language messages
├── utils/                    # Utility functions
│   ├── env-config.ts        # Environment configuration
│   └── version.ts           # Version information
├── config/                   # Configuration files
│   └── static-env.ts        # Static environment configuration
├── cli.ts                    # CLI entry point
└── index.ts                 # Module exports
```

## 📋 System Requirements

- **Node.js** >= 16.0.0
- **Claude Code** installed with settings.json support
- **Operating Systems**: Linux, macOS, Windows (WSL)
- **Package Managers**: npm, pnpm, yarn (pnpm recommended)

## 🔍 Troubleshooting

### Provider Configuration Not Applied

```bash
# 1. Check current provider information
ccman ls --current

# 2. Re-apply configuration
ccman use <provider-id>

# 3. Check Claude configuration file
cat ~/.claude/settings.json | grep ANTHROPIC

# 4. View complete configuration
cat ~/.claude/settings.json | jq .
```

### Language Switching Issues

```bash
# View current language setting
ccman lang

# Force set to Chinese
ccman lang set zh

# Force set to English
ccman lang set en

# Reset to first-run state (re-select language)
ccman lang reset
ccman
```

### Corrupted Configuration Files

```bash
# Delete all configurations (requires confirmation)
ccman clear

# Start fresh configuration
ccman
```

### Development Environment Issues

```bash
# Use isolated development environment
export CCM_CONFIG_DIR=".ccman-dev"
pnpm run dev

# Clean and rebuild
pnpm run clean
pnpm run build
```

## 📝 Changelog

### v2.1.3 (2025-09-24)
- ✨ Added `CLAUDE_CODE_MAX_OUTPUT_TOKENS` configuration support
- 🐛 Fixed TypeScript compilation errors, completely removed apiKeyHelper configuration
- 🎨 Optimized interactive menu experience
- 📦 Updated dependency package versions

### v2.1.2
- 🎨 Simplified provider configuration, removed manual ID setting
- ✨ Optimized first-run experience

### v2.0.0
- 🎉 New architecture: Direct configuration integration without shell integration
- 🌍 Intelligent multilingual support (Chinese/English/Auto-detect)
- 🎯 Interactive menu system
- 📁 Multi-provider management
- 🔒 Automatic backups and configuration protection

### v1.x
- Legacy architecture: Based on shell environment variable integration (deprecated)

## 🚀 Migration from v1.x

CCM v2.0 uses a completely different architecture and is incompatible with v1.x:

### v1.x (Deprecated)
- ❌ Modified shell configuration files (.bashrc, .zshrc, etc.)
- ❌ Used environment variables
- ❌ Complex shell integration and reloading

### v2.x (Current Version)
- ✅ Directly modifies `~/.claude/settings.json`
- ✅ Provider-based configuration management
- ✅ Intelligent language support
- ✅ Simplified, secure implementation

**Migration Steps**:

1. Uninstall v1.x version
2. Clean up related content from shell configuration files
3. Install v2.x version: `npm install -g ccman`
4. Run `ccman` to reconfigure

## 🤝 Contributing

We welcome all forms of contributions!

### How to Contribute

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Submit a Pull Request

### Reporting Issues

If you find bugs or have feature suggestions, please submit them in [GitHub Issues](https://github.com/2ue/ccman/issues).

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 👤 Author

**2ue**
- 📧 Email: jie746635835@163.com
- 🐙 GitHub: [@2ue](https://github.com/2ue)

## 🙏 Acknowledgments

Thanks to all developers who have contributed to this project!

Special thanks to these open source projects:
- [TypeScript](https://www.typescriptlang.org/)
- [Commander.js](https://github.com/tj/commander.js)
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js)
- [Chalk](https://github.com/chalk/chalk)

---

<div align="center">

**CCM v2.x - Intelligent, Multilingual, Seamless Claude Code Provider Management**

Made with ❤️ by [2ue](https://github.com/2ue)

[⬆ Back to Top](#ccm---claude-code-manager)

</div>
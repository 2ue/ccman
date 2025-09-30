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

### Selective Updates

Only modifies CCM-managed configuration items:
- `env.ANTHROPIC_AUTH_TOKEN`
- `env.ANTHROPIC_BASE_URL`
- `env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`
- `env.CLAUDE_CODE_MAX_OUTPUT_TOKENS`
- `permissions.allow` / `permissions.deny`

**Preserves all other user configuration items** (such as `mcpServers`, `model`, `customUserConfig`, etc.)

### Automatic Backups

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

## 🌐 Language Support

### Supported Languages

- **Chinese (zh)** - Complete Chinese interface
- **English (en)** - Complete English interface
- **Auto-detect (auto)** - Automatically selects based on system `LANG` environment variable

### Language Detection Logic

- English environments (`en-*`) → Automatically uses English interface
- Other environments (including `zh-*`, unset, etc.) → Automatically uses Chinese interface
- Users can manually override language settings at any time

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
```

### Language Switching Issues

```bash
# View current language setting
ccman lang

# Force set to Chinese
ccman lang set zh

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

## 📚 Development Documentation

- [开发指南 (中文)](./docs/DEVELOPMENT.md)
- [Development Guide (English)](./docs/DEVELOPMENT_en.md)
- [Release Guide](./docs/release-guide.md)
- [Scripts Guide](./docs/scripts-guide.md)

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
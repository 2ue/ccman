# CCM - Claude Code Manager v2.0

A TypeScript-based command-line tool to manage multiple Claude Code API provider configurations with **direct settings.json integration** and **intelligent language support**.

> **English Documentation** | [中文文档](./README_zh.md)

## ✨ New in v2.0

🌍 **Intelligent Language Support** - Auto-detects system language or guides first-run setup  
🔧 **Direct Claude Integration** - Modifies `~/.claude/settings.json` directly, no shell variables  
📁 **Provider Management** - Store and switch between multiple API provider configurations  
🎯 **Interactive Menu System** - Continuous operation support with navigation options  
⚡ **Zero-Config Experience** - Works out of the box with smart defaults  

## 🚀 Quick Start

### Installation

```bash
# Install from NPM
npm install -g ccman

# Or install dependencies for development
npm install && npm run build
```

### First Run Experience

```bash
# Start CCM (first time)
ccman

🌍 Welcome to CCM! / 欢迎使用 CCM!

This is your first time running CCM.
这是您首次运行 CCM。

? Please choose your preferred language:
? 请选择您偏好的语言：
❯ 🇨🇳 中文 (Chinese)  
  🇺🇸 English
  🌐 Auto-detect based on system

✓ Language set to Chinese
✓ You can change this later with: ccman lang set <zh|en|auto>
```

### Basic Usage

```bash
# Interactive main menu (recommended)
ccman

# List all providers
ccman ls

# Add provider directly  
ccman add <id> <name> <baseUrl> [apiKey]

# Switch provider
ccman use <id>

# Remove provider
ccman rm <id>
```

## 🌐 Language Management

### Language Commands
```bash
ccman lang                    # Show current language setting
ccman lang set zh             # Set to Chinese
ccman lang set en             # Set to English  
ccman lang set auto           # Auto-detect based on system
ccman lang reset              # Reset to first-run state
```

### Supported Languages
- **Chinese (zh)** - 完整中文界面
- **English (en)** - Full English interface
- **Auto-detect** - Based on system `LANG` environment variable

### Language Detection Logic
- English environments (`en-*`) → English interface
- Other environments (including `zh-*`, unset) → Chinese interface
- Manual override available anytime

## 📖 Commands Reference

### Core Provider Management
```bash
ccman                              # Interactive menu (default)
ccman add <id> <name> <url> [key]  # Add new provider
ccman use <id>                     # Switch to provider
ccman ls                           # List all providers
ccman ls --current                 # Show current provider details
ccman ls --brief                   # Brief provider list
ccman rm <id>                      # Remove provider
ccman clear                        # Remove ALL providers (destructive)
```

### Language Management
```bash
ccman lang                         # Show current language
ccman lang set <zh|en|auto>        # Set language preference
ccman lang reset                   # Reset to first-run state
```

## 🎯 Interactive Experience

### Main Menu Navigation
```bash
$ ccman

? What would you like to do?
❯ Switch provider
  Add new provider
  Update provider  
  Remove provider
  Show detailed status
  Exit

# After each operation:
? Would you like to perform another operation? (Y/n)
```

### Provider Addition Flow
```bash
$ ccman add

? Provider ID: my-provider
? Provider name: My Custom API
? Description: My custom Claude API
? Base URL: https://api.mycustom.com
? API Key: ****************

✓ Provider added successfully
? Set "My Custom API" as current provider? (Y/n)
✓ Provider switched successfully
Claude Code configuration has been updated successfully!
```

## 🔧 Architecture Overview

### Direct Claude Integration
CCM v2.0 directly modifies your Claude Code settings file:

**Before (CCM manages)**:
```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "old-token",
    "ANTHROPIC_BASE_URL": "https://old-api.com"
  }
}
```

**After (CCM updates)**:
```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "new-token", 
    "ANTHROPIC_BASE_URL": "https://new-api.com",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
  },
  "permissions": {
    "allow": [],
    "deny": []
  },
  "apiKeyHelper": "echo 'new-token'"
}
```

### Provider Storage Structure
Providers are stored in `~/.ccman/providers/`:

```
~/.ccman/
├── config.json          # Main CCM configuration
├── providers/            # Individual provider configs
│   ├── anthropic.json
│   ├── my-provider.json
│   └── staging.json
```

### Configuration Merging
CCM only updates Claude-specific keys, preserving your existing settings:
- ✅ Preserves: `mcpServers`, `model`, `customUserConfig`, etc.
- 🔄 Updates: `env.ANTHROPIC_*`, `permissions`, `apiKeyHelper`

## 📊 Provider Configuration

### Provider Structure
```json
{
  "name": "Anthropic Official",
  "description": "Official Anthropic API Configuration", 
  "config": {
    "env": {
      "ANTHROPIC_AUTH_TOKEN": "your-token",
      "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
      "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
    },
    "permissions": { "allow": [], "deny": [] },
    "apiKeyHelper": "echo 'your-token'"
  },
  "metadata": {
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z", 
    "usageCount": 5
  }
}
```

### Main Configuration
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
    "version": "2.0.0",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

## 💡 Usage Examples

### Complete First-Time Setup
```bash
# First run - language selection
ccman
# → Language selection wizard
# → No providers found, guided creation
# → Automatic Claude settings update

# Add additional providers
ccman add staging "Staging API" https://staging-api.com
ccman add dev "Development" https://dev-api.com

# Switch between providers
ccman use staging
ccman use dev
ccman use anthropic
```

### Multi-Provider Workflow
```bash
# List all providers with details
ccman ls
# * Anthropic Official (anthropic) - https://api.anthropic.com
#   Staging API (staging) - https://staging-api.com  
#   Development (dev) - https://dev-api.com

# Switch to staging for testing
ccman use staging
# ✓ Provider switched successfully
# ✓ Claude Code configuration has been updated successfully!

# Check current provider
ccman ls --current
# Current provider: Staging API (staging)
# Base URL: https://staging-api.com
# Usage count: 3 times
# Last updated: 2025-01-15 10:30:15
```

### Language Switching
```bash
# Check current language
ccman lang
# Current language: 中文 (Chinese)

# Switch to English
ccman lang set en
# ✓ Language switched successfully
# Current language: English

# Set auto-detect
ccman lang set auto
# ✓ Language switched successfully  
# Current language: Auto-detect
# Auto-detected: English
```

## 🛠️ Development Setup

### Development Environment
CCM supports isolated development environments:

```bash
# Set development paths
export CCM_CONFIG_DIR=".ccman-dev"
export CLAUDE_CONFIG_PATH="$HOME/.claude/settings-dev.json"

# Use development mode
npm run dev

# Build for production
npm run build

# Test built version
npm start
```

### Development Commands
```bash
npm run dev                 # Development mode with tsx
npm run build              # TypeScript compilation  
npm run start              # Run built CLI
npm run clean              # Remove dist/ directory
npm run lint               # ESLint TypeScript files
npm test                   # Run tests (passWithNoTests)
```

## 🔍 Troubleshooting

### Provider Issues
```bash
# Provider not working?
ccman ls --current         # Check current provider details
ccman use <provider-id>    # Re-apply provider configuration

# Settings not applied?
# Check ~/.claude/settings.json for updates
cat ~/.claude/settings.json | grep ANTHROPIC
```

### Language Issues  
```bash
# Language not switching?
ccman lang                 # Check current setting
ccman lang set zh          # Force Chinese
ccman lang set en          # Force English

# First-run issues?
ccman lang reset           # Reset to first-run state
ccman                      # Restart for language selection
```

### Configuration Issues
```bash  
# Corrupt configuration?
ccman clear                # Remove all (with confirmation)
ccman                      # Fresh start

# Development isolation
export CCM_CONFIG_DIR=".ccman-dev"  # Separate dev config
```

## 📋 Requirements

- **Node.js** >= 16.0.0
- **Claude Code** installed with settings.json support
- **Operating Systems**: Linux, macOS, Windows (WSL)

## 📄 License

MIT License - see LICENSE file for details.

---

## 🚀 Migration from v1.x

CCM v2.0 uses a completely different architecture:

### v1.x (Shell Integration)
- Modified shell configuration files
- Used environment variables
- Complex shell integration

### v2.0 (Direct Integration)  
- Modifies `~/.claude/settings.json` directly
- Provider-based configuration
- Language support
- Simplified, safer approach

**Migration**: v1.x and v2.x are incompatible. Start fresh with `ccman clear` if upgrading.

---

*CCM v2.0 - Intelligent, multilingual, and seamless Claude Code provider management.*
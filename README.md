# CCM - Claude Code Manager

A TypeScript-based command-line tool to manage Claude Code API configurations with **safe shell integration** through independent configuration files.

> **English Documentation** | [中文文档](./README_zh.md)

## ✨ Features

✅ **Environment Group Management** - Add, remove, switch between Claude Code environments  
✅ **Safe Shell Integration** - Uses independent `~/.ccman/.ccmanrc` file to avoid modifying user configs  
✅ **Interactive Source Control** - Choose manual or automatic source with risk warnings  
✅ **Type Safety** - Full TypeScript implementation with strict typing  
✅ **Interactive CLI** - User-friendly commands with colored output and inquirer prompts  
✅ **Multi-Shell Support** - Works with bash, zsh, and fish  
✅ **Complete Workflow** - From setup to usage in one seamless flow  

## 🚀 Quick Start

### Installation

```bash
# Install from NPM
npm install -g cc-manager

# Or install dependencies for development
npm install && npm run build
```

### Basic Usage

```bash
# Interactive setup (recommended)
ccman config

# Or add environment directly
ccman add default https://api.anthropic.com your-api-key

# List all environments
ccman ls

# Switch to an environment with source options
ccman use default

# Show current environment
ccman current
```

## 📖 Commands Reference

### Core Environment Management
```bash
ccman add <name> <baseUrl> [apiKey]     # Add environment (interactive API key if not provided)
ccman remove <name>                     # Remove environment group
ccman use <name>                        # Switch environment with source interaction
ccman list|ls                           # List all environments (* = current)
ccman current                           # Show current environment details
ccman clear|clearall                    # Clear ALL environments and shell integration (DESTRUCTIVE)
```

### Interactive Configuration
```bash
ccman config                            # Full interactive configuration wizard
                                     # - Add/switch/edit/remove environments
                                     # - No existing environments? Guided setup
                                     # - Complete menu-driven interface
```

### Advanced Operations
```bash
ccman status                            # Show detailed CCM statistics
ccman test [name]                       # Test environment configuration
ccman env                               # Generate shell export script
```

### Shell Integration Options
```bash
# Disable automatic shell writing
ccman add <name> <url> --no-auto-write  
ccman use <name> --no-auto-write        

# Force automatic source (risky)
ccman use <name> --auto-source          
```

## 🔧 Interactive Workflows

### 1. Adding Environment with Smart Use Flow

```bash
$ ccman add myenv https://api.example.com
? Enter API Key: ****************
✓ Added environment group "myenv"
  Base URL: https://api.example.com
  Created: 2025-08-06 11:45:30

? Set "myenv" as current environment? Yes
✓ Environment variables written to /home/user/.ccman/.ccmanrc

? How would you like to apply the environment variables?
❯ Manual - I will restart terminal or source manually (Recommended)
  Auto-source - Try to source automatically (May not work in all environments)

> Manual
To apply changes, restart your terminal or run:
source ~/.bashrc (or ~/.zshrc)
```

### 2. Interactive Configuration Menu

```bash
$ ccman config
? What would you like to do?
❯ Switch environment
  Add new environment  
  Edit environment
  Remove environment
  Show current status

> Add new environment
? Environment name: staging
? Base URL: https://staging-api.example.com
? API Key: ****************
✓ Added environment "staging"
```

### 3. Environment Switching with Source Control

```bash
$ ccman use production  
✓ Switched to environment "production"
  Base URL: https://api.anthropic.com
✓ Environment variables written to /home/user/.ccman/.ccmanrc

? How would you like to apply the environment variables?
  Manual - I will restart terminal or source manually (Recommended)
❯ Auto-source - Try to source automatically (May not work in all environments)

> Auto-source
⚠️  Attempting auto-source - this may not work in all terminal environments
✓ Shell configuration sourced successfully
```

## 🛡️ Safe Shell Integration Architecture

### How It Works

CCM uses a **two-tier architecture** for safe shell integration:

1. **Independent Configuration File**: `~/.ccman/.ccmanrc`
   ```bash
   # CCM (Claude Code Manager) Environment Variables - Auto Generated
   # Generated at: 2025-08-06 11:45:30
   # Environment: production
   export ANTHROPIC_BASE_URL="https://api.anthropic.com"
   export ANTHROPIC_AUTH_TOKEN="your-api-key"
   # End CCM Environment Variables
   ```

2. **Minimal Shell Reference**: One line added to `.bashrc`/`.zshrc`
   ```bash
   # CCM (Claude Code Manager) - Auto Generated Reference
   [ -f "/home/user/.ccman/.ccmanrc" ] && source "/home/user/.ccman/.ccmanrc"
   # End CCM Reference
   ```

### Benefits
- ✅ **Non-invasive**: Only adds one reference line to shell config
- ✅ **Safe**: User's existing shell config remains untouched
- ✅ **Clean**: Easy to remove completely
- ✅ **Isolated**: All CCM variables in separate file

### Environment Variables Managed
- `ANTHROPIC_BASE_URL` - API base URL
- `ANTHROPIC_AUTH_TOKEN` - API authentication token

## 📊 Configuration Structure

CCM stores configuration in `~/.ccman/config.json`:

```json
{
  "current": "production",
  "environments": {
    "production": {
      "name": "production",
      "baseUrl": "https://api.anthropic.com",
      "apiKey": "your-key",
      "createdAt": "2025-08-06T03:45:30.000Z",
      "lastUsed": "2025-08-06T03:50:15.000Z"
    },
    "staging": {
      "name": "staging", 
      "baseUrl": "https://staging-api.example.com",
      "apiKey": "staging-key",
      "createdAt": "2025-08-06T03:46:00.000Z"
    }
  },
  "settings": {
    "autoWriteShell": true,
    "preferredShell": "auto",
    "shellConfigPath": null
  }
}
```

## 💡 Usage Examples

### Complete Setup Workflow
```bash
# Start with interactive setup
ccman config
# → Guided through adding first environment
# → Automatically prompted to set as current
# → Choose source method (manual/auto)

# Add more environments
ccman add staging https://staging.example.com
ccman add dev https://dev.example.com

# Switch with full interaction
ccman use dev
# → Writes to ~/.ccman/.ccmanrc
# → Asks about sourcing method
# → Provides clear instructions

# Check status
ccman status
# CCM Status:
# Total environments: 3
# Current environment: dev
# Shell integration: Enabled
```

### Manual Environment Variable Setup
```bash
# If you prefer manual control
ccman use prod --no-auto-write
ccman env  # Shows export script
source <(ccman env)  # Apply manually
```

### Advanced Usage
```bash
# Test environment connectivity
ccman test production

# Force auto-source (with risk warning)
ccman use staging --auto-source

# Edit existing environment
ccman config  # → Edit environment → Select → Update values

# Complete reset (removes EVERYTHING - environments, shell config)
ccman clear   # Interactive confirmation required
```

## ⚙️ Development

```bash
# Development mode (with file watching)
npm run dev

# Build TypeScript
npm run build

# Clean build artifacts  
npm run clean

# Start built CLI
npm start
```

## 🎯 Command Line Options

### Global Options
All commands support standard CLI conventions:
- `-h, --help` - Show command help
- `-V, --version` - Show version

### Add Command Options
```bash
ccman add <name> <baseUrl> [apiKey] [options]

Options:
  --no-auto-write    Do not automatically write to shell config
```

### Use Command Options  
```bash
ccman use <name> [options]

Options:
  --no-auto-write    Do not automatically write to shell config
  --auto-source      Automatically source shell config (risky)
```

## 🔍 Troubleshooting

### Environment Variables Not Applied
```bash
# Check if .ccmanrc exists
ls -la ~/.ccman/.ccmanrc

# Check shell reference
grep "ccman" ~/.bashrc ~/.zshrc

# Manual application
source ~/.ccman/.ccmanrc

# Or regenerate
ccman use <current-env>
```

### Shell Integration Issues
```bash
# Check shell type detection
ccman status

# Force manual setup
ccman use <env> --no-auto-write
source <(ccman env)
```

## 📋 Requirements

- Node.js >= 16.0.0  
- TypeScript 5.0+
- Supported shells: bash, zsh, fish
- Operating systems: Linux, macOS, Windows (WSL)

## 📄 License

MIT License - see LICENSE file for details.

---

## 🚀 From Setup to Usage - Complete Flow

```bash
# 1. Interactive first-time setup
ccman config
  → No environments? Guided creation
  → Set as current? Yes
  → Source method? Manual/Auto

# 2. Add more environments  
ccman add dev https://dev.api.com
  → Interactive API key input
  → Set as current? Yes/No
  → Full source interaction if Yes

# 3. Switch anytime with full control
ccman use production
  → Safe .ccmanrc update
  → Source method choice
  → Clear instructions

# 4. Everything just works! ✨
```

*CCM - Making Claude Code API configuration management safe, interactive, and user-friendly.*
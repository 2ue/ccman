# CCM - Claude Code Manager

A TypeScript-based command-line tool to manage Claude Code API configurations with **safe shell integration** through independent configuration files.

> **English Documentation** | [中文文档](./README_zh.md)

## ✨ Features

✅ **Environment Group Management** - Add, remove, switch between Claude Code environments  
✅ **Safe Shell Integration** - Uses independent `~/.ccm/ccmrc` file to avoid modifying user configs  
✅ **Interactive Source Control** - Choose manual or automatic source with risk warnings  
✅ **Type Safety** - Full TypeScript implementation with strict typing  
✅ **Interactive CLI** - User-friendly commands with colored output and inquirer prompts  
✅ **Multi-Shell Support** - Works with bash, zsh, and fish  
✅ **Complete Workflow** - From setup to usage in one seamless flow  

## 🚀 Quick Start

### Installation

```bash
# Install from NPM
npm install -g claude-env

# Or install dependencies for development
npm install && npm run build
```

### Basic Usage

```bash
# Interactive setup (recommended)
ccm config

# Or add environment directly
ccm add default https://api.anthropic.com your-api-key

# List all environments
ccm ls

# Switch to an environment with source options
ccm use default

# Show current environment
ccm current
```

## 📖 Commands Reference

### Core Environment Management
```bash
ccm add <name> <baseUrl> [apiKey]     # Add environment (interactive API key if not provided)
ccm remove <name>                     # Remove environment group
ccm use <name>                        # Switch environment with source interaction
ccm list|ls                           # List all environments (* = current)
ccm current                           # Show current environment details
ccm clear|clearall                    # Clear ALL environments and shell integration (DESTRUCTIVE)
```

### Interactive Configuration
```bash
ccm config                            # Full interactive configuration wizard
                                     # - Add/switch/edit/remove environments
                                     # - No existing environments? Guided setup
                                     # - Complete menu-driven interface
```

### Advanced Operations
```bash
ccm status                            # Show detailed CCM statistics
ccm test [name]                       # Test environment configuration
ccm env                               # Generate shell export script
```

### Shell Integration Options
```bash
# Disable automatic shell writing
ccm add <name> <url> --no-auto-write  
ccm use <name> --no-auto-write        

# Force automatic source (risky)
ccm use <name> --auto-source          
```

## 🔧 Interactive Workflows

### 1. Adding Environment with Smart Use Flow

```bash
$ ccm add myenv https://api.example.com
? Enter API Key: ****************
✓ Added environment group "myenv"
  Base URL: https://api.example.com
  Created: 2025-08-06 11:45:30

? Set "myenv" as current environment? Yes
✓ Environment variables written to /home/user/.ccm/ccmrc

? How would you like to apply the environment variables?
❯ Manual - I will restart terminal or source manually (Recommended)
  Auto-source - Try to source automatically (May not work in all environments)

> Manual
To apply changes, restart your terminal or run:
source ~/.bashrc (or ~/.zshrc)
```

### 2. Interactive Configuration Menu

```bash
$ ccm config
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
$ ccm use production  
✓ Switched to environment "production"
  Base URL: https://api.anthropic.com
✓ Environment variables written to /home/user/.ccm/ccmrc

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

1. **Independent Configuration File**: `~/.ccm/ccmrc`
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
   [ -f "/home/user/.ccm/ccmrc" ] && source "/home/user/.ccm/ccmrc"
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

CCM stores configuration in `~/.ccm/config.json`:

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
ccm config
# → Guided through adding first environment
# → Automatically prompted to set as current
# → Choose source method (manual/auto)

# Add more environments
ccm add staging https://staging.example.com
ccm add dev https://dev.example.com

# Switch with full interaction
ccm use dev
# → Writes to ~/.ccm/ccmrc
# → Asks about sourcing method
# → Provides clear instructions

# Check status
ccm status
# CCM Status:
# Total environments: 3
# Current environment: dev
# Shell integration: Enabled
```

### Manual Environment Variable Setup
```bash
# If you prefer manual control
ccm use prod --no-auto-write
ccm env  # Shows export script
source <(ccm env)  # Apply manually
```

### Advanced Usage
```bash
# Test environment connectivity
ccm test production

# Force auto-source (with risk warning)
ccm use staging --auto-source

# Edit existing environment
ccm config  # → Edit environment → Select → Update values

# Complete reset (removes EVERYTHING - environments, shell config)
ccm clear   # Interactive confirmation required
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
ccm add <name> <baseUrl> [apiKey] [options]

Options:
  --no-auto-write    Do not automatically write to shell config
```

### Use Command Options  
```bash
ccm use <name> [options]

Options:
  --no-auto-write    Do not automatically write to shell config
  --auto-source      Automatically source shell config (risky)
```

## 🔍 Troubleshooting

### Environment Variables Not Applied
```bash
# Check if ccmrc exists
ls -la ~/.ccm/ccmrc

# Check shell reference
grep "ccm" ~/.bashrc ~/.zshrc

# Manual application
source ~/.ccm/ccmrc

# Or regenerate
ccm use <current-env>
```

### Shell Integration Issues
```bash
# Check shell type detection
ccm status

# Force manual setup
ccm use <env> --no-auto-write
source <(ccm env)
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
ccm config
  → No environments? Guided creation
  → Set as current? Yes
  → Source method? Manual/Auto

# 2. Add more environments  
ccm add dev https://dev.api.com
  → Interactive API key input
  → Set as current? Yes/No
  → Full source interaction if Yes

# 3. Switch anytime with full control
ccm use production
  → Safe ccmrc update
  → Source method choice
  → Clear instructions

# 4. Everything just works! ✨
```

*CCM - Making Claude Code API configuration management safe, interactive, and user-friendly.*
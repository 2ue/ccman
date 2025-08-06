# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CCM (Claude Code Manager) v2.0 is a TypeScript-based command-line tool for managing Claude Code API configurations. It provides structured, modular environment management with **safe shell integration** through independent configuration files.

## Architecture

### Core Modules
- **src/types/index.ts**: TypeScript type definitions for all interfaces
- **src/config/ConfigManager.ts**: Core configuration management with JSON storage
- **src/config/EnvironmentManager.ts**: High-level environment group operations
- **src/shell/ShellManager.ts**: Safe shell configuration file management using ccmrc approach
- **src/cli.ts**: Command-line interface with Commander.js and unified interaction logic

### Project Structure
```
src/
├── types/           # TypeScript type definitions
├── config/          # Configuration management modules  
├── shell/           # Shell integration modules
├── utils/           # Utility functions (future)
├── cli.ts           # CLI entry point with performUseEnvironment() shared function
└── index.ts         # Module exports
```

## Key Features Implemented

### 1. Safe Shell Integration Architecture
- **Independent ccmrc file**: `~/.ccm/ccmrc` contains all environment variables
- **Minimal shell reference**: Single line added to `.bashrc`/`.zshrc` to source ccmrc
- **Non-invasive approach**: User's shell config remains largely untouched
- **Easy cleanup**: Remove reference line and delete ccmrc file

### 2. Interactive Source Control
- After environment switching, user chooses source method:
  - **Manual**: User manually sources or restarts terminal (recommended)
  - **Auto-source**: Tool attempts automatic sourcing with risk warnings

### 3. Unified Use Logic
- `performUseEnvironment()` function provides consistent behavior across:
  - `add` command's "set as current" flow
  - Standalone `use` command
  - `config` command's switch environment option

### 4. Complete Interactive Workflows
- **config command**: Full menu-driven interface for all operations
- **add command**: Interactive API key input + use confirmation + source choice
- **Consistent interactions**: All use operations have identical user experience

## Current Environment Variables

The tool manages these Claude Code environment variables:
- `ANTHROPIC_BASE_URL`: API base URL
- `ANTHROPIC_AUTH_TOKEN`: API authentication token

*Note: Updated from previous CLAUDE_API_BASE_URL and ANTHROPIC_API_KEY*

## Common Commands

### Development
```bash
npm run build         # Compile TypeScript to dist/
npm run dev           # Run CLI in development mode with tsx
npm start             # Run compiled CLI
npm run clean         # Remove dist/ directory
npm run lint          # Run ESLint on TypeScript files (requires config)
```

### Basic Usage
```bash
ccm ls                # List all environment groups (* = current)
ccm add <name> <url>  # Add environment group with interactive flow
ccm use <name>        # Switch environment with source interaction
ccm remove <name>     # Delete environment group
ccm current           # Show current environment
ccm status            # Show CCM statistics
ccm config            # Interactive configuration menu
ccm clear             # Clear all environments and shell integration (DESTRUCTIVE)
```

### Advanced Features
```bash
ccm env               # Generate shell script for manual sourcing
ccm test [name]       # Test environment configuration
ccm add <name> <url> --no-auto-write    # Add without shell integration
ccm use <name> --no-auto-write          # Switch without shell integration
ccm use <name> --auto-source            # Force auto-source with risk warning
```

## Implementation Details

### 1. Environment Group Management
- Add/remove/switch between environment groups
- Each group contains: name, baseUrl, apiKey, timestamps
- Automatic validation of URLs and required fields
- Interactive API key input if not provided

### 2. Shell Integration Process
1. **Write ccmrc**: Environment variables written to `~/.ccm/ccmrc`
2. **Add reference**: Shell config updated to source ccmrc if not already present
3. **User choice**: Interactive prompt for sourcing method
4. **Auto-source**: Optional automatic sourcing with error handling

### 3. Type Safety Implementation
- Full TypeScript implementation with strict typing
- Interfaces for all data structures and operations:
  - `ClaudeEnv`: Environment configuration
  - `ShellEnvVars`: Environment variables with correct naming
  - `AddEnvOptions`: Add operation parameters
  - `ShellWriteResult`: Shell operation results
- Compile-time error checking

### 4. Interactive CLI Features
- Inquirer.js for consistent prompts
- Colored output with chalk
- Confirmation prompts for destructive operations
- Menu-driven configuration interface
- Progress feedback and error handling

## Configuration Storage

- Config directory: `~/.ccm/`
- Main config: `~/.ccm/config.json`
- Environment variables: `~/.ccm/ccmrc`
- Structure includes environments, current selection, and global settings

## Shell Integration Technical Details

### File Locations
- **Configuration**: `~/.ccm/ccmrc` - Contains current environment variables
- **Shell reference**: Added to `.bashrc`, `.zshrc`, or `config.fish`
- **Detection order**: zsh → bash → fish → fallback

### Shell Reference Format
```bash
# CCM (Claude Code Manager) - Auto Generated Reference
# This line sources CCM environment variables from /home/user/.ccm/ccmrc
[ -f "/home/user/.ccm/ccmrc" ] && source "/home/user/.ccm/ccmrc"
# End CCM Reference
```

### ccmrc File Format
```bash
# CCM (Claude Code Manager) Environment Variables - Auto Generated
# Generated at: 2025-08-06 11:45:30
# Environment: production
export ANTHROPIC_BASE_URL="https://api.anthropic.com"
export ANTHROPIC_AUTH_TOKEN="your-api-key"
# End CCM Environment Variables
```

## Build Process

1. TypeScript compilation targets ES2020 with CommonJS modules
2. Output goes to `dist/` directory with source maps
3. CLI entry point is `dist/cli.js` with proper shebang
4. Supports both development (`tsx`) and production (`node`) execution

## Code Organization

### CLI Structure (`src/cli.ts`)
- **performUseEnvironment()**: Shared function for consistent use behavior across commands
- **Command definitions**: Using Commander.js with proper option handling
- **Interactive prompts**: Inquirer.js integration for user input
- **Error handling**: Consistent error reporting and process exit codes

### Shell Manager (`src/shell/ShellManager.ts`)
- **ccmrc management**: Independent file creation and updates
- **Shell reference management**: Minimal invasive approach
- **Auto-source capability**: Subprocess execution with error handling
- **Multi-shell support**: bash, zsh, fish detection and handling

### Environment Manager (`src/config/EnvironmentManager.ts`)
- **High-level operations**: Add, remove, update, switch environments
- **Shell integration coordination**: Works with ShellManager for safe updates
- **Validation**: URL validation, environment name checking
- **Statistics**: Usage tracking and reporting

## Recent Major Changes

1. **Shell Architecture Redesign**: From direct modification to ccmrc + reference approach
2. **Environment Variable Renaming**: Updated to ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN
3. **Interactive Source Control**: Added user choice for manual vs automatic sourcing
4. **Unified Use Logic**: Single function for consistent behavior across all use scenarios
5. **Time Format Improvement**: Human-readable timestamps instead of ISO format
6. **Enhanced config Command**: Complete menu-driven interface for all operations
7. **Clear All Functionality**: Added clearAll command for complete CCM reset with confirmation

## Testing Approach

- Manual testing of CLI interactions
- Verification of file system operations
- Shell integration testing across different shells  
- Error condition handling validation
- User experience flow testing

## Important Notes for Development

- **Always test shell integration**: Verify ccmrc creation and shell reference addition
- **Test interactive flows**: Ensure prompts work correctly in different scenarios
- **Validate file operations**: Check permissions and error handling
- **Cross-shell compatibility**: Test with bash, zsh, and fish when possible
- **User experience focus**: Prioritize clear messaging and helpful guidance

## Future Enhancement Areas

- Configuration validation and migration
- Backup and restore functionality
- Environment templates or presets
- Integration with external credential stores
- Enhanced error reporting and diagnostics
- Network connectivity testing for environments
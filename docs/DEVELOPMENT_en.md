# CCM Development Guide

This document provides a detailed development guide for CCM (Claude Code Manager).

## Table of Contents

- [Project Architecture](#project-architecture)
- [Core Modules](#core-modules)
- [Development Environment Setup](#development-environment-setup)
- [Configuration Files](#configuration-files)
- [Development Workflow](#development-workflow)
- [Security Considerations](#security-considerations)
- [Testing](#testing)

## Project Architecture

### v2.x Architecture Design

CCM v2.x adopts a new architecture:
- **Direct Configuration Modification**: Directly modifies `~/.claude/settings.json` for configuration switching
- **Multi-Provider Support**: Stores multiple provider configurations in `~/.ccman/providers/`
- **Zero Shell Dependencies**: No need to modify shell configuration files, takes effect immediately
- **Safe Backups**: Automatically backs up current configuration before each switch

### Directory Structure

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
│   ├── static-env.ts        # Static environment configuration
│   └── default-providers.ts # Default provider configurations
├── cli.ts                    # CLI entry point
└── index.ts                 # Module exports
```

## Core Modules

### 1. CCMConfigManager

Manages the main CCM configuration file (`~/.ccman/config.json`)

**Main Features**:
- Read/write CCM configuration
- Manage provider list
- Handle first-run setup
- Language settings management

**Key Methods**:
```typescript
class CCMConfigManager {
  loadConfig(): CCMConfig              // Load configuration
  saveConfig(config: CCMConfig): void  // Save configuration
  getCurrentProvider(): string         // Get current provider
  setCurrentProvider(id: string): void // Set current provider
}
```

### 2. ClaudeConfigManager

Manages Claude Code configuration file (`~/.claude/settings.json`)

**Main Features**:
- Read/write Claude configuration
- Selective updates (only modifies CCM-managed keys)
- Configuration backups

**Key Methods**:
```typescript
class ClaudeConfigManager {
  loadConfig(): ClaudeSettings         // Load Claude configuration
  updateConfig(config: Partial<ClaudeSettings>): void  // Update configuration
  backupConfig(): void                 // Backup configuration
}
```

**CCM-Managed Configuration Keys**:
```typescript
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": string,
    "ANTHROPIC_BASE_URL": string,
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": number,
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": number
  },
  "permissions": {
    "allow": string[],
    "deny": string[]
  }
}
```

### 3. ProviderManager

Handles provider configuration business logic

**Main Features**:
- Add/remove/update providers
- Switch providers
- List providers
- Provider configuration validation

**Key Methods**:
```typescript
class ProviderManager {
  addProvider(config: ProviderConfig): void    // Add provider
  removeProvider(id: string): void             // Remove provider
  switchProvider(id: string): void             // Switch provider
  listProviders(): ProviderConfig[]            // List all providers
}
```

### 4. LanguageManager

Handles multi-language support

**Main Features**:
- Language detection
- Language switching
- Multi-language message management

**Key Methods**:
```typescript
class LanguageManager {
  getCurrentLanguage(): LanguageCode           // Get current language
  setLanguage(lang: LanguageCode): void        // Set language
  getMessage(key: string): string              // Get translated message
}
```

## Development Environment Setup

### Environment Preparation

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
pnpm run build:dev           # Development environment compilation
pnpm run start               # Run compiled CLI
pnpm run clean               # Clean dist/ directory
pnpm run lint                # ESLint code check
pnpm test                    # Run tests
```

### Development Environment Isolation

To avoid affecting production configurations, use an isolated development environment:

```bash
# Set development environment configuration paths
export CCM_CONFIG_DIR=".ccman-dev"
export CLAUDE_CONFIG_PATH="$HOME/.claude/settings-dev.json"

# Run in isolated environment
pnpm run dev
```

Or use environment variables in code:

```typescript
const configDir = process.env.CCM_CONFIG_DIR ||
  path.join(os.homedir(), '.ccman');
```

## Configuration Files

### Main CCM Configuration (~/.ccman/config.json)

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
    "version": "2.1.4",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### Provider Configuration (~/.ccman/providers/anthropic.json)

```json
{
  "name": "Anthropic Official",
  "description": "Official Anthropic API",
  "config": {
    "env": {
      "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
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
    "usageCount": 25
  }
}
```

## Development Workflow

### 1. Adding New Features

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Develop (using isolated environment)
export CCM_CONFIG_DIR=".ccman-dev"
pnpm run dev

# 3. Test
pnpm test

# 4. Code check
pnpm run lint

# 5. Commit changes
git add .
git commit -m "feat: add new feature"
```

### 2. Bug Fixes

```bash
# 1. Create fix branch
git checkout -b fix/bug-description

# 2. Fix and test
pnpm run dev

# 3. Commit changes
git commit -m "fix: bug description"
```

### 3. Release Process

See [Release Guide](./release-guide.md)

## Security Considerations

### 🚨 Important Development Restrictions

**NEVER modify these files (will cause system unavailability)**:
- `~/.ccman/config.json` - Existing historical configuration file
- `~/.claude/settings.json` - Claude Code configuration file

### Safe Development Practices

1. **Use Test Directory**: Use `~/.ccman-dev/` or other test directories during development
2. **Configuration Isolation**: Specify different configuration paths through environment variables
3. **Backup Verification**: Ensure backup mechanism works before modifications
4. **Step-by-Step Testing**: Test reading first, then test writing functionality

### Configuration Protection Mechanism

CCM implements selective configuration updates:

```typescript
// ✅ Correct: Only update CCM-managed keys
function updateClaudeConfig(newConfig: Partial<ClaudeSettings>) {
  const currentConfig = loadClaudeConfig();

  // Only update CCM-managed keys
  const updatedConfig = {
    ...currentConfig,
    env: {
      ...currentConfig.env,
      ANTHROPIC_AUTH_TOKEN: newConfig.env?.ANTHROPIC_AUTH_TOKEN,
      ANTHROPIC_BASE_URL: newConfig.env?.ANTHROPIC_BASE_URL,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: newConfig.env?.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC,
      CLAUDE_CODE_MAX_OUTPUT_TOKENS: newConfig.env?.CLAUDE_CODE_MAX_OUTPUT_TOKENS
    },
    permissions: newConfig.permissions
  };

  saveClaudeConfig(updatedConfig);
}

// ❌ Wrong: Complete configuration override
function updateClaudeConfig(newConfig: ClaudeSettings) {
  saveClaudeConfig(newConfig); // Will lose user's other configurations
}
```

## Testing

### Functional Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/core/CCMConfigManager.test.ts

# View test coverage
pnpm test --coverage
```

### Manual Testing Checklist

- [ ] First-run flow
- [ ] Add provider
- [ ] Switch provider
- [ ] Remove provider
- [ ] Language switching
- [ ] Configuration backup recovery
- [ ] Error handling
- [ ] Configuration file integrity

### Integration Testing

```bash
# 1. Build project
pnpm run build

# 2. Local installation test
pnpm run publish:local

# 3. Test CLI commands
ccman
ccman ls
ccman add test "Test Provider" https://api.test.com
ccman use test
```

## TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Dependency Management

### Production Dependencies

- **chalk**: Terminal colored output
- **commander**: CLI framework
- **inquirer**: Interactive command-line interface
- **fs-extra**: Enhanced file system operations

### Development Dependencies

- **typescript**: TypeScript compiler
- **tsx**: TypeScript executor
- **eslint**: Code linting
- **jest**: Testing framework
- **@types/***: TypeScript type definitions

## FAQ

### Q: How to debug CLI?

```bash
# Run directly with tsx
pnpm run dev

# Use Node.js debugger
node --inspect-brk dist/cli.js
```

### Q: How to add new provider presets?

Edit `src/config/default-providers.ts`:

```typescript
export const DEFAULT_PROVIDERS = {
  'new-provider': {
    name: 'New Provider',
    description: 'Description',
    config: {
      env: {
        ANTHROPIC_AUTH_TOKEN: '',
        ANTHROPIC_BASE_URL: 'https://api.new-provider.com',
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
        CLAUDE_CODE_MAX_OUTPUT_TOKENS: 32000
      },
      permissions: { allow: [], deny: [] }
    }
  }
};
```

### Q: How to add new language support?

1. Add translations in `src/i18n/messages.ts`:

```typescript
export const messages = {
  zh: { /* Chinese messages */ },
  en: { /* English messages */ },
  ja: { /* Japanese messages */ }  // New
};
```

2. Update `LanguageCode` type definition

## Contributing Guidelines

See the Contributing section in main [README.md](../README.md#contributing).

## Related Documentation

- [Release Guide](./release-guide.md)
- [Scripts Guide](./scripts-guide.md)
- [NPM Publish Guide](./npm-publish-guide.md)
- [Version Management](./version-management.md)

---

Last updated: 2025-09-30
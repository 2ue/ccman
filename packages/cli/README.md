# @ccman/cli

Command-line interface for managing Codex and Claude Code API service provider configurations.

## Installation

```bash
# Install globally
npm install -g @ccman/cli

# Or use pnpm
pnpm add -g @ccman/cli
```

## Quick Start

```bash
# 1. Initialize configuration
ccman init

# 2. Add a provider (interactive)
ccman add

# 3. List all providers
ccman list

# 4. Switch to a provider
ccman use "Provider Name"

# 5. Check current active provider
ccman current
```

## Commands

### `ccman init`

Initialize ccman configuration file (`~/.ccman/config.json`).

```bash
ccman init
```

### `ccman add`

Add a new service provider with interactive prompts. Supports both preset templates and custom configuration.

```bash
ccman add
```

**Interactive prompts:**
1. Choose preset template or custom configuration
2. If preset: Select from available presets (Anthropic Official, PackyCode)
3. If custom: Enter provider details manually
4. Enter API key (masked input)

### `ccman list` (alias: `ls`)

List all configured service providers. The currently active provider is marked with `●`.

```bash
ccman list
ccman ls  # alias
```

### `ccman use <name>`

Switch to a specific provider by name. This command updates both ccman config and the corresponding tool's configuration files.

```bash
ccman use "Anthropic Official"
```

**Updates:**
- For Codex providers: `~/.codex/config.toml` and `~/.codex/auth.json`
- For Claude providers: `~/.claude/settings.json`

### `ccman current`

Show the currently active provider.

```bash
ccman current
```

### `ccman remove <name>` (alias: `rm`)

Remove a provider by name. Requires confirmation before deletion.

```bash
ccman remove "Provider Name"
ccman rm "Provider Name"  # alias
```

### `ccman edit <name>`

Edit an existing provider with interactive prompts.

```bash
ccman edit "Provider Name"
```

**Editable fields:**
- Provider name
- Provider type (Codex/Claude Code)
- Base URL
- API Key (optional)

### `ccman clone <source> <new-name>`

Clone an existing provider with a new name. Useful for creating variants of existing configurations.

```bash
ccman clone "Anthropic Official" "Anthropic Dev"
```

## Configuration

All configuration is stored in `~/.ccman/config.json`:

```json
{
  "providers": [
    {
      "id": "claude-1234567890-abc123",
      "name": "Anthropic Official",
      "type": "claude",
      "baseUrl": "https://api.anthropic.com",
      "apiKey": "sk-ant-...",
      "createdAt": 1234567890,
      "lastUsedAt": 1234567900
    }
  ],
  "currentProvider": "claude-1234567890-abc123"
}
```

## Preset Templates

The CLI includes built-in preset templates:

- **Anthropic Official** (Claude Code) - Official Anthropic Claude API
- **PackyCode** (Codex) - PackyCode Codex API service

## Error Handling

The CLI provides friendly error messages with suggestions:

- **Configuration not found**: Run `ccman init` first
- **Provider not found**: Check available providers with `ccman list`
- **Invalid configuration**: Detailed validation errors with fix suggestions

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev <command>

# Example
pnpm dev list
pnpm dev add
```

## License

MIT

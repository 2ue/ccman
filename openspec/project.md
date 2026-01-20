# Project Context

## Purpose

ccman is an API service provider configuration management tool for AI coding assistants. It provides:
- **One-click switching** between API service providers for Codex, Claude Code, and Gemini CLI
- **MCP server management** for Claude Code and Gemini CLI
- **WebDAV sync** for configuration backup and synchronization
- **Dual interfaces**: CLI (command-line) and Desktop (Electron GUI)

**Core Problem**: Developers using multiple AI coding tools (Codex/Claude/Gemini) often need to switch between different API providers. Manual editing of configuration files is error-prone and time-consuming. ccman automates this with zero-destructive writes (preserves user's custom configs).

## Tech Stack

### Core Technologies
- **TypeScript 5.x** - Type-safe development across all packages
- **Node.js >= 18.0.0** - Runtime requirement
- **pnpm workspace** - Monorepo package management

### CLI Package (`ccman`)
- **commander** - CLI framework
- **inquirer** - Interactive prompts
- **chalk** - Terminal styling
- **tsup** - Build tool (bundles @ccman/core)
- **@iarna/toml** - Parse Codex TOML configs

### Desktop Package (`@ccman/desktop`)
- **Electron 28.x** - Cross-platform desktop app
- **React 18.x** - UI framework
- **Tailwind CSS** - Styling
- **lucide-react** - Icon library (unified)
- **Vite** - Build tool + dev server
- **electron-builder** - Packaging (dmg/exe/AppImage)

### Core Package (`@ccman/core`)
- **vitest** - Unit testing
- **webdav** - WebDAV sync implementation
- **proper-lockfile** - File locking for atomic writes

### Types Package (`@ccman/types`)
- Zero dependencies - browser-safe type definitions

## Project Conventions

### Code Style

**File Naming**
- Lowercase + kebab-case: `tool-manager.ts`, `claude-clean.ts`
- Prefer single words: `config.ts`, `paths.ts`

**Function Naming**
- Verb-led: `loadConfig()`, `saveProvider()`, `switchProvider()`
- Boolean functions: `isValidUrl()`, `fileExists()`

**Type Naming**
- PascalCase: `Provider`, `ToolType`, `MCPConfig`
- No `I` prefix for interfaces (TypeScript convention)

**Formatting**
- ESLint + Prettier enforced via husky + lint-staged
- 2-space indentation
- Single quotes for strings
- Trailing commas

**Complexity Rules** (currently disabled, enforced via code review)
- Functions: prefer < 50 lines (exceptions allowed for factory functions)
- Files: prefer < 300 lines (exceptions allowed for data-driven managers)
- Max nesting: 3 levels (Linus rule: "If > 3 levels, you're screwed")

### Architecture Patterns

**Monorepo Structure**
```
packages/
├── types/       # Shared types (zero dependencies, browser-safe)
├── core/        # Business logic (Node.js only)
├── cli/         # CLI interface (bundles core)
└── desktop/     # Electron GUI (uses core + types)
```

**Core Design Principles** (from CLAUDE.md)
1. **Simplicity First** - Direct hardcoding over abstraction (only 4 tools: codex/claude/gemini/mcp)
2. **Data Structures First** - Design data structures before code logic
3. **Never Break Userspace** - Zero-destructive writes (read-merge-write pattern)
4. **Pragmatism Over Perfection** - Solve current problems, not hypothetical futures
5. **No Premature Abstraction** - With only 4 tools, hardcoded functions are clearer than abstract layers

**Tool Manager Pattern**
- Factory function `createToolManager(tool: ToolType)` returns 13 methods
- Data-driven config: `TOOL_CONFIGS` maps tool types to writers/presets
- Zero if-else switching: all logic driven by config map

**Writers Pattern** (hardcoded, not abstracted)
```typescript
// Direct functions, no interfaces
writeCodexConfig(provider: Provider): void
writeClaudeConfig(provider: Provider): void
writeGeminiConfig(provider: Provider): void
writeMCPConfig(provider: Provider): void  // Special: syncs to multiple apps
```

**Configuration Storage**
- ccman configs: `~/.ccman/{codex,claude,gemini,mcp}.json`
- Tool configs: `~/.codex/config.toml`, `~/.claude/settings.json`, `~/.gemini/settings.json`
- Write strategy: temp file → atomic rename (filesystem-level atomicity)

**Desktop Architecture**
- Main process: Node.js APIs (file I/O, core logic)
- Renderer: React UI (no Node.js access)
- IPC bridge: Preload script (contextBridge)
- No abstraction layer between Electron and core (direct calls)

### Testing Strategy

**Coverage Target**: > 80%

**Test Environments**
- **Production**: `~/.ccman` (NEVER modified by tests)
- **Development**: `/var/folders/.../ccman-dev/.ccman` (via `NODE_ENV=development`)
- **Test**: `/tmp/ccman-test-{PID}/.ccman` (Vitest auto-isolation, per-process)

**What to Test**
- ✅ Core module public APIs
- ✅ Edge cases (missing files, parse errors, permission errors)
- ✅ Writers (config read-merge-write cycles)
- ❌ CLI interactive prompts (manual testing)
- ❌ Filesystem ops (integration testing)

**Test Tools**
- vitest for unit tests
- Manual testing for CLI/Desktop UX

**Safety Rules** (CRITICAL)
- ❌ NEVER delete/modify `~/.ccman` in tests
- ❌ NEVER delete/modify `~/.codex`, `~/.claude`, `~/.gemini` in tests
- ❌ NEVER use `rm -rf ~` in any script
- ✅ Always use test environment paths in unit tests
- ✅ Clear dev environment before manual testing: `rm -rf /var/folders/.../ccman-dev/.ccman`

### Git Workflow

**Commit Convention** (commitlint + conventional-changelog)
```
<type>(<scope>): <subject>

type: feat|fix|docs|style|refactor|test|chore
scope: core|cli|desktop|types (optional)
subject: imperative mood, lowercase, no period
```

**Examples**
```
feat(core): add gemini tool support
fix(cli): handle missing gemini.json in sync
docs: update README with gemini and mcp commands
chore: bump version to 3.2.0
```

**Branching**
- `main` - stable, tagged releases
- Feature branches: short-lived, merged via PR

**Version Management**
- Script: `npm run version <x.y.z>` (updates all package.json files)
- ❌ NEVER manually edit version in package.json
- Tag format: `v3.2.0` (must match package.json version)
- Release trigger: pushing git tag to GitHub

**Pre-commit Hooks** (husky + lint-staged)
- ESLint + Prettier on staged files
- TypeScript type check (tsc --noEmit)
- Per-package: separate type checks for core/cli/desktop

## Domain Context

### Supported Tools

**Main Tools** (API service provider management)
1. **Codex** - Codex AI assistant
   - Config: `~/.codex/config.toml` (TOML format)
   - Fields: `model_provider`, `model_providers[name]`
   - Presets: 2 (OpenAI Official, GMN)

2. **Claude Code** - Claude Code AI assistant
   - Config: `~/.claude/settings.json` (JSON)
   - Fields: `env.ANTHROPIC_AUTH_TOKEN`, `env.ANTHROPIC_BASE_URL`
   - Presets: 1 (Anthropic Official)

3. **Gemini CLI** - Gemini CLI AI assistant
   - Config: `~/.gemini/settings.json` (JSON) + `~/.gemini/.env`
   - Fields: JSON metadata in `provider.model` (merged into env)
   - Presets: 2 (Google Gemini, GMN)

**Special Tool** (MCP server management)
4. **MCP** - Model Context Protocol servers
   - Config: `~/.ccman/mcp.json` (ccman-managed)
   - Syncs to: `~/.claude/settings.json` and `~/.gemini/settings.json`
   - Multi-app support: one MCP server can be enabled for multiple tools
   - Presets: multiple (filesystem, github, postgres, etc.)

### Provider Data Model

```typescript
interface Provider {
  id: string           // Auto-generated: "{tool}-{timestamp}-{random}"
  name: string         // Display name
  desc?: string        // Optional description
  baseUrl: string      // API endpoint
  apiKey: string       // API key
  model?: string       // Model name (Codex) or JSON metadata (Gemini)
  createdAt: number    // Unix timestamp
  lastModified: number
  lastUsedAt?: number
}
```

**Special Cases**
- **Codex**: `model` field is model name string
- **Gemini**: `model` field is JSON string containing env vars
- **MCP**: mapped to `MCPServer` format (command/args/env/enabledApps)

### Configuration File Formats

**ccman Internal** (`~/.ccman/*.json`)
```typescript
interface ToolConfig {
  providers: Provider[]
  currentProviderId: string | null
  presets: PresetTemplate[]
}
```

**MCP Config** (`~/.ccman/mcp.json`)
```typescript
interface MCPConfig {
  servers: MCPServer[]
  managedServerNames: Record<AppType, string[]>
}
```

### CLI Commands

```
ccman                    # Interactive main menu
ccman cx                 # Codex interactive menu
ccman cc                 # Claude interactive menu
ccman gm                 # Gemini interactive menu
ccman mcp                # MCP commands (no interactive)

ccman cx add             # Add Codex provider
ccman cx list            # List Codex providers
ccman cx use <id>        # Switch to provider
ccman cx current         # Show current provider
ccman cx edit <id>       # Edit provider
ccman cx remove <id>     # Remove provider
ccman cx clone <id>      # Clone provider

# Same subcommands for cc, gm
# mcp: add|list|edit|remove (no use/current/clone)

ccman sync               # Sync interactive menu
ccman sync status        # Show sync status
ccman sync upload        # Upload to WebDAV
ccman sync download      # Download from WebDAV
ccman sync merge         # Smart merge

ccman export [dir]       # Export configs
ccman import [dir]       # Import configs
```

## Important Constraints

### Technical Constraints

**Node.js Version**
- Minimum: 18.0.0 (for native ESM + LTS)
- Package manager: pnpm >= 7.0.0

**File Permissions**
- Config directory: `0700` (owner-only)
- Config files: `0600` (owner read/write)

**Atomic Writes**
- Always: temp file → `fs.renameSync()` (atomic)
- Backup: `.bak` file before write
- Rollback: restore from backup on error

**Zero-Destructive Principle**
- ONLY modify managed fields
- Preserve ALL user-custom configs
- Example (Claude):
  ```typescript
  // ✅ Modify these
  settings.env.ANTHROPIC_AUTH_TOKEN = provider.apiKey
  settings.env.ANTHROPIC_BASE_URL = provider.baseUrl

  // ✅ Keep these untouched
  settings.permissions
  settings.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS
  // ... all other user configs
  ```

### Forbidden Practices

**Forbidden Dependencies** (from CLAUDE.md)
- ❌ fs-extra (use native `fs`)
- ❌ dotenv (use direct config parsing)
- ❌ lodash (use native JS)
- ❌ axios (no HTTP requests needed)
- ❌ moment/date-fns (use `Date.now()`)
- ❌ Other icon libraries (use `lucide-react` only)

**Forbidden Patterns**
- ❌ Abstract writer layer (interface ConfigWriter)
- ❌ Electron abstraction layer (interface PlatformAdapter)
- ❌ Async I/O for config files (use sync: files < 50KB, < 1ms)
- ❌ State management libraries for Desktop (use React useState)

**Forbidden Commands** (unless user explicitly requests)
- ❌ Manual version bumps in package.json (use `npm run version`)
- ❌ Incomplete features in menus (remove or mark "WIP")

### Development Constraints

**Code Limits** (guidelines, not hard rules)
- Function: < 50 lines (exception: factory functions returning many methods)
- File: < 300 lines (exception: data-driven managers)
- Nesting: < 3 levels (Linus rule)

**Comment Policy**
- Only for complex logic ("why", not "what")
- No JSDoc unless publishing to npm
- TypeScript types are the best documentation

**Error Handling**
- Core: throw structured errors (`ProviderNotFoundError`, etc.)
- CLI: catch + friendly messages + exit(1)
- Writers: backup → write → rollback on error

## External Dependencies

### User-Managed Tools
- **Codex** - Installed by user, config at `~/.codex/`
- **Claude Code** - Installed by user, config at `~/.claude/`
- **Gemini CLI** - Installed by user, config at `~/.gemini/`

### WebDAV Services (optional)
- iCloud Drive WebDAV
- Dropbox
- 坚果云 (Nutstore)
- Any WebDAV-compatible server

**Sync Security**
- API keys encrypted with user password before upload
- Encryption: AES-256 (implementation in `@ccman/core/sync`)

### GitHub Services
- **Releases**: Desktop app distribution (auto-publish via GitHub Actions)
- **npm Registry**: CLI package distribution

### Build/CI Services
- **GitHub Actions**: Auto-build and publish on git tag push
- **npm**: CLI package hosting (`ccman`)
- **GitHub Releases**: Desktop app binaries (dmg/exe/AppImage)

## Project Evolution Notes

### Current State (v3.2.0)
- ✅ Supports 4 tools: Codex, Claude, Gemini, MCP
- ✅ CLI and Desktop fully functional
- ✅ WebDAV sync implemented
- ✅ MCP multi-app support (Claude/Gemini)
- ⚠️ Documentation outdated (still mentions "Codex and Claude only")
- ⚠️ README install command still says `@ccman/cli` (should be `ccman`)

### Known Issues
- MCP sync auto-targets Claude only (Desktop UI needed for Gemini)
- CLI sync fails if `gemini.json` doesn't exist
- Preset count mismatch in docs (says "7 presets" but varies by tool)

### Planned Improvements
- Fix documentation to match actual capabilities
- Add CLI support for MCP multi-app toggle
- Improve sync robustness (handle missing config files gracefully)
